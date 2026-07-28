"""
Chat service — handles conversational resume refinement.

On each user message:
  1. Generate scoped edit via Gemini
  2. Run anti-hallucination verification
  3. Compile new .tex → PDF
  4. Store new version (skipping 5-stage re-scoring by default to save costs)
  5. Return updated version to caller

On Demand Re-Analysis:
  - User can trigger `reanalyze_session_version` at any time to run the 5-stage scoring pipeline on the latest .tex version.
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass

from app.gemini_client import get_gemini_client
from app.latex_pipeline import compile_to_pdf, extract_plaintext
from app.prompts import (
    SCOPED_EDIT_PROMPT_TEMPLATE,
    SCOPED_EDIT_SYSTEM,
    wrap_jd,
    wrap_resume_latex,
)
from app.schemas import ScoringResult, VerificationResult
from app.scoring_pipeline import run_scoring_pipeline
from app.verification_pipeline import verify_edit
from app.version_store import (
    get_latest_version,
    get_messages,
    save_message,
    save_version,
    update_version_scores,
)

logger = logging.getLogger(__name__)


@dataclass
class ChatEditResult:
    """Full result of a chat edit operation."""
    edited_tex: str
    plaintext: str
    pdf_bytes: bytes | None
    compile_error: str | None
    scoring_result: ScoringResult | None
    verification: VerificationResult
    version_num: int
    change_summary: str


async def process_chat_message(
    session_id: str,
    jd_text: str,
    user_message: str,
    auto_rescore: bool = False,
) -> ChatEditResult:
    """
    Process a user's editing instruction:
      1. Get current resume state
      2. Generate scoped edit (1 LLM call)
      3. Verify & Compile to PDF
      4. Optionally re-score (if auto_rescore=True)
      5. Save new version
    """
    latest = await get_latest_version(session_id)
    if not latest:
        raise ValueError(f"No versions found for session {session_id}")

    current_tex = latest["tex_content"]
    current_version = latest["version_num"]

    messages = await get_messages(session_id)
    history_text = "\n".join(
        f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
        for m in messages
    )
    if not history_text:
        history_text = "(No previous conversation)"

    await save_message(session_id, "user", user_message)

    # Step 1: Generate scoped edit
    client = get_gemini_client()
    edit_prompt = SCOPED_EDIT_PROMPT_TEMPLATE.format(
        resume=wrap_resume_latex(current_tex),
        jd=wrap_jd(jd_text),
        history=history_text,
        instruction=user_message,
    )

    edited_tex = client.generate_text(
        prompt=edit_prompt,
        system=SCOPED_EDIT_SYSTEM,
    )

    edited_tex = _clean_tex_output(edited_tex)
    plaintext = await extract_plaintext(edited_tex)

    # Step 2: Verification and compilation (parallel)
    verify_task = verify_edit(
        original_tex=current_tex,
        edited_tex=edited_tex,
        user_instructions=user_message,
    )
    compile_task = compile_to_pdf(edited_tex)

    if auto_rescore:
        score_task = run_scoring_pipeline(edited_tex, jd_text, plaintext)
        verification, compile_result, scoring_result = await asyncio.gather(
            verify_task, compile_task, score_task
        )
    else:
        verification, compile_result = await asyncio.gather(
            verify_task, compile_task
        )
        scoring_result = None

    # Handle compile failure — retry once if needed
    pdf_bytes = None
    compile_error = None
    if compile_result.success:
        pdf_bytes = compile_result.pdf_bytes
    else:
        logger.warning("LaTeX compile failed, retrying: %s", compile_result.error[:200])
        compile_error = compile_result.error

        fix_prompt = (
            f"The following LaTeX document failed to compile with this error:\n"
            f"```\n{compile_result.error[:1000]}\n```\n\n"
            f"Fix the LaTeX errors and return the COMPLETE, COMPILABLE .tex document.\n\n"
            f"{wrap_resume_latex(edited_tex)}"
        )
        fixed_tex = client.generate_text(prompt=fix_prompt, system=SCOPED_EDIT_SYSTEM)
        fixed_tex = _clean_tex_output(fixed_tex)

        retry_result = await compile_to_pdf(fixed_tex)
        if retry_result.success:
            edited_tex = fixed_tex
            pdf_bytes = retry_result.pdf_bytes
            plaintext = await extract_plaintext(edited_tex)
            compile_error = None

    new_version = current_version + 1
    change_summary = f"Edit: {user_message[:100]}"

    scores_json = scoring_result.model_dump_json() if scoring_result else None
    await save_version(
        session_id=session_id,
        version_num=new_version,
        tex_content=edited_tex,
        plaintext=plaintext,
        pdf_bytes=pdf_bytes,
        scores_json=scores_json,
        change_summary=change_summary,
    )

    response_summary = f"Applied edit: {user_message[:80]}"
    if scoring_result:
        response_summary += f" | ATS: {scoring_result.ats_score.total_score}, AI: {scoring_result.ai_screening_score.total_score}"
    else:
        response_summary += " | PDF updated. Click 'Re-Analyze Resume 🔄' to update your scores."

    await save_message(session_id, "assistant", response_summary)

    return ChatEditResult(
        edited_tex=edited_tex,
        plaintext=plaintext,
        pdf_bytes=pdf_bytes,
        compile_error=compile_error,
        scoring_result=scoring_result,
        verification=verification,
        version_num=new_version,
        change_summary=change_summary,
    )


async def reanalyze_session_version(
    session_id: str,
    jd_text: str,
) -> ScoringResult:
    """
    On-Demand Re-Analysis: Runs the full 5-stage scoring pipeline on the latest version.
    """
    latest = await get_latest_version(session_id)
    if not latest:
        raise ValueError(f"No versions found for session {session_id}")

    tex_content = latest["tex_content"]
    plaintext = latest["plaintext_content"] or await extract_plaintext(tex_content)

    scoring_result = await run_scoring_pipeline(tex_content, jd_text, plaintext)

    # Update version in DB with new scores
    scores_json = scoring_result.model_dump_json()
    await update_version_scores(session_id, latest["version_num"], scores_json)

    return scoring_result


def _clean_tex_output(text: str) -> str:
    """Strip markdown fences and surrounding commentary from model output."""
    text = text.strip()

    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    doc_idx = text.find("\\documentclass")
    if doc_idx > 0:
        text = text[doc_idx:]

    return text.strip()

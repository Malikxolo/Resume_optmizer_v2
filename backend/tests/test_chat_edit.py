"""
Terminal Test Runner — Dual Mode Summary Edit Test (ATS Portal Mode vs HR Direct Mode).

1. Reads `resume_test.tex` and `test_jd.txt`.
2. Test 1: Executes Scoped Edit in ATS Portal Mode ("Target Title Alignment").
3. Test 2: Executes Scoped Edit in HR Direct Mode ("Natural Skill-First Headline").
4. Compares generated summaries and scores for both modes.
"""

import sys
import os
import io
import asyncio
import time

# Windows console encoding fix
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.gemini_client import get_gemini_client
from app.latex_pipeline import extract_plaintext
from app.prompts import (
    SCOPED_EDIT_PROMPT_TEMPLATE,
    SCOPED_EDIT_SYSTEM,
    wrap_jd,
    wrap_resume_latex,
)
from app.scoring_pipeline import run_scoring_pipeline


async def test_mode(mode_name: str, instruction: str, original_tex: str, jd_text: str, client):
    print(f"\n" + "─" * 75)
    print(f"  RUNNING TEST MODE: {mode_name}")
    print(f"  Instruction: \"{instruction}\"")
    print("─" * 75)

    edit_prompt = SCOPED_EDIT_PROMPT_TEMPLATE.format(
        resume=wrap_resume_latex(original_tex),
        jd=wrap_jd(jd_text),
        history="(No previous conversation)",
        instruction=instruction,
    )

    t0 = time.time()
    edited_tex = client.generate_text(
        prompt=edit_prompt,
        system=SCOPED_EDIT_SYSTEM,
    )
    print(f"  ✅ Edit generated in {time.time() - t0:.2f}s")

    # Clean tex output
    if edited_tex.startswith("```"):
        lines = edited_tex.split("\n")[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        edited_tex = "\n".join(lines).strip()
    doc_idx = edited_tex.find("\\documentclass")
    if doc_idx > 0:
        edited_tex = edited_tex[doc_idx:]

    # Extract summary text from edited_tex
    summary_idx = edited_tex.find("\\section{Summary}")
    summary_text = ""
    if summary_idx != -1:
        end_summary = edited_tex.find("\\section", summary_idx + 15)
        if end_summary == -1:
            end_summary = summary_idx + 400
        summary_text = edited_tex[summary_idx:end_summary]

    # Re-score
    plaintext = await extract_plaintext(edited_tex)
    scoring_res = await run_scoring_pipeline(edited_tex, jd_text, plaintext)

    print(f"  📊 ATS Score: {scoring_res.ats_score.total_score} | 🤖 AI Score: {scoring_res.ai_screening_score.total_score}")
    print(f"  📝 Generated Summary Snippet:\n    {summary_text[:250].strip()}...\n")

    return scoring_res, summary_text, edited_tex


async def main():
    print("\n" + "═" * 75)
    print("   RESUME OPTIMIZER v2 — DUAL MODE SUMMARY FIX TERMINAL TEST")
    print("═" * 75)

    workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    original_tex_path = os.path.join(workspace_root, "resume_test.tex")
    jd_path = os.path.join(workspace_root, "test_jd.txt")

    with open(original_tex_path, encoding="utf-8") as f:
        original_tex = f.read()

    with open(jd_path, encoding="utf-8") as f:
        jd_text = f.read()

    client = get_gemini_client()

    # Test 1: ATS Portal Mode
    ats_instr = "Rewrite Summary in ATS Portal Mode (target job title alignment for online applications): Fix missing % signs and add SQL to Technical Skills."
    ats_res, ats_summary, ats_tex = await test_mode("🎯 ATS PORTAL MODE", ats_instr, original_tex, jd_text, client)

    # Test 2: HR Direct Mode
    hr_instr = "Rewrite Summary in HR Direct Mode (natural skill-first headline for direct recruiter reachout): Fix missing % signs and add SQL to Technical Skills."
    hr_res, hr_summary, hr_tex = await test_mode("🤝 HR DIRECT MODE", hr_instr, original_tex, jd_text, client)

    print("\n" + "═" * 75)
    print("   SUMMARY MODES COMPARISON TABLE")
    print("═" * 75)
    print(f"  Mode                 ATS Score   AI Score   Summary Opening Style")
    print(f"  ──────────────────────────────────────────────────────────────────────────")
    print(f"  🎯 ATS Portal Mode    {ats_res.ats_score.total_score:>5}/100    {ats_res.ai_screening_score.total_score:>5}/100   Target Title Aligned (e.g. AI/ML Associate)")
    print(f"  🤝 HR Direct Mode     {hr_res.ats_score.total_score:>5}/100    {hr_res.ai_screening_score.total_score:>5}/100   Skill-First Natural (e.g. Python & AI Developer)")
    print("═" * 75 + "\n")


if __name__ == "__main__":
    asyncio.run(main())

"""
Anti-hallucination verification pipeline.

This is a DISTINCT pipeline step — not a prompt instruction.
After the model proposes edits, this second call checks every fact
in the draft against the original resume and user instructions.
Anything not traceable gets flagged as "unverified — please confirm."
"""

from __future__ import annotations

import asyncio
import logging

from app.gemini_client import get_gemini_client
from app.prompts import VERIFICATION_PROMPT_TEMPLATE, VERIFICATION_SYSTEM
from app.schemas import VerificationResult

logger = logging.getLogger(__name__)


def _run_verification(
    original_tex: str,
    edited_tex: str,
    user_instructions: str,
) -> VerificationResult:
    """
    Synchronous verification call — compares edited resume against
    original + user instructions and flags any fabricated facts.
    """
    client = get_gemini_client()

    prompt = VERIFICATION_PROMPT_TEMPLATE.format(
        original_tex=original_tex,
        user_instructions=user_instructions,
        edited_tex=edited_tex,
    )

    return client.generate_structured(
        prompt=prompt,
        system=VERIFICATION_SYSTEM,
        schema=VerificationResult,
    )


async def verify_edit(
    original_tex: str,
    edited_tex: str,
    user_instructions: str,
) -> VerificationResult:
    """
    Async wrapper — runs the verification in a thread.
    Returns VerificationResult with any hallucination flags.
    """
    result = await asyncio.to_thread(
        _run_verification, original_tex, edited_tex, user_instructions
    )

    if result.flags:
        logger.warning(
            "Verification flagged %d potential hallucinations",
            len(result.flags),
        )
        for flag in result.flags:
            logger.warning("  → %s: %s", flag.flagged_text[:50], flag.reason)
    else:
        logger.info("Verification passed — no hallucinations detected")

    return result

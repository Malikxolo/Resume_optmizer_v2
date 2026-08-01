import asyncio
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.verification_pipeline import verify_edit

async def test_experience_verification():
    root = Path(__file__).resolve().parent.parent
    original_tex = (root / "resume_fixed_test.tex").read_text(encoding="utf-8")

    # Test Case 1: Edited resume with FALSE experience duration claim (2+ years)
    fake_edited_tex = original_tex.replace(
        "AI/ML Computational Science Associate candidate and Python Developer",
        "Software Engineer with 2+ years of experience and Python Developer"
    )

    print("--- Testing Verification on Fake Experience Duration Claim ---")
    result_fake = await verify_edit(
        original_tex=original_tex,
        edited_tex=fake_edited_tex,
        user_instructions="Fix all flagged issues and optimize summary.",
    )

    print(f"Is Clean: {result_fake.is_clean}")
    print(f"Flags Count: {len(result_fake.flags)}")
    for f in result_fake.flags:
        print(f"  [FLAG] Text: '{f.flagged_text}' | Reason: {f.reason}")

    # Test Case 2: Clean edited resume without false duration claim
    clean_edited_tex = original_tex.replace(
        "AI/ML Computational Science Associate candidate and Python Developer",
        "Python & AI Developer specializing in scalable backend systems"
    )

    print("\n--- Testing Verification on Clean Resume Edit ---")
    result_clean = await verify_edit(
        original_tex=original_tex,
        edited_tex=clean_edited_tex,
        user_instructions="Fix all flagged issues and optimize summary.",
    )

    print(f"Is Clean: {result_clean.is_clean}")
    print(f"Flags Count: {len(result_clean.flags)}")

if __name__ == "__main__":
    asyncio.run(test_experience_verification())

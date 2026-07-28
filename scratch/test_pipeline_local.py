import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.latex_pipeline import extract_plaintext
from app.scoring_pipeline import run_scoring_pipeline

async def test_full_pipeline():
    root = Path(__file__).resolve().parent.parent
    tex_path = root / "resume_fixed_test.tex"
    jd_path = root / "test_jd.txt"

    print("Reading files...")
    tex_content = tex_path.read_text(encoding="utf-8")
    jd_text = jd_path.read_text(encoding="utf-8")

    print("Extracting plaintext...")
    plaintext = await extract_plaintext(tex_content)

    print("Running 5-Stage Interconnected Scoring Pipeline with Gemini 3.6 Flash...")
    t0 = time.time()
    result = await run_scoring_pipeline(tex_content, jd_text, plaintext)
    dt = time.time() - t0

    print(f"\nPIPELINE COMPLETED IN {dt:.2f}s!")
    print(f"ATS Score: {result.ats_score.total_score}%")
    print(f"AI Screen Score: {result.ai_screening_score.total_score}%")
    print(f"Issues Found: {len(result.issues)}")
    print(f"Missing Content Items: {len(result.missing_content)}")

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())

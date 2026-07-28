"""
Terminal Test Runner — 5-Stage Sequential Chained Scoring Pipeline.

Loads `resume_test.tex` and `test_jd.txt` from workspace root,
executes the full 5-stage pipeline, and prints the complete audit breakdown,
scores, missing content, and issues directly to the console.
"""

import sys
import os
import io
import asyncio
import json
import time

# Windows console encoding fix
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Ensure app package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.scoring_pipeline import run_scoring_pipeline


async def main():
    print("\n" + "═" * 70)
    print("   RESUME OPTIMIZER v2 — 5-STAGE PIPELINE TERMINAL TEST")
    print("═" * 70)

    workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    tex_path = os.path.join(workspace_root, "resume_test.tex")
    jd_path = os.path.join(workspace_root, "test_jd.txt")

    print(f"\n[1] Reading input files:")
    print(f"    • Resume: {tex_path}")
    print(f"    • JD:     {jd_path}")

    if not os.path.exists(tex_path) or not os.path.exists(jd_path):
        print("❌ Error: missing resume_test.tex or test_jd.txt in workspace root!")
        return

    with open(tex_path, encoding="utf-8") as f:
        tex_content = f.read()

    with open(jd_path, encoding="utf-8") as f:
        jd_text = f.read()

    print(f"    ✅ Resume loaded ({len(tex_content)} chars)")
    print(f"    ✅ JD loaded ({len(jd_text)} chars)")

    print(f"\n[2] Executing 5-Stage Chained Pipeline with Gemini 3.6 Flash (Thinking=HIGH)...")
    start_time = time.time()

    result = await run_scoring_pipeline(tex_content, jd_text)

    elapsed = time.time() - start_time
    print(f"    ✅ Pipeline execution finished in {elapsed:.2f} seconds!")

    # ── Display Gap Audit Matrix (Stage 2) ───────────────────────────
    print("\n" + "─" * 70)
    print("  STAGE 2: DETERMINISTIC GAP & KEYWORD AUDIT MATRIX")
    print("─" * 70)

    if result.gap_audit:
        ga = result.gap_audit
        print(f"  • Total Requirements Audited: {ga.total_requirements}")
        print(f"  • Exact Matches:             {ga.exact_matches_count}")
        print(f"  • Semantic Matches:          {ga.semantic_matches_count}")
        print(f"  • Missing Items:             {ga.missing_count}")
        print(f"  • Overall Match Percentage:  {ga.match_percentage}%")
        print("\n  Detailed Item Breakdown:")

        for item in ga.audited_items:
            status_tag = f"[{item.status}]"
            if item.status == "EXACT_MATCH":
                status_str = f"✅ {status_tag:<16}"
            elif item.status == "SEMANTIC_MATCH":
                status_str = f"⚡ {status_tag:<16}"
            else:
                status_str = f"❌ {status_tag:<16}"

            print(f"    {status_str} {item.requirement_name:<30} | {item.notes}")
    else:
        print("  (No gap audit data returned)")

    # ── Display Scores (Stage 3 & 4) ──────────────────────────────────
    print("\n" + "─" * 70)
    print("  STAGE 3 & 4: GROUNDED EVALUATION SCORES")
    print("─" * 70)

    print(f"\n  📊 ATS PARSEABILITY & RELEVANCY SCORE: {result.ats_score.total_score} / 100")
    print("  Sub-criteria Breakdown:")
    for sub in result.ats_score.sub_scores:
        print(f"    • {sub.criterion:<30} Score: {sub.score:>3}/100 (weight {sub.weight:.2f}) -- {sub.justification}")

    print(f"\n  🤖 AI RECRUITER SCREENING SCORE: {result.ai_screening_score.total_score} / 100")
    print("  Sub-criteria Breakdown:")
    for sub in result.ai_screening_score.sub_scores:
        print(f"    • {sub.criterion:<30} Score: {sub.score:>3}/100 (weight {sub.weight:.2f}) -- {sub.justification}")

    # ── Display Missing Content (Stage 5) ──────────────────────────────
    print("\n" + "─" * 70)
    print(f"  STAGE 5: MISSING REQUIREMENTS ({len(result.missing_content)})")
    print("─" * 70)

    for i, mc in enumerate(result.missing_content, 1):
        print(f"  [{i}] [{mc.category.upper()}] {mc.jd_requirement}")
        print(f"      Recommendation: {mc.recommendation}")

    # ── Display Issues & Annotations ──────────────────────────────────
    print("\n" + "─" * 70)
    print(f"  STAGE 5: SPECIFIC RESUME ISSUES ({len(result.issues)})")
    print("─" * 70)

    for i, issue in enumerate(result.issues, 1):
        print(f"  [{i}] [{issue.severity.upper()}] Section: {issue.section} | Type: {issue.issue_type}")
        print(f"      Snippet: \"{issue.exact_text_snippet}\"")
        print(f"      Fix:     {issue.suggestion}")

    print("\n" + "═" * 70)
    print("   TERMINAL TEST COMPLETE ✅")
    print("═" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(main())

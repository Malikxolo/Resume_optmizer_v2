"""
Chained 5-Stage Scoring Pipeline — orchestrates deep taxonomy extraction,
resume gap audit, grounded ATS scoring, AI recruiter screening, and issue detection.

Execution Flow:
  Stage 1: Extract JD Requirements Taxonomy
  Stage 2: Deterministic Resume Match vs. Gap Audit (consumes Stage 1)
  Stage 3, 4, 5 in Parallel (asyncio.gather):
    - Stage 3: Grounded ATS & Relevancy Scoring (consumes Stage 2 Audit)
    - Stage 4: AI Recruiter Screening (consumes Stage 2 Audit)
    - Stage 5: Verbatim Issue & Annotation Extraction (consumes Stage 2 Audit)
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from pydantic import BaseModel, Field

from app.gemini_client import get_gemini_client
from app.latex_pipeline import extract_plaintext
from app.prompts import (
    STAGE1_JD_TAXONOMY_PROMPT,
    STAGE1_JD_TAXONOMY_SYSTEM,
    STAGE2_GAP_AUDIT_PROMPT,
    STAGE2_GAP_AUDIT_SYSTEM,
    STAGE3_ATS_SCORE_PROMPT,
    STAGE3_ATS_SCORE_SYSTEM,
    STAGE4_AI_SCREENING_PROMPT,
    STAGE4_AI_SCREENING_SYSTEM,
    STAGE5_ISSUE_ANNOTATIONS_PROMPT,
    STAGE5_ISSUE_ANNOTATIONS_SYSTEM,
    wrap_jd,
    wrap_resume_latex,
    wrap_resume_plaintext,
)
from app.schemas import (
    AIScreeningScore,
    ATSScore,
    JDRequirementsTaxonomy,
    MissingContent,
    ResumeGapAudit,
    ResumeIssue,
    ScoringResult,
)

logger = logging.getLogger(__name__)


# ── Stage 1: Extract JD Taxonomy ──────────────────────────────────

def _extract_jd_taxonomy(client: Any, jd_text: str) -> JDRequirementsTaxonomy:
    """Stage 1: Extract explicit and implicit JD requirements."""
    prompt = STAGE1_JD_TAXONOMY_PROMPT.format(jd=wrap_jd(jd_text))
    return client.generate_structured(
        prompt=prompt,
        system=STAGE1_JD_TAXONOMY_SYSTEM,
        schema=JDRequirementsTaxonomy,
    )


# ── Stage 2: Audit Resume Gaps ────────────────────────────────────

def _audit_resume_gaps(
    client: Any, resume_latex: str, plaintext: str, taxonomy: JDRequirementsTaxonomy
) -> ResumeGapAudit:
    """Stage 2: Audit resume against Stage 1 taxonomy line-by-line."""
    prompt = STAGE2_GAP_AUDIT_PROMPT.format(
        resume_latex=wrap_resume_latex(resume_latex),
        resume_plaintext=wrap_resume_plaintext(plaintext),
        taxonomy_json=taxonomy.model_dump_json(indent=2),
    )
    return client.generate_structured(
        prompt=prompt,
        system=STAGE2_GAP_AUDIT_SYSTEM,
        schema=ResumeGapAudit,
    )


# ── Stage 3: Grounded ATS Scoring ─────────────────────────────────

def _score_ats_grounded(
    client: Any, resume_latex: str, jd_text: str, audit: ResumeGapAudit
) -> ATSScore:
    """Stage 3: Score ATS parseability & relevancy bound strictly to Stage 2 audit."""
    prompt = STAGE3_ATS_SCORE_PROMPT.format(
        resume_latex=wrap_resume_latex(resume_latex),
        jd=wrap_jd(jd_text),
        audit_json=audit.model_dump_json(indent=2),
    )
    return client.generate_structured(
        prompt=prompt,
        system=STAGE3_ATS_SCORE_SYSTEM,
        schema=ATSScore,
    )


# ── Stage 4: AI Recruiter Screening ──────────────────────────────

def _score_ai_screening_grounded(
    client: Any, resume_latex: str, jd_text: str, audit: ResumeGapAudit
) -> AIScreeningScore:
    """Stage 4: Score AI recruiter screening bound strictly to Stage 2 audit."""
    prompt = STAGE4_AI_SCREENING_PROMPT.format(
        resume_latex=wrap_resume_latex(resume_latex),
        jd=wrap_jd(jd_text),
        audit_json=audit.model_dump_json(indent=2),
    )
    return client.generate_structured(
        prompt=prompt,
        system=STAGE4_AI_SCREENING_SYSTEM,
        schema=AIScreeningScore,
    )


# ── Stage 5: Issue & Annotation Extraction ───────────────────────

class _Stage5Response(BaseModel):
    issues: list[ResumeIssue] = Field(default_factory=list)
    missing_content: list[MissingContent] = Field(default_factory=list)


def _extract_issues_and_missing(
    client: Any,
    resume_latex: str,
    plaintext: str,
    jd_text: str,
    audit: ResumeGapAudit,
) -> _Stage5Response:
    """Stage 5: Extract verbatim issue text snippets and missing content items."""
    prompt = STAGE5_ISSUE_ANNOTATIONS_PROMPT.format(
        resume_latex=wrap_resume_latex(resume_latex),
        resume_plaintext=wrap_resume_plaintext(plaintext),
        jd=wrap_jd(jd_text),
        audit_json=audit.model_dump_json(indent=2),
    )
    return client.generate_structured(
        prompt=prompt,
        system=STAGE5_ISSUE_ANNOTATIONS_SYSTEM,
        schema=_Stage5Response,
    )


# ── Main Orchestrator ─────────────────────────────────────────────

async def run_scoring_pipeline(
    tex_content: str,
    jd_text: str,
    plaintext: str | None = None,
) -> ScoringResult:
    """
    Run the 5-Stage Sequential Chained Pipeline:
      1. Plaintext Extraction
      2. Stage 1: JD Requirements Taxonomy Extraction
      3. Stage 2: Deterministic Resume Match vs. Gap Audit (consumes Stage 1)
      4. Stage 3, 4, 5 in Parallel (asyncio.gather, consuming Stage 2 Audit):
         - Stage 3: Grounded ATS Scoring
         - Stage 4: AI Recruiter Screening
         - Stage 5: Issue Annotations & Missing Content
      5. Combine into unified ScoringResult
    """
    client = get_gemini_client()

    # Step 1: Plaintext extraction
    if plaintext is None:
        plaintext = await extract_plaintext(tex_content)

    logger.info("Starting Stage 1: Deep JD Taxonomy Extraction...")
    taxonomy = await asyncio.to_thread(_extract_jd_taxonomy, client, jd_text)
    logger.info("Stage 1 complete — Extracted %d requirements", len(taxonomy.requirements))

    logger.info("Starting Stage 2: Resume Gap & Keyword Audit...")
    audit = await asyncio.to_thread(
        _audit_resume_gaps, client, tex_content, plaintext, taxonomy
    )
    logger.info(
        "Stage 2 complete — Matched: %d/%d (%d%%), Missing: %d",
        audit.exact_matches_count + audit.semantic_matches_count,
        audit.total_requirements,
        audit.match_percentage,
        audit.missing_count,
    )

    logger.info("Starting Stages 3, 4, 5 in parallel (grounded in Stage 2 audit)...")
    ats_task = asyncio.to_thread(_score_ats_grounded, client, tex_content, jd_text, audit)
    await asyncio.sleep(0.5)
    ai_task = asyncio.to_thread(_score_ai_screening_grounded, client, tex_content, jd_text, audit)
    await asyncio.sleep(0.5)
    issues_task = asyncio.to_thread(
        _extract_issues_and_missing, client, tex_content, plaintext, jd_text, audit
    )

    ats_score, ai_score, issue_result = await asyncio.gather(
        ats_task, ai_task, issues_task
    )

    logger.info(
        "5-Stage Pipeline complete — ATS: %d, AI: %d, Issues: %d, Missing: %d",
        ats_score.total_score,
        ai_score.total_score,
        len(issue_result.issues),
        len(issue_result.missing_content),
    )

    return ScoringResult(
        ats_score=ats_score,
        ai_screening_score=ai_score,
        issues=issue_result.issues,
        missing_content=issue_result.missing_content,
        gap_audit=audit,
    )

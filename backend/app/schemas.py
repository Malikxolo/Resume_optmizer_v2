"""
Pydantic models for every structured Gemini output.

These serve double duty:
  1. Passed as `response_schema` to Gemini for JSON-mode enforcement
  2. Used as API response models in FastAPI endpoints
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════
# Stage 1 & 2: Taxonomy & Gap Audit Schemas
# ═══════════════════════════════════════════════════════════════════

class JDRequirementItem(BaseModel):
    """A single requirement extracted from the Job Description."""
    name: str = Field(description="Name of skill, tool, framework, or concept (e.g. 'SQL', 'Pandas', 'OOP')")
    category: str = Field(description="Category: hard_skill, soft_skill, framework, methodology, domain, qualification")
    importance: str = Field(description="One of: required, preferred, nice_to_have")


class JDRequirementsTaxonomy(BaseModel):
    """Stage 1 Output: Taxonomy of requirements extracted from the JD."""
    role_title: str = Field(description="Target role title extracted from JD")
    experience_level: str = Field(description="Required experience level/years (e.g. '0-1 years', '3+ years')")
    requirements: list[JDRequirementItem] = Field(description="List of all extracted requirements")


class RequirementAuditItem(BaseModel):
    """Audit status of a single JD requirement against the candidate's resume."""
    requirement_name: str = Field(description="Name of the JD requirement being audited")
    category: str = Field(description="Category from JD taxonomy")
    importance: str = Field(description="required, preferred, nice_to_have")
    status: str = Field(description="One of: EXACT_MATCH, SEMANTIC_MATCH, MISSING")
    matched_snippet: str = Field(default="", description="Verbatim text from resume if matched, empty if missing")
    notes: str = Field(description="1-sentence explanation of why it matched or is missing")


class ResumeGapAudit(BaseModel):
    """Stage 2 Output: Complete audit matrix comparing resume against JD requirements."""
    total_requirements: int = Field(description="Total number of requirements audited")
    exact_matches_count: int = Field(description="Number of exact matches found")
    semantic_matches_count: int = Field(description="Number of semantic matches found")
    missing_count: int = Field(description="Number of missing requirements")
    match_percentage: int = Field(ge=0, le=100, description="Overall match percentage (0-100)")
    audited_items: list[RequirementAuditItem] = Field(description="Line-by-line audit results")


# ═══════════════════════════════════════════════════════════════════
# Stage 3 & 4: Scoring schemas
# ═══════════════════════════════════════════════════════════════════

class SubCriterionScore(BaseModel):
    """A single sub-criterion evaluation within a rubric."""
    criterion: str = Field(description="Name of the sub-criterion")
    score: int = Field(ge=0, le=100, description="Score 0-100")
    weight: float = Field(description="Weight of this criterion in the total (0.0-1.0)")
    justification: str = Field(description="1-2 sentence justification for the score")


class ATSScore(BaseModel):
    """ATS parseability evaluation — how well an ATS parser can read this resume."""
    total_score: int = Field(ge=0, le=100, description="Weighted total ATS score 0-100")
    sub_scores: list[SubCriterionScore] = Field(
        description="Scores for: section_headers, date_format_consistency, "
        "contact_info_detectability, keyword_overlap_semantic, "
        "keyword_overlap_exact, formatting_parseability"
    )


class AIScreeningScore(BaseModel):
    """AI/LLM recruiter screening evaluation — JD fit as judged by an AI recruiter."""
    total_score: int = Field(ge=0, le=100, description="Weighted total AI screening score 0-100")
    sub_scores: list[SubCriterionScore] = Field(
        description="Scores for: relevance, quantified_impact, clarity, "
        "seniority_alignment, natural_keyword_usage, keyword_stuffing_penalty"
    )


# ═══════════════════════════════════════════════════════════════════
# Stage 5: Issue / annotation schemas
# ═══════════════════════════════════════════════════════════════════

class ResumeIssue(BaseModel):
    """An issue found at a specific text span in the resume."""
    section: str = Field(description="Resume section: Summary, Skills, Experience, Education, Projects, Certifications")
    exact_text_snippet: str = Field(description="Verbatim text from the plaintext extraction (not LaTeX commands)")
    issue_type: str = Field(description="One of: wording, missing_keyword, format, quantification, clarity, redundancy")
    severity: str = Field(description="One of: critical, major, minor")
    suggestion: str = Field(description="Concrete suggestion to fix this issue")


class MissingContent(BaseModel):
    """A JD requirement with zero presence in the resume — no snippet to annotate."""
    category: str = Field(description="One of: keyword, skill, experience, certification, section")
    jd_requirement: str = Field(description="The specific JD requirement that is missing")
    recommendation: str = Field(description="How and where to add this to the resume")


class ScoringResult(BaseModel):
    """Combined output of the full 5-stage scoring pipeline."""
    ats_score: ATSScore
    ai_screening_score: AIScreeningScore
    issues: list[ResumeIssue]
    missing_content: list[MissingContent]
    gap_audit: ResumeGapAudit | None = None


# ═══════════════════════════════════════════════════════════════════
# Anti-hallucination verification schemas
# ═══════════════════════════════════════════════════════════════════

class VerificationFlag(BaseModel):
    """A fact in the edited resume that cannot be traced to the original or user instructions."""
    flagged_text: str = Field(description="The exact text that appears fabricated or unverified")
    reason: str = Field(description="Why this is flagged: e.g. 'not in original resume', 'metric not provided by user'")
    location_in_draft: str = Field(description="Which section/bullet this appears in")


class VerificationResult(BaseModel):
    """Output of the anti-hallucination verification pass."""
    flags: list[VerificationFlag] = Field(default_factory=list)
    is_clean: bool = Field(description="True if no hallucinated facts were detected")


# ═══════════════════════════════════════════════════════════════════
# Chat / edit schemas
# ═══════════════════════════════════════════════════════════════════

class EditResult(BaseModel):
    """Result of a chat-based scoped edit."""
    edited_tex: str = Field(description="Complete, compilable .tex document after the edit")
    change_summary: str = Field(description="Brief description of what was changed")
    sections_modified: list[str] = Field(description="List of section names that were modified")


# ═══════════════════════════════════════════════════════════════════
# API request/response models
# ═══════════════════════════════════════════════════════════════════

class UploadRequest(BaseModel):
    """Upload a resume and JD for analysis."""
    tex_content: str = Field(description="Full LaTeX source of the resume")
    jd_text: str = Field(description="Job description text")


class ChatMessage(BaseModel):
    """A single chat message."""
    role: str = Field(description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    """User instruction for scoped resume editing."""
    message: str = Field(description="Natural-language editing instruction")


class VersionInfo(BaseModel):
    """Metadata for a single resume version."""
    version: int
    ats_score: int | None = None
    ai_score: int | None = None
    change_summary: str = ""
    created_at: str = ""


class SessionState(BaseModel):
    """Current state of a session returned after upload or operations."""
    session_id: str
    current_version: int
    tex_content: str
    plaintext: str
    jd_text: str

"""
Mock Data Module — Provides realistic mock fixtures for Demo Mode testing.
Completely bypasses Gemini LLM API calls with zero latency and zero cost.
"""

from __future__ import annotations

from app.schemas import (
    AIScreeningScore,
    ATSScore,
    MissingContent,
    RequirementAuditItem,
    ResumeGapAudit,
    ResumeIssue,
    ScoringResult,
    SubCriterionScore,
)

DEFAULT_SAMPLE_TEX = r"""\documentclass[letterpaper,11pt]{article}
\usepackage[utf8]{inputenc}
\usepackage{geometry}
\geometry{letterpaper, margin=0.75in}
\usepackage{hyperref}

\begin{document}
\centerline{\Huge \bfseries Faizan Ahmad}
\centerline{Email: faizanmalik185@gmail.com | Mobile: +91 8707480420 | Location: India}
\centerline{LinkedIn: linkedin.com/in/faizanalik | GitHub: github.com/Malikxolo}

\vspace{10pt}
\section*{Professional Summary}
AI/ML Computational Science Associate and Python Developer with hands-on experience designing and operating backend services, REST APIs, and automated data processing workflows using Python, Django, FastAPI, SQL, and LangChain. Azure Administrator Associate certified, with strong foundations in OOP, Data Structures, cloud platforms (Azure/GCP), and containerized deployments with Docker and Kubernetes.

\vspace{10pt}
\section*{Technical Skills}
\begin{itemize}
    \item \textbf{Languages \& Backend}: Python, FastAPI, Django, REST APIs, SQL, PostgreSQL, SQLite
    \item \textbf{AI / ML \& Tools}: LangChain, Gemini API, Vector Databases, Pandas, NumPy, Scikit-learn
    \item \textbf{Cloud \& DevOps}: Docker, Kubernetes, Azure, GCP, CI/CD Pipelines, Git
\end{itemize}

\vspace{10pt}
\section*{Professional Experience}
\textbf{FoodNest(s) Technologies} \hfill \textit{August 2025 -- Present} \\
\textit{Associate Member of Technical Staff (AMTS)} \hfill \textit{Remote}
\begin{itemize}
    \item Designed and operated distributed backend services for voice and chat workflows using Python, Django, FastAPI, LangChain, and vector databases; improved average response time by 35\%.
    \item Built and maintained Django REST APIs with ORM-based data models and authentication for internal tooling, streamlining 8+ business workflows.
    \item Containerized microservices using Docker and orchestrated deployments on Kubernetes cluster, ensuring high availability and zero-downtime rollouts.
\end{itemize}

\vspace{10pt}
\section*{Education}
\textbf{Bachelor of Technology in Computer Science \& Engineering} \hfill \textit{2021 -- 2025} \\
Integral University, Lucknow -- CGPA: 8.4/10

\end{document}
"""

DEFAULT_SAMPLE_JD = """We are seeking a Python & AI/ML Backend Engineer to join our core engineering team.

Key Responsibilities:
- Design, build, and maintain scalable REST APIs and backend microservices using Python (FastAPI/Django).
- Implement retrieval-augmented generation (RAG) pipelines, LLM integrations, and vector database queries.
- Optimize database queries (PostgreSQL/SQL) and asynchronous task execution (Celery/Redis).
- Build automated data processing pipelines with Pandas, NumPy, and Scikit-learn.
- Package applications into Docker containers and deploy via Kubernetes / GCP Cloud Run.

Requirements & Qualifications:
- 1-3 years of experience in Python software development.
- Strong proficiency in FastAPI or Django REST Framework.
- Hands-on experience with LLM applications (LangChain, OpenAI/Gemini API, Pinecone/ChromaDB).
- Solid understanding of Docker, Kubernetes, SQL database design, and cloud environments (GCP or Azure).
- Familiarity with CI/CD pipelines, automated testing, and technical documentation.
"""


MOCK_ATS_SCORE = ATSScore(
    total_score=78,
    sub_scores=[
        SubCriterionScore(
            criterion="Section Headers",
            score=95,
            weight=0.15,
            justification="Standard headers (Professional Summary, Technical Skills, Experience, Education) are perfectly parseable by ATS.",
        ),
        SubCriterionScore(
            criterion="Date Format Consistency",
            score=90,
            weight=0.15,
            justification="Consistent date format ('Month Year -- Month Year') used across all entries.",
        ),
        SubCriterionScore(
            criterion="Contact Info Detectability",
            score=95,
            weight=0.15,
            justification="Email, phone number, LinkedIn, and GitHub links are clear and well-structured.",
        ),
        SubCriterionScore(
            criterion="Keyword Overlap (Exact)",
            score=68,
            weight=0.25,
            justification="Matches key terms like Python, FastAPI, Django, Docker, and Kubernetes, but lacks PostgreSQL, Celery, and RAG.",
        ),
        SubCriterionScore(
            criterion="Keyword Overlap (Semantic)",
            score=82,
            weight=0.15,
            justification="Strong conceptual match with backend development and cloud containerization.",
        ),
        SubCriterionScore(
            criterion="Formatting Parseability",
            score=85,
            weight=0.15,
            justification="Clean single-column LaTeX layout with standard list environments.",
        ),
    ],
)


MOCK_AI_SCORE = AIScreeningScore(
    total_score=86,
    sub_scores=[
        SubCriterionScore(
            criterion="Relevance",
            score=90,
            weight=0.25,
            justification="Candidate background strongly aligns with Python backend and AI/ML requirements.",
        ),
        SubCriterionScore(
            criterion="Quantified Impact",
            score=80,
            weight=0.25,
            justification="Bullet points contain metrics like '35% response time improvement' and '8+ business workflows'.",
        ),
        SubCriterionScore(
            criterion="Clarity & Tone",
            score=92,
            weight=0.20,
            justification="Professional tone with strong action verbs (Designed, Operated, Containerized).",
        ),
        SubCriterionScore(
            criterion="Seniority Alignment",
            score=84,
            weight=0.15,
            justification="Experience level fits well with Junior/Associate engineer positioning.",
        ),
        SubCriterionScore(
            criterion="Natural Keyword Usage",
            score=88,
            weight=0.15,
            justification="Skills and framework references flow naturally without artificial stuffing.",
        ),
    ],
)


MOCK_ISSUES = [
    ResumeIssue(
        section="Experience",
        exact_text_snippet="Designed and operated distributed backend services for voice and chat workflows using Python, Django, FastAPI, LangChain, and vector databases; improved average response time by 35%.",
        issue_type="quantification",
        severity="minor",
        suggestion="Explicitly mention PostgreSQL or query optimization techniques used to achieve the 35% latency drop.",
    ),
    ResumeIssue(
        section="Technical Skills",
        exact_text_snippet="Python, FastAPI, Django, REST APIs, SQL, PostgreSQL, SQLite",
        issue_type="missing_keyword",
        severity="major",
        suggestion="Add 'RAG Architecture' and 'Celery/Asynchronous Processing' alongside FastAPI in Technical Skills.",
    ),
    ResumeIssue(
        section="Professional Summary",
        exact_text_snippet="AI/ML Computational Science Associate and Python Developer with hands-on experience designing and operating backend services...",
        issue_type="wording",
        severity="minor",
        suggestion="Tailor summary to explicitly mention building RAG pipelines and deploying on GCP.",
    ),
]


MOCK_MISSING = [
    MissingContent(
        category="skill",
        jd_requirement="PostgreSQL & Database Query Optimization",
        recommendation="Include explicit mention of PostgreSQL database modeling and query performance tuning under Technical Skills.",
    ),
    MissingContent(
        category="framework",
        jd_requirement="Celery / Asynchronous Task Execution",
        recommendation="Add Celery and Redis background task worker experience in bullet points or skills list.",
    ),
    MissingContent(
        category="methodology",
        jd_requirement="Retrieval-Augmented Generation (RAG)",
        recommendation="Add RAG architecture expertise in the AI/ML section of skills.",
    ),
    MissingContent(
        category="keyword",
        jd_requirement="GCP / Cloud Run",
        recommendation="Highlight GCP Cloud Run alongside Azure container deployments.",
    ),
]


MOCK_GAP_AUDIT = ResumeGapAudit(
    total_requirements=8,
    exact_matches_count=5,
    semantic_matches_count=2,
    missing_count=1,
    match_percentage=85,
    audited_items=[
        RequirementAuditItem(
            requirement_name="Python & FastAPI/Django",
            category="hard_skill",
            importance="required",
            status="EXACT_MATCH",
            matched_snippet="Python, Django, FastAPI",
            notes="Direct match in skills and experience.",
        ),
        RequirementAuditItem(
            requirement_name="Docker & Kubernetes",
            category="framework",
            importance="required",
            status="EXACT_MATCH",
            matched_snippet="Docker and Kubernetes",
            notes="Containerized microservices listed.",
        ),
        RequirementAuditItem(
            requirement_name="RAG & LLM Integration",
            category="domain",
            importance="required",
            status="SEMANTIC_MATCH",
            matched_snippet="LangChain, and vector databases",
            notes="LangChain and vector DBs mentioned, RAG implicitly covered.",
        ),
        RequirementAuditItem(
            requirement_name="Celery / Redis",
            category="framework",
            importance="preferred",
            status="MISSING",
            matched_snippet="",
            notes="No direct mention of async task queues found.",
        ),
    ],
)


MOCK_SCORING_RESULT = ScoringResult(
    ats_score=MOCK_ATS_SCORE,
    ai_screening_score=MOCK_AI_SCORE,
    issues=MOCK_ISSUES,
    missing_content=MOCK_MISSING,
    gap_audit=MOCK_GAP_AUDIT,
)

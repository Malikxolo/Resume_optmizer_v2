"""
FastAPI API routes — REST + SSE endpoints for the resume optimizer.

SSE streams are used for scoring and chat responses so the frontend
can show progressive reveals and animations.
"""

from __future__ import annotations

import json
import logging
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from app.chat_service import process_chat_message
from app.config import get_settings
from app.latex_pipeline import compile_to_pdf, extract_plaintext
from app.mock_data import (
    DEFAULT_SAMPLE_JD,
    DEFAULT_SAMPLE_TEX,
    MOCK_SCORING_RESULT,
)
from app.schemas import (
    ChatRequest,
    SessionState,
    UploadRequest,
    VersionInfo,
)
from app.scoring_pipeline import run_scoring_pipeline
from app.version_store import (
    create_session,
    get_latest_version,
    get_latest_version_num,
    get_messages,
    get_session_jd,
    get_version,
    get_version_pdf,
    list_versions,
    save_version,
    update_version_pdf,
    update_version_scores,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# ═══════════════════════════════════════════════════════════════════
# Config
# ═══════════════════════════════════════════════════════════════════

@router.get("/config")
async def get_app_config():
    """Return application environment flags like demo_mode."""
    settings = get_settings()
    return {"demo_mode": settings.DEMO_MODE}


# ═══════════════════════════════════════════════════════════════════
# Upload
# ═══════════════════════════════════════════════════════════════════

@router.post("/upload", response_model=SessionState)
async def upload_resume(req: UploadRequest):
    """
    Upload a .tex resume and JD text.
    Creates a session, extracts plaintext, compiles PDF, and returns session state.
    In Demo Mode, automatically fills empty payload with default demo resume & JD.
    """
    settings = get_settings()

    tex_content = req.tex_content
    jd_text = req.jd_text

    if settings.DEMO_MODE:
        if not tex_content or not tex_content.strip():
            tex_content = DEFAULT_SAMPLE_TEX
        if not jd_text or not jd_text.strip():
            jd_text = DEFAULT_SAMPLE_JD

    # Create session
    session_id = await create_session(jd_text)

    # Extract plaintext
    plaintext = await extract_plaintext(tex_content)

    # Compile PDF (non-blocking, don't fail the upload if tectonic is missing)
    compile_result = await compile_to_pdf(tex_content)
    pdf_bytes = compile_result.pdf_bytes if compile_result.success else None

    if not compile_result.success:
        logger.warning("Initial PDF compilation failed: %s", compile_result.error[:200])

    # Save as version 1
    await save_version(
        session_id=session_id,
        version_num=1,
        tex_content=tex_content,
        plaintext=plaintext,
        pdf_bytes=pdf_bytes,
        change_summary="Initial upload",
    )

    return SessionState(
        session_id=session_id,
        current_version=1,
        tex_content=tex_content,
        plaintext=plaintext,
        jd_text=jd_text,
        has_pdf=pdf_bytes is not None,
    )


# ═══════════════════════════════════════════════════════════════════
# Scoring (SSE stream)
# ═══════════════════════════════════════════════════════════════════

@router.get("/score/{session_id}")
async def score_resume(session_id: str):
    """
    SSE stream: runs the full scoring pipeline and streams results.
    Events: 'status', 'ats_score', 'ai_score', 'issues', 'missing', 'complete'
    """

    async def event_generator() -> AsyncIterator[dict]:
        try:
            # Get current state
            latest = await get_latest_version(session_id)
            if not latest:
                yield {"event": "error", "data": json.dumps({"error": "Session not found"})}
                return

            jd_text = await get_session_jd(session_id)
            if not jd_text:
                yield {"event": "error", "data": json.dumps({"error": "JD not found"})}
                return

            tex_content = latest["tex_content"]
            plaintext = latest["plaintext"]

            settings = get_settings()
            if settings.DEMO_MODE:
                yield {"event": "status", "data": json.dumps({"status": "scoring", "message": "⚡ Demo Mode: Instant mock score analysis (0 LLM calls)..."})}
                result = MOCK_SCORING_RESULT
            else:
                yield {"event": "status", "data": json.dumps({"status": "scoring", "message": "Analyzing resume..."})}
                result = await run_scoring_pipeline(tex_content, jd_text, plaintext)

            # Stream results progressively
            yield {
                "event": "ats_score",
                "data": result.ats_score.model_dump_json(),
            }

            yield {
                "event": "ai_score",
                "data": result.ai_screening_score.model_dump_json(),
            }

            yield {
                "event": "issues",
                "data": json.dumps([issue.model_dump() for issue in result.issues]),
            }

            yield {
                "event": "missing",
                "data": json.dumps([mc.model_dump() for mc in result.missing_content]),
            }

            # Save scores to version
            version_num = latest["version_num"]
            await update_version_scores(session_id, version_num, result.model_dump_json())

            yield {
                "event": "complete",
                "data": json.dumps({
                    "ats_total": result.ats_score.total_score,
                    "ai_total": result.ai_screening_score.total_score,
                    "issue_count": len(result.issues),
                    "missing_count": len(result.missing_content),
                }),
            }

        except Exception as e:
            logger.exception("Scoring error for session %s", session_id)
            yield {"event": "error", "data": json.dumps({"error": str(e)})}

    sse_headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }
    return EventSourceResponse(event_generator(), headers=sse_headers)


# ═══════════════════════════════════════════════════════════════════
# Chat (SSE stream)
# ═══════════════════════════════════════════════════════════════════

@router.post("/chat/{session_id}")
async def chat_edit(session_id: str, req: ChatRequest):
    """
    SSE stream: processes a chat edit instruction.
    Events: 'status', 'edit_result', 'verification', 'complete'
    Fast mode: Skips automatic 5-stage re-scoring to save API costs and speed up response time.
    """

    async def event_generator() -> AsyncIterator[dict]:
        try:
            jd_text = await get_session_jd(session_id)
            if not jd_text:
                yield {"event": "error", "data": json.dumps({"error": "Session not found"})}
                return

            settings = get_settings()
            if settings.DEMO_MODE:
                yield {"event": "status", "data": json.dumps({"status": "editing", "message": "⚡ Demo Mode: Mock refinement..."})}
                latest = await get_latest_version(session_id)
                v_num = latest["version_num"] if latest else 1
                mock_summary = f"⚡ [Demo Mode] Mock instruction received: '{req.message}'. In live production, Gemini 3.6 Flash applies exact LaTeX edits!"
                yield {
                    "event": "edit_result",
                    "data": json.dumps({
                        "version": v_num,
                        "tex_content": latest["tex_content"] if latest else "",
                        "plaintext": latest["plaintext"] if latest else "",
                        "change_summary": mock_summary,
                        "compile_error": None,
                        "has_pdf": True,
                    }),
                }
                yield {
                    "event": "verification",
                    "data": json.dumps({"flags": []}),
                }
                yield {
                    "event": "complete",
                    "data": json.dumps({
                        "version": v_num,
                        "needs_rescore": False,
                        "message": mock_summary,
                    }),
                }
                return

            yield {"event": "status", "data": json.dumps({"status": "editing", "message": "Applying changes..."})}

            # Process chat message in fast mode (no auto-rescore)
            result = await process_chat_message(session_id, jd_text, req.message, auto_rescore=False)

            yield {
                "event": "edit_result",
                "data": json.dumps({
                    "version": result.version_num,
                    "tex_content": result.edited_tex,
                    "plaintext": result.plaintext,
                    "change_summary": result.change_summary,
                    "compile_error": result.compile_error,
                    "has_pdf": result.pdf_bytes is not None,
                }),
            }

            yield {
                "event": "verification",
                "data": result.verification.model_dump_json(),
            }

            yield {
                "event": "complete",
                "data": json.dumps({
                    "version": result.version_num,
                    "needs_rescore": True,
                    "message": "Resume updated. Click 'Re-Score Resume 🔄' to refresh score.",
                }),
            }

        except Exception as e:
            logger.exception("Chat error for session %s", session_id)
            yield {"event": "error", "data": json.dumps({"error": str(e)})}

    sse_headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }
    return EventSourceResponse(event_generator(), headers=sse_headers)


@router.get("/rescore/{session_id}")
async def rescore_session_endpoint(session_id: str):
    """
    SSE stream: On-Demand Re-Scoring of the current resume version against the JD.
    Events: 'status', 'ats_score', 'ai_score', 'issues', 'missing', 'complete'
    """

    async def event_generator() -> AsyncIterator[dict]:
        try:
            latest = await get_latest_version(session_id)
            if not latest:
                yield {"event": "error", "data": json.dumps({"error": "Session not found"})}
                return

            jd_text = await get_session_jd(session_id)
            if not jd_text:
                yield {"event": "error", "data": json.dumps({"error": "JD not found"})}
                return

            tex_content = latest["tex_content"]
            plaintext = latest["plaintext"]

            settings = get_settings()
            if settings.DEMO_MODE:
                yield {"event": "status", "data": json.dumps({"status": "scoring", "message": "⚡ Demo Mode: Instant mock re-score..."})}
                result = MOCK_SCORING_RESULT
            else:
                yield {"event": "status", "data": json.dumps({"status": "scoring", "message": "Re-analyzing resume against JD..."})}
                result = await run_scoring_pipeline(tex_content, jd_text, plaintext)

            yield {
                "event": "ats_score",
                "data": result.ats_score.model_dump_json(),
            }

            yield {
                "event": "ai_score",
                "data": result.ai_screening_score.model_dump_json(),
            }

            yield {
                "event": "issues",
                "data": json.dumps([issue.model_dump() for issue in result.issues]),
            }

            yield {
                "event": "missing",
                "data": json.dumps([mc.model_dump() for mc in result.missing_content]),
            }

            version_num = latest["version_num"]
            await update_version_scores(session_id, version_num, result.model_dump_json())

            yield {
                "event": "complete",
                "data": json.dumps({
                    "ats_total": result.ats_score.total_score,
                    "ai_total": result.ai_screening_score.total_score,
                    "issue_count": len(result.issues),
                    "missing_count": len(result.missing_content),
                }),
            }

        except Exception as e:
            logger.exception("Re-scoring error for session %s", session_id)
            yield {"event": "error", "data": json.dumps({"error": str(e)})}

    sse_headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }
    return EventSourceResponse(event_generator(), headers=sse_headers)



# ═══════════════════════════════════════════════════════════════════
# PDF endpoints
# ═══════════════════════════════════════════════════════════════════

@router.get("/pdf/{session_id}")
async def get_current_pdf(session_id: str):
    """Serve the current version's compiled PDF."""
    latest = await get_latest_version(session_id)
    if not latest or not latest.get("pdf_bytes"):
        raise HTTPException(404, "PDF not available")

    return Response(
        content=latest["pdf_bytes"],
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="resume.pdf"'},
    )


@router.get("/pdf/{session_id}/{version}")
async def get_version_pdf_endpoint(session_id: str, version: int):
    """Serve a specific version's compiled PDF."""
    pdf_bytes = await get_version_pdf(session_id, version)
    if not pdf_bytes:
        raise HTTPException(404, "PDF not available for this version")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="resume_v{version}.pdf"'},
    )


@router.get("/download/{session_id}")
async def download_pdf(session_id: str, filename: str = "resume_optimized.pdf"):
    """Download the current PDF as an attachment with user-specified filename."""
    latest = await get_latest_version(session_id)
    if not latest or not latest.get("pdf_bytes"):
        raise HTTPException(404, "PDF not available")

    # Ensure filename ends with .pdf
    if not filename.endswith(".pdf"):
        filename += ".pdf"

    return Response(
        content=latest["pdf_bytes"],
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ═══════════════════════════════════════════════════════════════════
# Version history
# ═══════════════════════════════════════════════════════════════════

@router.get("/history/{session_id}", response_model=list[VersionInfo])
async def get_history(session_id: str):
    """List all versions with scores and change summaries."""
    versions = await list_versions(session_id)
    if not versions:
        raise HTTPException(404, "Session not found")
    return versions


@router.post("/revert/{session_id}/{version}")
async def revert_to_version(session_id: str, version: int):
    """Revert to a previous version, creating a new version entry."""
    target = await get_version(session_id, version)
    if not target:
        raise HTTPException(404, f"Version {version} not found")

    # Create new version with the reverted content
    new_version_num = await get_latest_version_num(session_id) + 1
    await save_version(
        session_id=session_id,
        version_num=new_version_num,
        tex_content=target["tex_content"],
        plaintext=target.get("plaintext", ""),
        pdf_bytes=target.get("pdf_bytes"),
        scores_json=target.get("scores_json"),
        change_summary=f"Reverted to version {version}",
    )

    scores_data = None
    if target.get("scores_json"):
        try:
            scores_data = json.loads(target["scores_json"])
        except Exception:
            scores_data = None

    return {
        "version": new_version_num,
        "reverted_from": version,
        "message": f"Reverted to version {version}",
        "scores_data": scores_data,
        "tex_content": target["tex_content"],
        "plaintext": target.get("plaintext", ""),
    }


# ═══════════════════════════════════════════════════════════════════
# Chat message history
# ═══════════════════════════════════════════════════════════════════

@router.get("/messages/{session_id}")
async def get_chat_messages(session_id: str):
    """Get all chat messages for a session."""
    messages = await get_messages(session_id)
    return messages


# ═══════════════════════════════════════════════════════════════════
# Session state
# ═══════════════════════════════════════════════════════════════════

@router.get("/session/{session_id}", response_model=SessionState)
async def get_session_state(session_id: str):
    """Get the current state of a session."""
    latest = await get_latest_version(session_id)
    if not latest:
        raise HTTPException(404, "Session not found")

    jd_text = await get_session_jd(session_id) or ""

    return SessionState(
        session_id=session_id,
        current_version=latest["version_num"],
        tex_content=latest["tex_content"],
        plaintext=latest.get("plaintext", ""),
        jd_text=jd_text,
    )

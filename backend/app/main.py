"""
FastAPI application entry point.

Configures CORS, lifespan (DB init), and mounts the API router.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import get_settings
from app.version_store import init_db

# ── Logging setup ─────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-25s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize database. Shutdown: cleanup."""
    settings = get_settings()
    logger.info("Starting Resume Optimizer API")
    logger.info("  Model:    %s", settings.GEMINI_MODEL)
    logger.info("  Thinking: %s", settings.THINKING_LEVEL)
    logger.info("  Location: %s", settings.GCP_LOCATION)

    await init_db()
    yield
    logger.info("Shutting down Resume Optimizer API")


# ── App creation ──────────────────────────────────────────────────

app = FastAPI(
    title="Resume Optimizer v2",
    description="AI-powered resume optimization against job descriptions",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(router)


# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "model": settings.GEMINI_MODEL}

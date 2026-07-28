"""
Central configuration — all model/auth/path settings in one place.
Swap model or thinking level here without touching business logic.
"""

import json
import os
from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings, loaded from env vars or .env file."""

    # ── Gemini Model ──────────────────────────────────────────────
    GEMINI_MODEL: str = Field(
        default="gemini-3.6-flash",
        description="Vertex AI model ID",
    )
    THINKING_LEVEL: str = Field(
        default="HIGH",
        description="ThinkingConfig level: MINIMAL | LOW | MEDIUM | HIGH",
    )

    # ── GCP Auth ──────────────────────────────────────────────────
    GOOGLE_CREDENTIALS_PATH: str = Field(
        default=str(
            Path(__file__).resolve().parent.parent.parent
            / "Google_crediantials.json"
        ),
        description="Path to service account JSON key file",
    )
    GCP_PROJECT_ID: str = Field(
        default="",
        description="GCP project ID (auto-read from credentials file if blank)",
    )
    GCP_LOCATION: str = Field(
        default="global",
        description="Vertex AI location",
    )

    # ── LaTeX Tools ───────────────────────────────────────────────
    TECTONIC_PATH: str = Field(
        default="tectonic",
        description="Path or command name for the Tectonic binary",
    )
    PANDOC_PATH: str = Field(
        default="pandoc",
        description="Path or command name for Pandoc",
    )

    # ── Storage ───────────────────────────────────────────────────
    DB_PATH: str = Field(
        default=str(Path(__file__).resolve().parent.parent / "data" / "sessions.db"),
        description="SQLite database path",
    )

    # ── Server ────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = Field(
        default=[
            "https://resume.totalcareservices.me",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "*",
        ],
        description="Allowed CORS origins",
    )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def resolve_project_id(self) -> str:
        """Read project_id from the credentials JSON if not set explicitly."""
        if self.GCP_PROJECT_ID:
            return self.GCP_PROJECT_ID
        cred_path = Path(self.GOOGLE_CREDENTIALS_PATH)
        if cred_path.exists():
            with open(cred_path) as f:
                data = json.load(f)
            return data.get("project_id", "")
        return ""


@lru_cache
def get_settings() -> Settings:
    return Settings()

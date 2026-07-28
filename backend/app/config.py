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
        default="",
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
        ],
        description="Allowed CORS origins",
    )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def resolve_credentials_path(self) -> str:
        """Resolve valid path to service account credentials JSON."""
        # 1. Environment variable
        env_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if env_path and Path(env_path).exists():
            return env_path
        # 2. Configured setting
        if self.GOOGLE_CREDENTIALS_PATH and Path(self.GOOGLE_CREDENTIALS_PATH).exists():
            return self.GOOGLE_CREDENTIALS_PATH
        # 3. Docker container mounts
        for container_file in ["/app/Google_crediantials.json", "/app/Google_credentials.json"]:
            if Path(container_file).exists():
                return container_file
        # 4. Local workspace root fallback
        workspace_root = Path(__file__).resolve().parent.parent.parent
        for fname in ["Google_crediantials.json", "Google_credentials.json", "google_credentials.json"]:
            candidate = workspace_root / fname
            if candidate.exists():
                return str(candidate)
        return "/app/Google_crediantials.json"

    def resolve_project_id(self) -> str:
        """Read project_id from the credentials JSON if not set explicitly."""
        if self.GCP_PROJECT_ID:
            return self.GCP_PROJECT_ID
        cred_path = Path(self.resolve_credentials_path())
        if cred_path.exists():
            with open(cred_path) as f:
                data = json.load(f)
            return data.get("project_id", "")
        return ""


@lru_cache
def get_settings() -> Settings:
    return Settings()

"""
Singleton Gemini client — replicates the auth pattern from vertextest.cs
using the google-genai Python SDK with service account credentials.

Provides three high-level helpers:
  • generate_structured()  → Pydantic model via JSON-mode
  • generate_stream()      → async iterator of text chunks (for SSE)
  • generate_text()        → plain string completion
"""

from __future__ import annotations

import asyncio
import logging
from typing import AsyncIterator, Type, TypeVar

from google import genai
from google.genai import types
from google.oauth2 import service_account

from app.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T")

# ── Thinking level string → SDK enum mapping ─────────────────────
_THINKING_LEVELS = {
    "MINIMAL": types.ThinkingLevel.MINIMAL,
    "LOW": types.ThinkingLevel.LOW,
    "MEDIUM": types.ThinkingLevel.MEDIUM,
    "HIGH": types.ThinkingLevel.HIGH,
}


class GeminiClient:
    """Wrapper around google-genai Client with auto-injected thinking config."""

    def __init__(self) -> None:
        settings = get_settings()

        # Auth: service account credentials (same pattern as vertextest.cs)
        cred_path = settings.resolve_credentials_path()
        credentials = service_account.Credentials.from_service_account_file(
            cred_path,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        project_id = settings.resolve_project_id()
        logger.info("Initializing Gemini client — creds=%s, project=%s, model=%s", cred_path, project_id, settings.GEMINI_MODEL)

        self._client = genai.Client(
            vertexai=True,
            project=project_id,
            location=settings.GCP_LOCATION,
            credentials=credentials,
        )
        self._model = settings.GEMINI_MODEL
        self._thinking_config = types.ThinkingConfig(
            thinking_level=_THINKING_LEVELS.get(
                settings.THINKING_LEVEL.upper(), types.ThinkingLevel.HIGH
            ),
        )

    # ── Structured JSON output ────────────────────────────────────
    def generate_structured(
        self,
        *,
        prompt: str,
        system: str | None = None,
        schema: Type[T],
    ) -> T:
        """
        Call Gemini with response_schema (Pydantic class) and return
        the parsed, validated object.
        """
        config = types.GenerateContentConfig(
            thinking_config=self._thinking_config,
            response_mime_type="application/json",
            response_schema=schema,
        )
        if system:
            config.system_instruction = system

        response = self._client.models.generate_content(
            model=self._model,
            contents=prompt,
            config=config,
        )
        return response.parsed

    # ── Streaming text output ─────────────────────────────────────
    async def generate_stream(
        self,
        *,
        prompt: str,
        system: str | None = None,
    ) -> AsyncIterator[str]:
        """
        Yield text chunks from a streaming Gemini call.
        Runs the synchronous SDK stream in a thread to stay async-friendly.
        """
        config = types.GenerateContentConfig(
            thinking_config=self._thinking_config,
        )
        if system:
            config.system_instruction = system

        def _sync_stream():
            return self._client.models.generate_content_stream(
                model=self._model,
                contents=prompt,
                config=config,
            )

        stream = await asyncio.to_thread(_sync_stream)
        for chunk in stream:
            if chunk.text:
                yield chunk.text

    # ── Plain text output ─────────────────────────────────────────
    def generate_text(
        self,
        *,
        prompt: str,
        system: str | None = None,
    ) -> str:
        """Simple text completion — no schema, no streaming."""
        config = types.GenerateContentConfig(
            thinking_config=self._thinking_config,
        )
        if system:
            config.system_instruction = system

        response = self._client.models.generate_content(
            model=self._model,
            contents=prompt,
            config=config,
        )
        return response.text or ""


# ── Module-level singleton ────────────────────────────────────────
_instance: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    global _instance
    if _instance is None:
        _instance = GeminiClient()
    return _instance

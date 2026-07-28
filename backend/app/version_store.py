"""
SQLite-backed version store for sessions, resume versions, and chat messages.

Lightweight enough for single-user local use, survives restarts.
For server deployment, this same SQLite approach works fine on a VM —
it's just a file. If you want external persistence later, consider
Supabase (free tier: 500MB), Neon PostgreSQL (free tier), or
Turso (free tier: 8GB edge SQLite). But SQLite on the server is
perfectly fine for a single-user tool.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

from app.config import get_settings
from app.schemas import VersionInfo

logger = logging.getLogger(__name__)

_DB_PATH: str | None = None


def _get_db_path() -> str:
    global _DB_PATH
    if _DB_PATH is None:
        settings = get_settings()
        _DB_PATH = settings.DB_PATH
        Path(_DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    return _DB_PATH


async def init_db() -> None:
    """Create tables if they don't exist."""
    async with aiosqlite.connect(_get_db_path()) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                jd_text TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(id),
                version_num INTEGER NOT NULL,
                tex_content TEXT NOT NULL,
                plaintext TEXT NOT NULL DEFAULT '',
                pdf_bytes BLOB,
                scores_json TEXT,
                change_summary TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                UNIQUE(session_id, version_num)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(id),
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        await db.commit()
    logger.info("Database initialized at %s", _get_db_path())


# ── Session operations ────────────────────────────────────────────

async def create_session(jd_text: str) -> str:
    """Create a new session, return its ID."""
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(_get_db_path()) as db:
        await db.execute(
            "INSERT INTO sessions (id, jd_text, created_at) VALUES (?, ?, ?)",
            (session_id, jd_text, now),
        )
        await db.commit()
    return session_id


async def get_session_jd(session_id: str) -> str | None:
    """Get the JD text for a session."""
    async with aiosqlite.connect(_get_db_path()) as db:
        cursor = await db.execute(
            "SELECT jd_text FROM sessions WHERE id = ?", (session_id,)
        )
        row = await cursor.fetchone()
        return row[0] if row else None


# ── Version operations ────────────────────────────────────────────

async def save_version(
    session_id: str,
    version_num: int,
    tex_content: str,
    plaintext: str = "",
    pdf_bytes: bytes | None = None,
    scores_json: str | None = None,
    change_summary: str = "",
) -> None:
    """Save a new resume version."""
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(_get_db_path()) as db:
        await db.execute(
            """INSERT INTO versions 
               (session_id, version_num, tex_content, plaintext, pdf_bytes, scores_json, change_summary, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (session_id, version_num, tex_content, plaintext, pdf_bytes, scores_json, change_summary, now),
        )
        await db.commit()


async def get_version(session_id: str, version_num: int) -> dict | None:
    """Get a specific version."""
    async with aiosqlite.connect(_get_db_path()) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM versions WHERE session_id = ? AND version_num = ?",
            (session_id, version_num),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_latest_version(session_id: str) -> dict | None:
    """Get the most recent version for a session."""
    async with aiosqlite.connect(_get_db_path()) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM versions WHERE session_id = ? ORDER BY version_num DESC LIMIT 1",
            (session_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_latest_version_num(session_id: str) -> int:
    """Get the latest version number (0 if none)."""
    async with aiosqlite.connect(_get_db_path()) as db:
        cursor = await db.execute(
            "SELECT MAX(version_num) FROM versions WHERE session_id = ?",
            (session_id,),
        )
        row = await cursor.fetchone()
        return row[0] or 0


async def get_version_pdf(session_id: str, version_num: int) -> bytes | None:
    """Get PDF bytes for a specific version."""
    async with aiosqlite.connect(_get_db_path()) as db:
        cursor = await db.execute(
            "SELECT pdf_bytes FROM versions WHERE session_id = ? AND version_num = ?",
            (session_id, version_num),
        )
        row = await cursor.fetchone()
        return row[0] if row else None


async def list_versions(session_id: str) -> list[VersionInfo]:
    """List all versions for a session with metadata."""
    async with aiosqlite.connect(_get_db_path()) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT version_num, scores_json, change_summary, created_at "
            "FROM versions WHERE session_id = ? ORDER BY version_num ASC",
            (session_id,),
        )
        rows = await cursor.fetchall()

    result = []
    for row in rows:
        row = dict(row)
        ats_score = None
        ai_score = None
        if row["scores_json"]:
            try:
                scores = json.loads(row["scores_json"])
                ats_score = scores.get("ats_score", {}).get("total_score")
                ai_score = scores.get("ai_screening_score", {}).get("total_score")
            except (json.JSONDecodeError, AttributeError):
                pass

        result.append(VersionInfo(
            version=row["version_num"],
            ats_score=ats_score,
            ai_score=ai_score,
            change_summary=row["change_summary"] or "",
            created_at=row["created_at"] or "",
        ))
    return result


async def update_version_scores(
    session_id: str, version_num: int, scores_json: str
) -> None:
    """Update scores for an existing version."""
    async with aiosqlite.connect(_get_db_path()) as db:
        await db.execute(
            "UPDATE versions SET scores_json = ? WHERE session_id = ? AND version_num = ?",
            (scores_json, session_id, version_num),
        )
        await db.commit()


async def update_version_pdf(
    session_id: str, version_num: int, pdf_bytes: bytes
) -> None:
    """Update PDF for an existing version."""
    async with aiosqlite.connect(_get_db_path()) as db:
        await db.execute(
            "UPDATE versions SET pdf_bytes = ? WHERE session_id = ? AND version_num = ?",
            (pdf_bytes, session_id, version_num),
        )
        await db.commit()


# ── Message operations ────────────────────────────────────────────

async def save_message(session_id: str, role: str, content: str) -> None:
    """Save a chat message."""
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(_get_db_path()) as db:
        await db.execute(
            "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (session_id, role, content, now),
        )
        await db.commit()


async def get_messages(session_id: str) -> list[dict]:
    """Get all messages for a session in chronological order."""
    async with aiosqlite.connect(_get_db_path()) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY id ASC",
            (session_id,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

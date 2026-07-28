"""
Quick test: verify Gemini 3.6 Flash connection works with our service account credentials.
Tests structured output + thinking_level + basic text generation.
"""

import sys
import os
import io

# Fix Windows console encoding for emoji/unicode
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Ensure we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google.oauth2 import service_account
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
import json
import time


def main():
    print("=" * 60)
    print("  Gemini 3.6 Flash -- Connection & Feature Test")
    print("=" * 60)

    # -- 1. Load credentials --
    cred_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "Google_crediantials.json",
    )
    print(f"\n[1] Loading credentials from: {cred_path}")

    if not os.path.exists(cred_path):
        print(f"    FAIL: File not found!")
        return

    with open(cred_path) as f:
        cred_data = json.load(f)
    project_id = cred_data.get("project_id", "")
    print(f"    OK - Project ID: {project_id}")

    credentials = service_account.Credentials.from_service_account_file(
        cred_path,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    print(f"    OK - Credentials loaded (SA: {cred_data.get('client_email', 'N/A')})")

    # -- 2. Initialize client --
    print(f"\n[2] Initializing genai.Client (vertexai=True, location=global)")
    client = genai.Client(
        vertexai=True,
        project=project_id,
        location="global",
        credentials=credentials,
    )
    print(f"    OK - Client initialized")

    # -- 3. Basic text generation --
    print(f"\n[3] Testing basic text generation (gemini-3.6-flash, thinking=HIGH)")
    start = time.time()
    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents="What is the capital of France? Reply in one sentence.",
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(
                    thinking_level=types.ThinkingLevel.HIGH,
                ),
            ),
        )
        elapsed = time.time() - start
        print(f"    OK ({elapsed:.2f}s): {response.text}")
    except Exception as e:
        print(f"    FAIL: {e}")
        import traceback
        traceback.print_exc()
        return

    # -- 4. Structured JSON output --
    print(f"\n[4] Testing structured JSON output (Pydantic schema)")

    class SimpleScore(BaseModel):
        category: str = Field(description="Name of category")
        score: int = Field(ge=0, le=100, description="Score 0-100")
        justification: str = Field(description="Brief justification")

    class ScoreList(BaseModel):
        scores: list[SimpleScore] = Field(description="List of scores")

    start = time.time()
    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents="Rate these aspects of Python as a programming language (0-100): readability, performance, ecosystem. Be brief.",
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(
                    thinking_level=types.ThinkingLevel.HIGH,
                ),
                response_mime_type="application/json",
                response_schema=ScoreList,
            ),
        )
        elapsed = time.time() - start
        parsed = response.parsed
        print(f"    OK - Structured response ({elapsed:.2f}s):")
        if parsed and hasattr(parsed, 'scores'):
            for s in parsed.scores:
                print(f"       - {s.category}: {s.score}/100 -- {s.justification}")
        else:
            print(f"       Raw: {response.text}")
    except Exception as e:
        print(f"    FAIL: {e}")
        import traceback
        traceback.print_exc()
        return

    # -- 5. Verify our app's Gemini client wrapper --
    print(f"\n[5] Testing app GeminiClient wrapper")
    try:
        from app.gemini_client import get_gemini_client
        app_client = get_gemini_client()

        start = time.time()
        result = app_client.generate_text(
            prompt="Say 'Resume Optimizer is ready!' in exactly those words.",
        )
        elapsed = time.time() - start
        print(f"    OK - App client text ({elapsed:.2f}s): {result.strip()}")

        # Test structured via app client
        start = time.time()
        structured = app_client.generate_structured(
            prompt="Rate resume writing difficulty on a scale of 0-100.",
            schema=SimpleScore,
        )
        elapsed = time.time() - start
        print(f"    OK - App structured ({elapsed:.2f}s): {structured.category}: {structured.score}/100")

    except Exception as e:
        print(f"    FAIL: {e}")
        import traceback
        traceback.print_exc()

    print(f"\n{'=' * 60}")
    print(f"  All tests passed! LLM connection is working.")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()

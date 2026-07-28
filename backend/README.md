# Resume Optimizer v2 — Backend

FastAPI backend for AI-powered resume optimization against job descriptions.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Environment

Set `GOOGLE_CREDENTIALS_PATH` to your service account JSON file path.

# ═══════════════════════════════════════════════════════════════════════════════
# Resume Optimizer v2 — Backend Dockerfile
# Includes Python 3.11 + Tectonic LaTeX Compiler Engine
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

# Install system dependencies & Tectonic LaTeX engine dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    fontconfig \
    libfontconfig1 \
    libgraphite2-3 \
    libharfbuzz0b \
    libicu-dev \
    libssl-dev \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

# Install Tectonic CLI (LaTeX compiler)
RUN curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.tectonic-typesetting.org | sh \
    && mv tectonic /usr/local/bin/tectonic

WORKDIR /app

# Copy requirements & install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose backend port
EXPOSE 8005

# Run FastAPI backend with Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005", "--workers", "2"]

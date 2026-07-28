# ═══════════════════════════════════════════════════════════════════════════════
# Resume Optimizer v2 — Backend Dockerfile
# Includes Python 3.11 + Tectonic LaTeX Compiler Engine (Pre-cached CTAN bundle)
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

# Download official Tectonic binary directly from GitHub Releases
RUN curl -fsSL "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz" | tar -xz -C /usr/local/bin

# Pre-warm Tectonic CTAN cache during docker build so compilation is instant and offline-capable
RUN echo '\\documentclass{article}\\begin{document}Test\\end{document}' > /tmp/test.tex \
    && tectonic -o /tmp /tmp/test.tex \
    && rm -rf /tmp/test*

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

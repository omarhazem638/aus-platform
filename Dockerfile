# ─────────────────────────────────────────────────────────────────────────────
# AUS Backend  —  Production Dockerfile
# Multi-stage build: builder → runtime (minimal image, no dev deps)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# System deps for compiling Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into a virtual env (isolates from system Python)
COPY _aus_backend/requirements.txt ./requirements.txt
RUN python -m venv /venv \
    && /venv/bin/pip install --upgrade pip \
    && /venv/bin/pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

LABEL maintainer="AUS Platform Team"
LABEL version="2.0.0"
LABEL description="AUS AI University Simulator — Backend API"

# Security: run as non-root user
RUN addgroup --system --gid 1001 ausgroup \
    && adduser  --system --uid 1001 --gid 1001 --no-create-home aususer

WORKDIR /app

# Runtime system deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual env from builder
COPY --from=builder /venv /venv

# Copy application code
COPY _aus_backend/ ./

# Create log and data directories owned by app user
RUN mkdir -p logs data \
    && chown -R aususer:ausgroup /app

USER aususer

# Expose port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

# Environment defaults (override in docker-compose or .env)
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    AUS_ENV=production \
    DATABASE_URL=sqlite+aiosqlite:///./data/aus_data.db

# Start with Gunicorn (production) or Uvicorn (dev)
CMD ["/venv/bin/gunicorn", "main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "4", \
     "--bind", "0.0.0.0:8002", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]

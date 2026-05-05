# Hometown Pathway Atlas — backend Cloud Run image
#
# Single-stage python:3.12-slim runtime. Backend is fast-lookup against
# precomputed parquet files baked into the image at build time (data
# total ~1.3MB across all 8 files). No live ETL at runtime.
#
# Day 8 deploy:
#   gcloud run deploy atlas-backend \
#     --source backend/ \
#     --region us-central1 \
#     --allow-unauthenticated \
#     --port 8080 \
#     --set-env-vars="GOOGLE_CLOUD_PROJECT=pathway-atlas-hackathon,FRONTEND_ORIGIN=https://atlas-frontend-xxxxxx-uc.a.run.app"
#
# See docs/cloud_run_deploy.md for the full runbook.

FROM python:3.12-slim

WORKDIR /app

# Install system deps required by pyarrow + pandas wheels on slim base.
# python:3.12-slim is missing libstdc++ symbols some pandas operations
# need on certain CPU paths.
#
# build-essential is REMOVED post-pip-install to drop ~250MB of compiler
# tooling from the runtime layer — only needed during wheel install for
# any source-build fallbacks; runtime never compiles anything.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first for layer caching across source-only changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/*

# Source after deps so dep layer caches across source-only edits.
# Explicit COPY of every dir Vinh's Phase 2 backend uses — schemas/,
# services/, routes/, ingest/ scripts, data/ parquets, plus root-level
# main.py + config.py. .dockerignore (sibling) keeps caches + tests out.
COPY main.py config.py ./
COPY schemas/ ./schemas/
COPY services/ ./services/
COPY routes/ ./routes/
COPY ingest/ ./ingest/
COPY data/ ./data/
COPY prompts/ ./prompts/

# Drop root before runtime — appuser owns /app, runs uvicorn. Cloud Run
# enforces non-root via container security policies anyway, but baking
# the user into the image keeps the contract explicit + portable to
# other K8s/serverless platforms.
RUN useradd --system --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

# Cloud Run injects PORT (default 8080). uvicorn binds to it explicitly
# rather than reading from $PORT inline, so the entrypoint stays
# scriptable for local-dev override.
ENV PORT=8080
# PYTHONUNBUFFERED=1 forces stdout/stderr to flush per-line. Without
# this, uvicorn startup logs + per-request logs buffer in Python's
# default 4KB chunks and Cloud Run reports the container as starting
# slowly (no logs visible) + logs lag in real-time tailing. Caught
# during local docker smoke test 2026-05-03.
ENV PYTHONUNBUFFERED=1
EXPOSE 8080

# --proxy-headers + --forwarded-allow-ips * because Cloud Run terminates
# TLS in front of the container; without these uvicorn logs the wrong
# client IP and CORS origin checks misbehave on https URLs.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]

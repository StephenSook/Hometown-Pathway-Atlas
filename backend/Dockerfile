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
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first for layer caching across source-only changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

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

# Cloud Run injects PORT (default 8080). uvicorn binds to it explicitly
# rather than reading from $PORT inline, so the entrypoint stays
# scriptable for local-dev override.
ENV PORT=8080
EXPOSE 8080

# --proxy-headers + --forwarded-allow-ips * because Cloud Run terminates
# TLS in front of the container; without these uvicorn logs the wrong
# client IP and CORS origin checks misbehave on https URLs.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]

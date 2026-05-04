# Hometown Pathway Atlas — frontend Cloud Run image
#
# Multi-stage:
#   1. builder — node:22-alpine, npm ci, npm run build
#   2. runtime — nginx:alpine serving dist/ on port 8080 (Cloud Run default)
#
# Production deploy: write frontend/.env.production with the backend
# URL BEFORE running `gcloud run deploy --source frontend/ ...`.
# .env.production is NOT gitignored (only `.env` is) so the source
# upload includes it, the Docker build COPY pulls it in, and Vite's
# loadEnv reads it at build time. See docs/cloud_run_deploy.md for
# the full runbook + the .env-precedence trap that bit us 2026-05-04.

# ─────── builder ───────
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps first for layer caching. --legacy-peer-deps is required
# because react-simple-maps@3 + sonner@2 don't list React 19 in their
# peerDependencies even though both work at runtime.
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Source after deps so deps layer caches across source-only changes
COPY . .

# Vite reads VITE_API_BASE_URL at build time. ARG default IS the
# production Cloud Run backend URL — `gcloud run deploy --source
# frontend/` uses the ARG default without extra config, so the
# bundle ships with the right backend URL on every deploy.
#
# Local Docker test: pass --build-arg VITE_API_BASE_URL=http://...
#   to override (e.g. http://localhost:8000 when the backend is
#   running locally on the same Docker network).
# Local `npm run dev`: doesn't use this Dockerfile; api.ts falls
#   back to http://localhost:8000 via import.meta.env.DEV branch.
#
# History: the .env.production approach (write file, gcloud uploads,
# Vite reads) was attempted 2026-05-04 but kept baking localhost:8000.
# Root cause: Vite's loadEnv prioritizes process.env over .env.* files
# for VITE_ prefixed vars (verified in vite/src/node/env.ts loadEnv
# loop), so the ENV statement here silently overrode .env.production
# even when the file was correctly uploaded. ARG default + ENV bridge
# is the simplest reliable path for `--source` deploys, which don't
# support --build-arg without a cloudbuild.yaml. URL is public (linked
# from README + SUBMISSION.md + CLAUDE.md) so hardcoding here is
# acceptable for hackathon scope.
ARG VITE_API_BASE_URL=https://atlas-backend-635524063449.us-central1.run.app
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ─────── runtime ───────
FROM nginx:alpine AS runtime

# nginx config replaces the default conf.d entry — single-server SPA
# config with port 8080, gzip, SPA fallback, and asset caching.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static build output
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

# `daemon off;` keeps nginx in the foreground so Docker/Cloud Run
# consider the container alive.
CMD ["nginx", "-g", "daemon off;"]

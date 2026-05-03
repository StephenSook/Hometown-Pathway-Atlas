# Hometown Pathway Atlas — frontend Cloud Run image
#
# Multi-stage:
#   1. builder — node:22-alpine, npm ci, npm run build
#   2. runtime — nginx:alpine serving dist/ on port 8080 (Cloud Run default)
#
# Day 8 deploy:
#   gcloud run deploy atlas-frontend \
#     --source frontend/ \
#     --region us-central1 \
#     --allow-unauthenticated \
#     --port 8080 \
#     --build-env-vars-file .env.production
#
# See docs/cloud_run_deploy.md for the full runbook.

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

# Vite resolves env vars at build time. Override per environment via
# `--build-arg VITE_API_BASE_URL=https://...`. Default value lets the
# image build standalone for local smoke tests.
ARG VITE_API_BASE_URL=http://localhost:8000
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

# Cloud Run Deploy Runbook

Day 8 PM deploy guide for the Hometown Pathway Atlas frontend.

GCP project: `pathway-atlas-hackathon`
Region: `us-central1` (matches Vinh's backend + Vertex AI region)
Service name: `atlas-frontend`

This runbook is the source of truth for deploy commands. PLAN.md task
5.2 references it. If anything drifts between PLAN.md and this doc,
fix PLAN.md.

---

## Prerequisites

Before deploy day:

- [ ] Vinh's backend deployed to Cloud Run, public URL captured (e.g.
      `https://atlas-backend-xxxxxx-uc.a.run.app`)
- [ ] Backend `/api/region`, `/api/analogs/{fips}`, `/api/pathway/{fips}`
      smoke-tested via curl
- [ ] Backend CORS allow-list includes `https://*.run.app` (will
      narrow to specific frontend URL after first deploy)
- [x] Frontend HomePage swapped from mocks to React Query hooks
      (DONE 2026-05-03 in commit caf789d)
- [x] Sentinel ZIPs `00000` + `11111` kept by design as deliberate
      test paths (00000 = backend 404 toast, 11111 = sparse mock
      escape hatch) — DECIDED 2026-05-03
- [x] `gcloud auth login` valid on the deploy machine (verified
      2026-05-03 — `lilsook2006@gmail.com` token live)
- [x] `gcloud config set project pathway-atlas-hackathon` (verified
      2026-05-03)
- [x] Artifact Registry repo `cloud-run-source-deploy` exists in
      us-central1 (created 2026-05-02)
- [x] Frontend Dockerfile builds locally — `cd frontend && docker
      build -t atlas-frontend-test .` succeeds in ~12s (verified
      2026-05-03)
- [x] Backend Dockerfile builds locally + container smoke-tests
      `/health` + `/api/region` (verified 2026-05-03; PYTHONUNBUFFERED
      fix shipped in commit 88c445f)

---

## Vertex AI IAM — REQUIRED before backend deploy

Vinh task 2.7 ship (commit 7893fa7) wired GeminiService into every
`/api/region` + `/api/analogs/{fips}` call via `enrich_region` +
`enrich_analogs`. Backend `vertexai.init(project, location)` runs
in the Cloud Run lifespan handler (backend/main.py:21). Auth is
Application Default Credentials → on Cloud Run that's the service
account ADC. Without `roles/aiplatform.user` on the SA, `vertexai.init`
succeeds but `model.generate_content()` 403s on first call → backend
silently falls back to `_fallback_region_narrative` /
`_fallback_tradeoff_narrative` (still returns 200 OK, but Gemini
narrative is the static fallback string instead of live AI prose).

Default Cloud Run SA: `PROJECT_NUMBER-compute@developer.gserviceaccount.com`
(visible via `gcloud run services describe atlas-backend
--format='value(spec.template.spec.serviceAccountName)'`).

Grant the role:

```bash
PROJECT_NUMBER=$(gcloud projects describe pathway-atlas-hackathon \
  --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding pathway-atlas-hackathon \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/aiplatform.user"
```

Verify:

```bash
gcloud projects get-iam-policy pathway-atlas-hackathon \
  --flatten="bindings[].members" \
  --filter="bindings.members:${COMPUTE_SA} AND bindings.role:roles/aiplatform.user" \
  --format="value(bindings.role)"
# Expect: roles/aiplatform.user
```

If this is missed, post-deploy smoke against `/api/region` will return
200 but the `narrative` field will read like "Cobb County, GA shows
representation patterns with associations to ... that may correlate
with local athletic development. ..." (the deterministic fallback)
instead of the live Gemini prose. RegionNarrative card still renders
the fallback content cleanly — silent degradation, no UI break.

---

## Deploy sequence

### 1. Verify Vinh's backend URL

```bash
gcloud run services list --region us-central1 --filter 'metadata.name=atlas-backend'
```

Capture the URL — referenced as `BACKEND_URL` below.

### 2. Build + deploy frontend

Vite reads `VITE_API_BASE_URL` at build time. The Dockerfile's `ARG
VITE_API_BASE_URL=...` default is the production Cloud Run backend URL
(`frontend/Dockerfile:41`); `--source` deploys use that ARG default
without any extra config.

```bash
gcloud run deploy atlas-frontend \
  --source frontend/ \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --max-instances 5
```

Notes:
- `--source` triggers Cloud Build automatically — no manual `docker
  build` + push to Artifact Registry needed
- `--memory 256Mi` is plenty for nginx serving static files
- `--max-instances 5` caps cost during the demo; bump to 10 if Cloud
  Run autoscaling matters
- **If the backend URL ever changes** (rare with Cloud Run revisions
  but possible across service deletes), edit the ARG default in
  `frontend/Dockerfile:41` and redeploy. URL is public so hardcoding
  in the Dockerfile doesn't leak anything.
- **DO NOT use `.env.production`** for `--source` deploys. Two failed
  attempts pre-2026-05-04: (a) `--build-env-vars-file` is invalid
  gcloud syntax (Codex 4th-pass), (b) writing `frontend/.env.production`
  + relying on Vite to read it gets BAKED OVER by the Dockerfile's
  `ENV VITE_API_BASE_URL=$VITE_API_BASE_URL` line because Vite's
  loadEnv prioritizes `process.env` over `.env.*` files for `VITE_`-
  prefixed vars (verified in vite/src/node/env.ts loadEnv loop). The
  ARG-default pattern is the only path that works reliably without
  introducing a cloudbuild.yaml.

### 3. Capture frontend URL

```bash
gcloud run services describe atlas-frontend --region us-central1 \
  --format='value(status.url)'
```

Save as `FRONTEND_URL` for steps 4-5.

### 4. Smoke test the deploy

```bash
# Health endpoint defined in nginx.conf
curl -i $FRONTEND_URL/healthz

# SPA shell loads
curl -i $FRONTEND_URL/ | head -20

# SPA fallback works (deep link → index.html)
curl -i $FRONTEND_URL/this-route-does-not-exist | head -20
# Should return 200 + index.html, NOT 404

# gzip headers present
curl -i -H 'Accept-Encoding: gzip' $FRONTEND_URL/ | grep -i content-encoding
# Expect: Content-Encoding: gzip
```

Then open `$FRONTEND_URL` in a browser:
- Type a real ZIP (e.g. 30060)
- Verify Network tab → request goes to `$BACKEND_URL/api/region`
- Expect ~10s for region call + ~15-20s for analogs — full results page
  ~25-30s end-to-end on a cold cache (Gemini in path post-2.7 ship).
  Skeleton holds during the wait.
- Verify RegionNarrative card renders with live Gemini prose between
  RegionHeader and CountyMap. Check that prose mentions both Olympic
  AND Paralympic (parity discipline). If the card is missing entirely,
  either narrative was empty (backend issue) OR frontend safety net
  caught a banned verb (DEV mode console.warn would log it).
- Verify TradeoffPanel "Why these three" reveals live Gemini tradeoff
  prose on click.
- Verify each AnalogCard renders per-analog narrative.
- **ComplianceLog behavior post-2.7:** demoMode auto-flips to FALSE
  when backend populates `compliance_log` (3 parity-check entries).
  Scripted Beat 4 catch+rewrite drama WILL NOT play until Vinh
  task 2.9 (HybridAuditor) ships the dramatic fixed entry. See B5b
  in atlas_layers_pending_vinh.md memory — Path A override is the
  Day 9 morning fallback if 2.9 doesn't ship by then.
- Verify Pillar5Strip renders with the locked Pillar 5 numbers
- Verify no console errors (check Network tab for failed CORS preflights)

### 5. Tighten backend CORS

After first deploy, narrow the backend's CORS allow-list from
`https://*.run.app` to the specific frontend URL:

```bash
# Coordinate with Vinh — backend redeploy needed to update the FastAPI
# CORSMiddleware allow_origins list. The FRONTEND_URL captured in step 3
# is what goes in the allow_origins entry.
```

---

## Backend deploy (Vinh)

Backend Dockerfile shipped 2026-05-03 in commit 55e35b5 with
hardening (USER appuser, build-essential purge, PYTHONUNBUFFERED=1
for Cloud Run logs).

```bash
gcloud run deploy atlas-backend \
  --source backend/ \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 60s \
  --max-instances 5 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=pathway-atlas-hackathon,FRONTEND_ORIGIN=https://atlas-frontend-xxxxxx-uc.a.run.app"
```

Notes:
- `--memory 1Gi` (bumped from 512Mi after 2.7 ship) — Vertex AI client
  adds ~150MB resident on top of pandas + pyarrow + Pydantic + 3
  lru_cached service singletons. 512Mi will OOM under load. 1Gi
  leaves comfortable headroom.
- `--timeout 60s` (default Cloud Run is 300s but explicit is clearer)
  — POST /api/region takes ~10s with Gemini in path; GET /api/analogs
  takes ~15-20s (4 Gemini calls: 1 tradeoff + 3 per-analog narratives).
  Total user-perceived latency for full results page is ~25-30s on a
  cold cache. Default 300s timeout covers it; explicit 60s catches
  Gemini latency regressions early.
- `FRONTEND_ORIGIN` runtime env feeds backend CORSMiddleware
  allow_origins list (see backend/main.py:36 + config.py)
- Update `FRONTEND_ORIGIN` after frontend deploy captures real URL,
  then redeploy backend to apply the narrowed CORS

Smoke test post-deploy:
```bash
BACKEND_URL=$(gcloud run services describe atlas-backend \
  --region us-central1 --format='value(status.url)')

# /health is instant (no Gemini)
curl -i --max-time 5 $BACKEND_URL/health

# /api/region hits Vertex AI — expect ~10s. --max-time 30 covers
# cold-start container init + Gemini round-trip.
curl -i --max-time 30 -X POST $BACKEND_URL/api/region \
  -H "Content-Type: application/json" \
  -d '{"zip":"30060"}'

# /api/analogs/{fips} hits Vertex AI 4x — expect ~15-20s.
# --max-time 60 with safety margin.
curl -i --max-time 60 $BACKEND_URL/api/analogs/13067

# /api/pathway/{fips} is deterministic, no Gemini — fast.
curl -i --max-time 5 $BACKEND_URL/api/pathway/13067
```

All four should return 200 + valid JSON. **Verify the `narrative`
field in /api/region response is live Gemini prose, NOT the fallback**
("Cobb County, GA shows representation patterns with associations to
... that may correlate with local athletic development." is the
fallback signature — if you see it, Vertex AI IAM is misconfigured;
go back to the IAM section above).

Local Docker container smoke test 2026-05-03 verified the deterministic
paths against the backend image (pre-2.7); post-2.7 latency profile
above is from local uvicorn smoke 2026-05-04 (region call: 10.9s
against live Vertex AI).

**Backend cold-start: 15-20s.** Python import + Vertex AI init +
parquet load all happen before first request. Set `--min-instances 1`
during demo recording window OR accept the first-request delay.

---

## Rollback

If a deploy goes wrong:

```bash
# List recent revisions
gcloud run revisions list --service atlas-frontend --region us-central1 \
  --limit 5

# Roll back to previous revision (e.g. atlas-frontend-00002-abc)
gcloud run services update-traffic atlas-frontend \
  --region us-central1 \
  --to-revisions atlas-frontend-00002-abc=100
```

---

## Backend URL changed mid-flight

If Vinh redeploys backend and the URL changes (rare with Cloud Run
revisions but possible across service deletes), the frontend's baked
`VITE_API_BASE_URL` is stale.

Two options:

**A. Redeploy frontend (recommended):**
Repeat step 2 with the new `BACKEND_URL`. ~3 min for Cloud Build
round-trip.

**B. Runtime env injection (advanced):**
Add an entrypoint script that runs `envsubst` on a `config.js` template
served before bundle execution. Pattern:

1. Add `frontend/public/config.js.tpl` with `window.__CONFIG__ = { apiBaseUrl: "${VITE_API_BASE_URL}" };`
2. Modify nginx.conf entrypoint to substitute at container start
3. Update `lib/api.ts` to read `window.__CONFIG__?.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL`

Skip this for hackathon unless backend churn is frequent. Redeploy is
simpler.

---

## Troubleshooting

### "Container failed to start" on first deploy

Check logs:
```bash
gcloud run services logs read atlas-frontend --region us-central1 --limit 50
```

Common causes:
- `nginx.conf` syntax error → fix locally, rebuild
- Wrong port (Cloud Run injects $PORT, default 8080; nginx must listen
  on that port — already configured in nginx.conf)
- Image too large / build timeout → check `--cpu` flag

### "CORS error" in browser console

Frontend hitting backend gets blocked. Verify:
- Backend `CORSMiddleware` allow_origins includes the frontend URL
- Backend allows the methods being used (POST for `/api/region`)
- Backend handles OPTIONS preflight (FastAPI's CORSMiddleware does
  this automatically when configured)

### Cold-start delay during demo

Cloud Run scales to zero by default. First request after idle period
takes ~3-5s to cold-start the container. For demo:

```bash
# Set min-instances to 1 so a warm container is always ready
gcloud run services update atlas-frontend \
  --region us-central1 \
  --min-instances 1
```

Cost: roughly $5-10/day for one warm instance — acceptable for the
demo recording window. **Set min-instances back to 0 after demo to
avoid ongoing cost.**

### Image pull failures

If the deploy hangs at "Pulling image":
```bash
# Re-run the deploy from scratch — Cloud Build occasionally throws
# transient errors and re-running cleans the cache
gcloud run deploy atlas-frontend --source frontend/ --region us-central1 \
  --allow-unauthenticated --port 8080
```

---

## Post-deploy URLs

Capture both URLs in PLAN.md once deploy completes:

```
Frontend Cloud Run: https://atlas-frontend-xxxxxx-uc.a.run.app
Backend Cloud Run:  https://atlas-backend-xxxxxx-uc.a.run.app
```

Pin the frontend URL in CLAUDE.md so future Claude Code sessions know
where the live app lives.

---

## Local Docker test (any time)

To verify the Dockerfile + nginx config without deploying:

```bash
cd frontend

# Build (uses default localhost:8000 backend URL — change via --build-arg
# if testing against a real backend)
docker build -t atlas-fe-local .

# Or with a specific backend URL baked in:
docker build --build-arg VITE_API_BASE_URL=http://host.docker.internal:8000 \
  -t atlas-fe-local .

# Run
docker run --rm -p 8080:8080 atlas-fe-local

# Open http://localhost:8080 — SPA should load, Pillar5Strip should
# show the locked numbers, sentinel ZIP 00000 should fire toast.
```

Stop with Ctrl-C.

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

## Deploy sequence

### 1. Verify Vinh's backend URL

```bash
gcloud run services list --region us-central1 --filter 'metadata.name=atlas-backend'
```

Capture the URL — referenced as `BACKEND_URL` below.

### 2. Build + deploy frontend

Vite reads `VITE_API_BASE_URL` at build time from `.env.production`
(or process env). For Cloud Run `--source` deploy, the cleanest path
is to write a temporary `.env.production` file before deploy + clean
up after. This avoids cloudbuild.yaml + --build-arg complexity and
works with the existing Dockerfile as-is.

```bash
# Write the production backend URL into Vite's .env.production so
# the value is baked into the JS bundle during npm run build (which
# Cloud Build runs inside frontend/Dockerfile's builder stage).
echo "VITE_API_BASE_URL=$BACKEND_URL" > frontend/.env.production

gcloud run deploy atlas-frontend \
  --source frontend/ \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --max-instances 5

# Clean up — don't leave a baked production URL in your local tree.
rm frontend/.env.production
```

Notes:
- `--source` triggers Cloud Build automatically — no manual `docker
  build` + push to Artifact Registry needed
- `--memory 256Mi` is plenty for nginx serving static files
- `--max-instances 5` caps cost during the demo; bump to 10 if Cloud
  Run autoscaling matters
- `.env.production` is gitignored by Vite default + already in
  Stephen's `.gitignore`; safe to write/delete locally
- The earlier `--build-env-vars-file=-` heredoc pattern was invalid
  gcloud syntax (caught Codex 4th-pass 2026-05-03) — that flag
  expects a YAML file path, not stdin. The .env approach above is
  verified working with current gcloud SDK 566.0.0.

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
- Verify ComplianceLog ★ demo sequence plays (Pillar 4 demo moment
  intact post-deploy — `demoMode={true}` set in HomePage.tsx)
- Verify Pillar5Strip renders with corrected Pillar 5 numbers
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
  --memory 512Mi \
  --max-instances 5 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=pathway-atlas-hackathon,FRONTEND_ORIGIN=https://atlas-frontend-xxxxxx-uc.a.run.app"
```

Notes:
- `--memory 512Mi` for backend — pandas + pyarrow + Vertex AI client
  sit ~150-200MB resident, leaves headroom
- `FRONTEND_ORIGIN` runtime env feeds backend CORSMiddleware
  allow_origins list (see backend/main.py:36 + config.py)
- Update `FRONTEND_ORIGIN` after frontend deploy captures real URL,
  then redeploy backend to apply the narrowed CORS

Smoke test post-deploy:
```bash
BACKEND_URL=$(gcloud run services describe atlas-backend \
  --region us-central1 --format='value(status.url)')

curl -i $BACKEND_URL/health
curl -i -X POST $BACKEND_URL/api/region \
  -H "Content-Type: application/json" \
  -d '{"zip":"30060"}'
curl -i $BACKEND_URL/api/analogs/13067
curl -i $BACKEND_URL/api/pathway/13067
```

All four should return 200 + valid JSON. Local Docker container
smoke test 2026-05-03 already verified the same paths against the
backend image; Cloud Run deploy should just inherit that.

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

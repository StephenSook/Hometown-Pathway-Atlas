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
- [ ] Frontend HomePage swapped from mocks to React Query hooks (see
      task 3.12 5-step integration comment in HomePage.tsx)
- [ ] Sentinel ZIP `00000` removed from frontend before production
      deploy (or kept as a deliberate test path — decide before deploy)
- [ ] `gcloud auth login` valid on the deploy machine
- [ ] `gcloud config set project pathway-atlas-hackathon`

---

## Deploy sequence

### 1. Verify Vinh's backend URL

```bash
gcloud run services list --region us-central1 --filter 'metadata.name=atlas-backend'
```

Capture the URL — referenced as `BACKEND_URL` below.

### 2. Build + deploy frontend

Single command (Cloud Build picks up `frontend/Dockerfile` + uses
`--source` to upload the build context):

```bash
gcloud run deploy atlas-frontend \
  --source frontend/ \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --max-instances 5 \
  --build-env-vars-file=- <<EOF
VITE_API_BASE_URL=$BACKEND_URL
EOF
```

Notes:
- `--source` triggers Cloud Build automatically — no manual `docker
  build` + push to Artifact Registry needed
- `--memory 256Mi` is plenty for nginx serving static files
- `--max-instances 5` caps cost during the demo; bump to 10 if Cloud
  Run autoscaling matters
- `--build-env-vars-file=-` reads from stdin (the heredoc) so the
  backend URL gets baked into the Vite bundle

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

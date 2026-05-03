# Hometown Pathway Atlas — Plan & Coordination

> Living working doc for **Stephen Sookra** (frontend + pitch + project architect) and **Vinh Le** (backend + data + AI). Updated on every task status change and pushed to `main`. Authoritative over the docx specs when they disagree.

**Hackathon:** Team USA × Google Cloud Hackathon — Challenge 2 (Hometown Success Engine)
**Submission deadline:** May 11, 2026 — 5:00 PM PT
**Today:** May 2, 2026 — Day 2
**Repo:** https://github.com/StephenSook/Hometown-Pathway-Atlas
**Strategy:** Maximum Scope — playing for both Challenge 2 Winner ($8K) AND Grand Prize ($15K). Conservative ships first, ambitious layers stack on top, each independently cuttable.

---

## ⏱️ Status snapshot (last sync 2026-05-03 PM Day 3)

The detailed Phase 0–5 task tables below remain the historical record.
This snapshot is the at-a-glance reality check for anyone reading
PLAN.md fresh.

**Phase 0 — Setup:** ✓ DONE (repo, GCP, hello-gemini Cloud Run smoke).

**Phase 1 — Data ingest pipeline (Vinh):** ✓ DONE (tasks 1.7–1.10 in
commit `fc0253a`). Outstanding: task **1.11** Layer A shocking-stat
hunt — gates HeroStat real number swap + Layer D scrollytelling.

**Phase 2 — Backend services (Vinh):** ✓ MOSTLY DONE (tasks 2.2–2.6
in commits `8a36c91`, `cac8540`, `ecbb9b8`, `a617346`). Pydantic
schemas + ProfileService + AnalogService + PathwayService + 4 routes
live. Outstanding: task **2.7** GeminiService → unblocks RegionQA
real backend; task **2.9** HybridAuditor → ComplianceLog auto-flips
to live mode (frontend ready, demoMode prop is data-aware).

**Phase 3 — Frontend conservative (Stephen):** ✓ DONE. All
components shipped + wired against real Phase 2 backend. End-to-end
smoke verified 30060 / 00000 / 11111 sentinels.

**Phase 4 — Maximum Scope ambitious layers:**
- Layer A — PENDING Vinh task 1.11
- Layer B — ✓ SHIPPED 2026-05-03 PM (SourceTooltip system + favicon
  + OG image + per-FIPS title + deep-link URLs + tour CTA + replay
  button + sparse-state demo + Pillar5Defense + sound-design recipe
  + counter-up animation + Footer + SectionNav)
- Layer C — ✓ SHIPPED VIA STUB 2026-05-03 PM (RegionQA panel +
  loading skeleton; one-line swap to live Gemini when 2.7 ships)
- Layer D — PENDING (depends on Layer A)
- Layer E — CUT 2026-05-02 (re-architects similarity matrix)
- Layer F — CUT 2026-05-03 (RegionQA Layer C covers reasoning
  surface differently; avoid splitting judge attention)

**Phase 5 — Deploy + demo + submit:** PENDING. Backend Dockerfile
shipped 2026-05-03 PM (`55e35b5`) so Cloud Run deploy is unblocked.
Demo recording + Devpost submission Day 9–10. NotebookLM oracle pass
+ pitch dry-run (`./scripts/pitch-stopwatch.sh`) still on Stephen's
plate.

**Critical-path Vinh deps still open:**
1. Task 1.11 — Layer A stat → A1 + A2
2. Task 2.7 — GeminiService → RegionQA real backend +
   `RegionResponse.narrative` populating
3. Task 2.8 — Gemini Live multimodal → optional RegionQA upgrade
4. Task 2.9 — HybridAuditor → ComplianceLog auto-flips
5. `data_confidence` flag per FIPS → CountyMap hatch wires up
6. Backend Cloud Run deploy

**Critical-path Stephen ops still open:**
1. Pitch dry-run with `./scripts/pitch-stopwatch.sh`
2. Cloud Run frontend deploy (backend Dockerfile ready)
3. NotebookLM oracle pre-pitch pass (`docs/notebooklm_oracle_prompts.md`)
4. Demo recording (Day 9 — `docs/sound_design.md` + `docs/demo_storyboard.md`)
5. Devpost submission form fill (Day 10/11 from `SUBMISSION.md`)

---

## 🌅 Vinh — read this first when you wake up (2026-05-02 morning)

**End-of-day 2026-05-01 status:**
Stephen completed full design lock today. Repo now contains:
- `DESIGN_SYSTEM.md` — 15-section visual identity spec, 17 components with anatomy + states + motion + accessibility + build order
- `docs/moodboard/01-07.png` — 7 visual mockups (component targets)
- `REFERENCE_FINDINGS.md` — research input that drove design decisions
- `PLAN.md`, `CLAUDE.md`, `STEPHEN_FRONTEND_STRATEGY.md` updated to reference DESIGN_SYSTEM.md

### Decisions affecting backend contracts (read before contract review)

1. ComplianceLog `status` enum locked at `pass | fail | fixed` (lowercase) — NOT `PASS/FAIL/SUCCESS`
2. ComplianceLog `ts` locked at ISO8601 format (`2026-05-11T14:02:11Z`)
3. Pattern Gap categories locked at `observed_strength | public_access_signal | opportunity_hypothesis`
4. ParityPanel evidence pill values locked at `high | medium | low` (per pillar — `olympic_evidence` and `paralympic_evidence` are SEPARATE fields, never collapsed)
5. CountyMap hover tooltips need a new endpoint OR static parquet (your call) — see action item 3 below

### Your action items in order (~2.5hr total before backend code)

> **Note:** "Day 1 EOD deadline" in task 0.9 is now a "first thing 2026-05-02 AM" deadline since you're reading this Day 2 morning. Same urgency, different label.

1. **(15 min)** Read `DESIGN_SYSTEM.md` §13 "Note for Vinh" — full contract checklist
2. **(15 min)** Update PLAN.md task **0.9** confirming OR escalating ALL of these from §13.1 + §13.2:
   - **§13.1 confirm 5 contracts match:**
     - `county_profiles.parquet` `*_evidence` column = `"high" | "medium" | "low"`
     - `/api/pathway/{fips}` `category` enum = `"observed_strength" | "public_access_signal" | "opportunity_hypothesis"`
     - `/api/region` `compliance_log[].status` = `"pass" | "fail" | "fixed"` (lowercase)
     - `/api/region` `compliance_log[].ts` = ISO8601
     - `/api/region` `compliance_log[].layer` = `"rules" | "gemini"`
   - **§13.2 decide ONE of these for CountyMap hover tooltips:**
     - Option A: add new `/api/stats/county/{fips}` lightweight endpoint returning `{fips, county_name, olympic_per_100k, paralympic_per_100k, olympic_evidence, paralympic_evidence}`
     - Option B: bake static county profile parquet into frontend container (no new endpoint needed)
   - **NEW (Stephen, 2026-05-02):** `AnalogEntry` and `RegionResponse` should expose a `centroid: [number, number]` (lng, lat) field so the CountyMap can place pins + arcs without a hardcoded lookup. Currently `frontend/src/components/CountyMap.tsx` falls back to `KNOWN_CENTROIDS` for the four mock FIPSes; non-Cobb sources will silently render no pins until backend fills this in. Cheap to compute server-side from the `county_profiles.parquet` shapefile.
3. **(2 hr)** GCP setup with Stephen — tasks **0.5, 0.6, 0.7**. Hello-world Cloud Run deploy is most important 30 min of the build. Coordinate timing — see contact path below.
4. **(start)** Begin Phase 1 — task **1.1** athlete data scrape. Critical path. Day 2 EOD = GO/NO-GO validation gate.

### What Stephen has done + planned next work (parallel to yours, don't overlap)

- ✅ DESIGN_SYSTEM.md, REFERENCE_FINDINGS.md, moodboard, repo coordination — done 2026-05-01
- ⬜ Next: `frontend/` scaffold (Vite+React+TS+Tailwind) per DESIGN_SYSTEM §15 build order
- ⬜ Then: ZipInput + Navbar (Day 2 PM per DESIGN_SYSTEM §15 — RegionHeader is Day 3 AM, not Day 2)
- ⬜ Day 4 PM: integrate against your real `/api/region` endpoint

### Contact path (no Slack/Discord set up — use these in order)

1. **Real-time:** chat platform you and Stephen have been using (text/iMessage/Discord DM)
2. **Async, attached to file:** add a `🟡 NEEDS-INPUT` row in PLAN.md with your question — Stephen will see on next pull
3. **Issue tracking:** open a GitHub issue at https://github.com/StephenSook/Hometown-Pathway-Atlas/issues if it's a structured question

Stephen's response window: morning hours fastest, evening within ~2hr. Don't wait silently — escalate within 1hr if blocked.

### Coordination protocol reminder

- Edit `PLAN.md` to claim 🟡, complete ✅, block ⛔, cut ✂️
- Single-file commit per status change
- 4-hour stale lock TTL
- ⚠️ CONTRACT prefix on commits that change Shared Contracts (see PLAN.md §Coordination Protocol below)

---

## Sources of truth (priority order)

1. **CLAUDE.md** — persistent context Claude Code reads every turn. Locked decisions live here. If anything in this PLAN.md drifts from CLAUDE.md, fix PLAN.md.
2. **`docs/01_architecture_spec.docx`** — full system design. Master reference for schemas, API contracts, prompt templates, build sequence.
3. **`docs/04_maximum_scope_addendum.docx`** — extends architecture spec with Layers A–F + cut triggers. Read AFTER the architecture spec.
4. **This file (`PLAN.md`)** — authoritative for task ownership, status, decisions, contracts.
5. **`docs/02_vinh_handoff.docx`** — operational guide for Vinh's Days 1–3.
6. **`docs/03_demo_outline.docx`** — 6-scene demo storyboard. Final script written Day 9.
7. **`README.md`** — public-facing pitch. Written Day 9. Don't mirror this plan into it.

---

## Status dashboard

Legend: ✅ done · 🟡 in progress · ⬜ not started · ⛔ blocked · ✂️ cut

**Bold owner = currently active on the task. Plain owner = assigned but not started.**

### Phase 0 — Setup (Day 1, both)

| # | Component | File(s) | Owner | Status | Notes |
|---|---|---|---|---|---|
| 0.1 | GitHub repo + Apache-2.0 LICENSE | repo root | Stephen | ✅ | Created. Apache-2.0 detected in About section. |
| 0.2 | Local clone of repo | local | Stephen | ✅ | `git clone https://github.com/StephenSook/Hometown-Pathway-Atlas` — cloned May 1. |
| 0.3 | Drop CLAUDE.md + docs/ into repo | repo root, docs/ | Stephen | ✅ | Done May 1 init commit. |
| 0.4 | Drop PLAN.md + STATUS_TEMPLATE + STEPHEN_FRONTEND_STRATEGY | repo root | Stephen | ✅ | Done May 1 init commit. Coordination is manual (mirrors Trace) — no hooks, no CLI. |
| 0.5 | GCP project + APIs enabled | — | Stephen+Vinh | ✅ | Project `pathway-atlas-hackathon` live. 5 APIs enabled (run, aiplatform, cloudbuild, artifactregistry, secretmanager). Verified May 2 via `gcloud services list`. |
| 0.6 | gcloud CLI installed + authed | local | Stephen+Vinh | ✅ | Both laptops authed May 2. ADC set up for Vertex AI calls. Vinh granted `roles/editor` + `roles/run.admin` (run.admin needed for Cloud Run IAM management — `roles/editor` excludes `run.services.setIamPolicy`). |
| 0.7 | Hello-world Cloud Run deploy | `hello-gemini/` | Vinh | ✅ | Live + public at https://hello-gemini-635524063449.us-central1.run.app/ — returns `{"message":"Welcome, and we're thrilled to share our hack!"}` from Gemini call. End-to-end Vertex AI + Cloud Run verified May 2. |
| 0.8 | Lock design system + moodboard | `DESIGN_SYSTEM.md`, `docs/moodboard/` | Stephen | ✅ | Done May 1. 7 visual mockups + 15-section design spec (17 components). |
| 0.9 | Vinh contract review of DESIGN_SYSTEM.md §13 | reads `DESIGN_SYSTEM.md` | Vinh | ✅ | Confirmed 2026-05-02 (Discord). All 5 §13.1 contracts match planned aggregation in 1.8. §13.2 endpoint `/api/stats/county/{fips}` will land in task 2.6 (one-liner read of `county_profiles.parquet`). §13.2.1 `centroid: [lng, lat]` will be baked into `county_profiles.parquet` during task 1.8 aggregation via Census FIPS→centroid lookup — free at runtime. |

### Phase 1 — Data ingest pipeline (Days 1–3, Vinh)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 1.1 | 2024 athlete scrape | `backend/ingest/01_athletes.py` | Vinh | ✅ | — | Done 2026-05-02. USOPC Excel (Olympic) + teamusa.com API (Paralympic). 610 Olympic + 225 Paralympic = 835 total. 99.4% hometown coverage. 5 missing (<5% drop threshold). |
| 1.2 | GNIS city→FIPS geocoder | `backend/ingest/02_geocode.py` | Vinh | ✅ | 1.1 | Done 2026-05-02. 809/835 rows resolved (96.9%). 26 unresolved rows dropped (<5% threshold). Output: `athletes_2024_geocoded.parquet`. |
| 1.3 | nClimGrid-Daily county climate | `backend/ingest/04_climate.py` | Vinh | ✅ | — | Done May 2. 5km gridded, NOT station-weighted. 7 zones classified. Fallback path tested — 350 counties, 0 nulls, 0 invalid zones. Swap in real nclimgrid_county_normals.csv before Day 6 gate. |
| 1.4 | ACS 5-year population | `backend/ingest/05_population.py` | Vinh | ✅ | — | Done 2026-05-02. Census ACS 5-year API. 3,222 counties, 0% missing. Saved to `county_population.parquet`. |
| 1.5 | HUD ZIP-County crosswalk | `backend/ingest/03_zip_crosswalk.py` | Vinh | ✅ | — | Done 2026-05-02. Max RES_RATIO tiebreak, tot_ratio fallback for PO-box ZIPs. All helpers unit-tested. Requires HUD CSV download before first run (see script header). |
| 1.6 | Day 2 validation test | `backend/ingest/validate.py` | Vinh+Stephen | ✅ | 1.1–1.5 | **GO/NO-GO checkpoint EOD Day 2.** 8/8 automated checks PASS. VERDICT: GO. 809 geocoded rows, 96.9% FIPS coverage, 350 unique counties, NIL compliant, no geocode collapse. Proceed to 1.7. |
| 1.7 | 2016–2024 full athlete scrape | `backend/ingest/01_athletes.py` | Vinh | ✅ | 1.6 | Done 2026-05-03. 2476 rows across 2016–2024 (Olympic + Paralympic). Geocoded via 02_geocode.py → `athletes_allgames_geocoded.parquet`. |
| 1.8 | County profiles aggregation | `backend/ingest/07_aggregate.py` | Vinh | ✅ | 1.7, 1.3, 1.4 | Done 2026-05-03 (re-run with allgames). 3222 county profiles. 555 athlete counties (was 350 on 2024-only). Olympic total 2024, Paralympic 452. Centroids 100% coverage. Output `county_profiles.parquet`. |
| 1.9 | Similarity matrix precompute | `backend/ingest/08_similarity.py` | Vinh | ✅ | 1.8 | Done 2026-05-03 (re-run with allgames). 555 athlete counties × 50 top analogs = 27,750 rows. Athlete 40 / sport mix 35 / climate 25. Validation passed. Output `similarity_matrix.parquet`. |
| 1.10 | Move United chapter scrape | `backend/ingest/06_move_united.py` | Vinh | ✅ | 1.5 | Done 2026-05-03. 260 chapters scraped from SSR listing page, 46 states. Nominatim geocoded (260/260, 100%). Haversine 50mi radius: 1154/3222 counties with >=1 chapter. Confidence: high=321 / medium=833 / none=2068. Patched county_profiles.parquet. Display-only. **NOT in similarity matching.** |
| 1.11 | **Layer A — Shocking stat hunt** | `backend/ingest/09_stat_hunt.py` | **Vinh** | ⬜ | 1.8 | Day 3 EOD ~2hr. 4 hypothesis classes. Pick 1-2 strongest by emotional resonance. Ship to Stephen for pitch. |

### Phase 2 — Backend services (Days 4–6, Vinh)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 2.1 | FastAPI scaffold + config | `backend/main.py`, `backend/config.py` | Vinh | ✅ | 0.7 | Done 2026-05-03. CORS for localhost:5173. Vertex AI init on lifespan startup. `/health` returns 200. `pydantic-settings` added to requirements.txt. |
| 2.2 | Pydantic schemas | `backend/schemas/{region,analog,pathway}.py` | Vinh | ✅ | — | Done 2026-05-03. ZipRequest, RegionResponse, AnalogsResponse, PathwayResponse + all sub-models. centroid field on RegionResponse + AnalogEntry (task 0.9 contract). |
| 2.3 | ProfileService | `backend/services/profile_service.py` | Vinh | ✅ | 1.8, 2.2 | Done 2026-05-03. ZIP→FIPS via crosswalk. Returns full RegionResponse from county_profiles.parquet. Singleton via lru_cache. ZipNotFoundError + ProfileNotFoundError. |
| 2.4 | AnalogService | `backend/services/analog_service.py` | Vinh | ✅ | 1.9, 2.2 | Done 2026-05-03. Top 3 from similarity matrix with D10 MSA diversity (≥2 MSAs). Candidate pool=20, diversity-first then fallback. |
| 2.5 | PathwayService | `backend/services/pathway_service.py` | Vinh | ✅ | 1.8, 2.2 | Done 2026-05-03. All 3 gap categories: observed_strength (dominant percentile track), public_access_signal (Move United chapters, display-only per D2), opportunity_hypothesis (weaker track vs climate peers). Conditional phrasing enforced. |
| 2.6 | Routes — `/api/region`, `/api/analogs/{fips}`, `/api/pathway/{fips}` | `backend/routes/*.py` | Vinh | ⬜ | 2.3, 2.4, 2.5 | Day 4 PM. **+ add `/api/stats/county/{fips}` returning `{fips, county_name, olympic_per_100k, paralympic_per_100k, olympic_evidence, paralympic_evidence}` for CountyMap hover tooltips (task 0.9 contract).** |
| 2.7 | GeminiService — region narrative | `backend/services/gemini_service.py` | Vinh | ⬜ | 2.3 | Day 5 AM. Vertex AI structured output schema. Region narrative + analog tradeoff + pattern gap prompts. |
| 2.8 | GeminiService — test 5 sample counties | `backend/tests/test_gemini.py` | Vinh | ⬜ | 2.7 | Day 5 PM. Verify structured JSON output reliable. |
| 2.9 | HybridAuditor — deterministic layer | `backend/services/auditor.py` | Vinh | ⬜ | 2.7 | Day 6 AM. Regex for banned phrases, name detection, parity mention check, schema validation. |
| 2.10 | HybridAuditor — Gemini semantic layer | `backend/services/auditor.py` | Vinh | ⬜ | 2.9 | Day 6 PM. Causal-tone classifier. Rewrite loop. Compliance log emission. |
| 2.11 | Caching layer | `backend/services/cache.py` | Vinh | ⬜ | 2.7 | Day 6 PM. FIPS-keyed deterministic cache for narratives. Don't recall Gemini for same county. |

### Phase 3 — Frontend conservative (Days 1–6, Stephen)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 3.1 | Vite+React+TS+Tailwind scaffold | `frontend/` | Stephen | ✅ | 0.2 | Day 1 PM. Vite 8 + React 19 + TS strict + Tailwind v3. |
| 3.2 | Visual design tokens (Tailwind config) | `frontend/tailwind.config.ts`, `src/index.css` | Stephen | ✅ | 3.1 | Atlas Editorial palette + type scale + shadows + Inter/Instrument Serif/JetBrains Mono per DESIGN_SYSTEM §1. |
| 3.3 | Component library installed | `package.json` | Stephen | ✅ | 3.1 | Framer Motion + react-simple-maps + Recharts + React Query + Lucide + sonner + tailwind-merge + cva + topojson-client + us-atlas + prop-types. |
| 3.4 | Wireframes for key screens | `docs/wireframes/` (skipped) | Stephen | ✂️ | — | Superseded by `docs/moodboard/01-07.png`. Wireframes not needed — moodboard images + DESIGN_SYSTEM.md §4 component anatomy are the visual brief. |
| 3.5 | ZipInput + landing page | `frontend/src/pages/HomePage.tsx`, `components/ZipInput.tsx` | Stephen | ✅ | 3.2 | Day 2 AM. Hero + state machine to results view. |
| 3.6 | RegionHeader + ParityPanel | `frontend/src/components/{RegionHeader,ParityPanel}.tsx` | Stephen | ✅ | 3.2 | Day 2 PM. EvidenceLabel + 5-segment percentile bars + skeleton + empty variants. Both headers navy. |
| 3.7 | Mock API responses | `frontend/src/lib/mocks.ts` | Stephen | ✅ | 2.2 | Day 2. Cobb GA + 3 NC/KY analogs. Conditional phrasing locked. |
| 3.8 | AnalogList + AnalogCard + SimilarityBreakdown | `frontend/src/components/{AnalogList,AnalogCard,SimilarityBreakdown}.tsx` | Stephen | ✅ | 3.6 | Day 3. Card-link pattern with ::before overlay. useId for headings. Tradeoff panel + SportMix + ClimateBadge + AdaptiveAccessCard also shipped. |
| 3.9 | CountyMap + CountyTooltip (choropleth) | `frontend/src/components/{CountyMap,CountyTooltip}.tsx` | Stephen | ✅ | 3.3 | Day 5 AM. react-simple-maps@3 + us-atlas counties-10m. Bezier arcs source→analog with arrowhead marker. Source label callout. Tab-reachable highlighted counties + viewport-clamped tooltip. **Resolved risk:** prop-types added as direct dep — build green, runtime smoke tested zero console errors. **Followup contract:** AnalogEntry needs a `centroid` field (added to task 0.9 review). **Post-ship cold-check fix wave (commits bb4b27d / 613b034 / 14e1831):** dropped invalid role="img" on figure (W3C ACT-Rules 307n5z presentational-children regression), added keyboard focus ring on Tab-reachable counties (WCAG 2.4.7), hedged 3 user-visible strings (CLAUDE.md conditional phrasing), memoized Geography style objects (3000+ rerender perf fix), wrapped ComposableMap with onMouseLeave (figure padding gap), added visible "limited data" chip when KNOWN_CENTROIDS coverage incomplete (Day 4 silent-failure fix), removed dead BezierArc null guard + 4px hover-dedupe theater + role="tooltip" without aria-describedby trigger pairing, changed marker orient to `auto`. CountyTooltip gained visibility:hidden until first measure (React 19 concurrent paint flash guard). |
| 3.10 | PatternGapPanel + GapCard | `frontend/src/components/{PatternGapPanel,GapCard}.tsx` | Stephen | ✅ | 3.6 | Day 5 PM. Three categories with tri-color CategoryBadge (teal/amber/navy-tint per §4.15). Heterogeneous evidence renderer (framing-only branch + metric/value/percentile/data_caveat dl branch). Mobile-first grid: stacks on small, 3-col from md+ per §3 spec. EvidenceLabel default text "evidence: high" matches sibling vocabulary. Cold-check round 1 caught 7 issues fixed pre-commit. **Cold-check round 2 (commits 5d6696c + 29c7be7) caught 8 more:** EvidenceBlock null-guard (CRIT — would crash panel on null evidence), CategoryBadge defensive lookup (CRIT — would crash on enum drift), EvidenceRow visible "unavailable" placeholder (HIGH — was silent null-drop), causal-verb dev badge defense-in-depth (HIGH), humanizeKey camelCase support (HIGH), empty-evidence placeholder (MED), Skeleton landmark parity (MED), JSDoc a11y comment correction (LOW). |
| 3.11 | ComplianceLog ★ + LogEntry | `frontend/src/components/{ComplianceLog,LogEntry}.tsx` | Stephen | ✅ | 3.6 | Day 6 AM. Pillar 4 demo moment. Fixed right sidebar (z-30) desktop, FAB-toggled bottom drawer mobile per §3 spec. Two columns RULES + GEMINI. demoMode prop forces canonical fail→fixed sequence; production guard limits to dev + localhost/127.0.0.1 only (Cloud Run `*.run.app` excluded). Pass entries auto-collapse 1.5s. Fail→fixed dedupe by (layer, check) + stable key gives in-place crossfade via Framer color transitions + sr-only role=status announcer for AT (the Pillar 4 demo moment is now AT-accessible). Cold-check round 1 caught 12 issues fixed pre-commit. **Cold-check round 2 (commits 4138e2f + 1a1ce18) caught 13 more — 2 CRITICAL (onCollapse closure killed live-mode auto-collapse, fail→fixed silent to AT) + 5 HIGH (mobile drawer desktop class collision, entries=null crash, aria-expanded resize sync, back-to-home orphan FAIL with cancelled-flag pattern, sr-only prefix on strikethrough) + 3 MEDIUM (empty-state swap killed exit anim, useReducedMotion null first render, 127.0.0.1 silently disabled demoMode) + 3 LOW (drop aria-relevant cargo-cult, WCAG 2.5.3 framing comment wrong, 11→12px JSDoc) — all fixed.** |
| 3.12 | React Query wiring | `frontend/src/hooks/{useRegion,useAnalogs,usePathway}.ts` + `frontend/src/lib/queryClient.ts` | Stephen | 🟡 | 3.7, 2.6 | **Scaffolding 🟡 ready.** 3 typed hooks against locked api.ts contracts, dependent-query chain wired, QueryClientProvider mounted in App.tsx. Cold-check round 3 hardened: **QueryCache.onError** fires toast.error globally on every failed query (no consumer can forget); custom retry skips 4xx (don't retry user errors). Day 4 swap is substitution-only at HomePage.tsx data-source sites. **Sentinel ZIP `00000`** throws ApiError(404) so the catch arm and Sonner toast pipe are exercised pre-Day-4 (verified live in Playwright). **Marked ✅ once Vinh's task 2.6 endpoints are live + smoke verified end-to-end.** |
| 3.13 | Compliance Log streaming animation | `frontend/src/components/ComplianceLog/*` | Stephen | ⬜ | 3.11 | Day 5. **Demo differentiator.** Cinematic but subtle. Practice the fail→rewrite sequence. |
| 3.14 | End-to-end happy path | full stack | Stephen+Vinh | ⬜ | 2.6, 3.12 | Day 5 EOD. Type ZIP → see full results, no errors. |
| 3.15 | Loading + error + mobile + a11y polish | frontend/* | Stephen | ✅ | 3.14 | Day 6. **ResultsSkeleton orchestrator** wraps every component skeleton in HomePage layout; Day 4 swap to real API is now a one-liner. **Sonner Toaster** mounted root + ApiError handling in HomePage submit (try/catch → toast.error w/ status code). **TradeoffPanelSkeleton + useReducedMotion** added. **axe-core/Playwright sweep** caught 4 distinct WCAG AA violations across hero+results+mobile: muted-text on warm-neutral darkened #6B7280→#475569, accent-teal darkened #2E8B57→#1F7A47, ZipInput button bg-paralympic-clay→bg-navy (also fixed §1.1 size restriction violation), CountyMap highlighted Geography paths got role="img", ComplianceLog `<ul>` dropped role=log (sibling sr-only role=status handles AT broadcast). **Latent silent bug fixed**: tailwind-merge cn() was stripping text-stat-md when colliding with text-olympic-blue, ParityPanel stats rendered 16px on mobile instead of 28px → extended cn() with custom font-size classGroup. Final scan: hero + results + mobile = 0 axe wcag2aa violations. |
| 3.16 | **Pillar 5 lock — TAM, cost, revenue framing** | `docs/pitch_pillar5.md` + `frontend/src/lib/pillar5.ts` + `frontend/src/components/Pillar5Strip.tsx` | Stephen | ✅ | — | Day 6 PM locked, **audited + corrected 2026-05-03 (cold-check round 3)**. TAM **~50M US children ages 6-17** (Aspen Project Play, State of Play 2024 — was incorrectly labeled "households"; reframed to honest "children" matching Aspen's actual figure). Deployment **~20,000 NFHS-affiliated US high schools** (NFHS 2023-24 — was "~13K", actual is 19,983 → bigger number, stronger B2G claim). Annual signal **modeled ~6,000 NGB recruitment positions/yr** (50 NGBs from USOPC × ~120 modeled slots — relabeled "modeled" since the per-NGB figure is our model not a citation). Cost framing "Zero" public county-level Atlas tools (gap analysis). Numbers centralized in `lib/pillar5.ts` (single TS source of truth) imported by Pillar5Strip. 30-second pitch script Beat 3 trimmed 28→17 words to actually fit (was running 11-12s, now ~7s). Round-1 cold check caught 8 issues; round-3 web-verify caught 3 sourcing errors all corrected. |

### Phase 4 — Maximum Scope ambitious layers (Days 5–9)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 4.A | **Layer A — Shocking stat hunt** | tracked as 1.11 above + `frontend/src/{lib,components}/{heroStat.ts,HeroStat.tsx}` | Vinh + Stephen | 🟡 | — | Day 3. Always do. No cut trigger. **Frontend renderer scaffolded** (commits a9fad45 + 24de92f + d8f654b) — `HeroStat.tsx` displays above hero h1 with placeholder data per CLAUDE.md Layer A example #3 ("1 in 2"). Vinh's task 1.11 ships actual stat → swap `HERO_STAT` constant in `lib/heroStat.ts` → component picks up. axe-clean across hero+results+mobile. |
| 4.B | **Layer B — NYT/Pudding-grade frontend** | woven into 3.* | Stephen | ⬜ | — | Days 1–8. Custom illustrations, Framer Motion transitions, micro-interactions, sound design. Built INTO conservative components from Day 2 forward. Polish degrades gracefully. |
| 4.C-back | **Layer C — Gemini Live spike** | `backend/services/gemini_live.py` | Vinh | ⬜ | 2.7 | Day 5 AM. **4-hour spike rule.** If hello-world doesn't work in 4hr, CUT and continue conservative. |
| 4.C-api | Layer C — `/api/region/qa` endpoint | `backend/routes/qa.py`, `backend/services/gemini_live.py` | Vinh | ⬜ | 4.C-back | Day 5 PM (only if spike succeeds). Multimodal: current view + question → structured JSON answer. Auditor-reviewed. |
| 4.C-fe | Layer C — Q&A panel UI | `frontend/src/components/QAPanel/*` | Stephen | ⬜ | 4.C-api | Day 7. Below region profile. Type or click suggested questions. Cinematic answer reveal. |
| 4.D | **Layer D — Scrollytelling editorial** | `frontend/src/scrollytelling/*` | Stephen | ⬜ | 1.11 | Days 6–7. 3–4 chapters anchored on Layer A stats. Map drives reveal. Pudding-style. CUT if Layer A finds nothing surprising — reduce to 2 chapters or cut. |
| 4.D-api | Layer D — `/api/stats/global` endpoint | `backend/routes/stats.py` | Vinh | ⬜ | 1.8 | Day 7. Aggregate stats for scrollytelling chapters. |
| 4.E | **Layer E — Temporal layer** | per-Games schema rework | Vinh+Stephen | ⬜ | all | Day 8 ONLY if Days 1–7 are clean. **DEFAULT TO CUT.** Re-architects parquet schema. |
| 4.F | **Layer F — Agentic comparison** | `backend/services/comparison_agent.py`, `frontend/src/components/CompareView/*` | Vinh+Stephen | ⬜ | all | Days 8–9 ONLY if Layers C, D, E are stable. **FIRST TO CUT** if anything else slips. |

### Phase 5 — Deploy + demo + submit (Days 8–11, both)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 5.1 | Backend Dockerfile + Cloud Run deploy | `backend/Dockerfile` | Vinh | ⬜ | 2.11 | Day 8 AM. `--memory 1Gi --cpu 1 --min-instances 1 --max-instances 5`. Smoke test from prod URL. |
| 5.2 | Frontend Dockerfile + Cloud Run deploy | `frontend/Dockerfile` + `frontend/nginx.conf` + `docs/cloud_run_deploy.md` | Stephen | 🟡 | 3.15 | **Image + runbook ready** (commits 8861b6e + 8483089). Multi-stage Dockerfile (node:22-alpine builder → nginx:alpine runtime, 93.7MB image). nginx.conf serves SPA on port 8080 with gzip, asset cache headers, /healthz, deep-link fallback. ARG VITE_API_BASE_URL for build-time backend URL injection. **Verified locally**: docker build + run + Playwright + axe — 0 violations, all components render. **Day 8 deploy**: `gcloud run deploy atlas-frontend --source frontend/` per runbook. ✅ flips after live deploy + URL captured. |
| 5.3 | End-to-end production test | prod URLs | Stephen+Vinh | ⬜ | 5.1, 5.2 | Day 8 EOD. 20 sample ZIPs urban/rural/coastal/mountain. |
| 5.4 | Pitch script + demo storyboard | `docs/pitch_script.md` + `docs/demo_storyboard.md` | Stephen | 🟡 | 3.16 | **Both drafted** (commits c58ffbd, 80f82ad, 8ad3ae5). pitch_script.md = 7-beat narration, 3:04 estimated (trim options to 2:58 documented), Move United 63% opener + Tech Proof beat (hackathon FAQ requirement) + Pillar 5 close. demo_storyboard.md = single-take + separate-narration shot list, recording tool tradeoffs, Day 9 timeline, backup plans, NIL/IOC/USOPC DQ checklist. Reconciled against original 03_demo_outline.docx — preserved structure, updated Pillar 5 numbers per cold-check, leveraged ComplianceLog auto-demo timing instead of live re-trigger. **Day 8 PM**: read-aloud + stopwatch. **Day 9**: dry runs + record + submit. Status ✅ after Day 9 evening. |
| 5.5 | Pick demo hero ZIPs (3 regions) | `docs/demo_zips.md` | Stephen+Vinh | ⬜ | 5.3 | Day 7. Criteria in demo outline §Scene 2. Pre-warm cache. |
| 5.6 | README — judge-facing | `README.md` | Stephen | 🟡 | 5.3 | **v1 drafted** (commit 5453d27) — 11 sections, Move United 63% opener, 4 differentiators (parity / FIPS granularity / 3-dim similarity / Compliance Log ★ Pillar 4), Mermaid architecture placeholder (until task 5.8 SVG), tech stack, run-locally, sentinel ZIP 00000 docs, hackathon context, team, Apache 2.0. Banned-content scan clean. **Day 8**: fill in Cloud Run URL. **Day 9**: fill in YouTube video URL + replace Mermaid w/ Vinh's SVG. ✅ after both placeholders resolved. |
| 5.7 | SUBMISSION.md — Devpost draft | `SUBMISSION.md` | Stephen | 🟡 | 5.6 | **v1 drafted** (commit 4d3f92f). 6 sections mirror actual Devpost form (extracted from Stephen's screenshots): General (name 22/60ch, pitch 178/200ch, thumbnail), Story (7-block markdown — Inspiration/What/How/Challenges/Accomplishments/Learned/Next), Built-with (24 tech tags), Additional (state + submitter type Stephen-fill), Challenge meta (Challenge 2, start date 2026-05-01, repo URL, Reproducible Testing Yes, no-login), GCP proof (primary backend URL Day 8 + hello-gemini fallback + datasets list). 16-item pre-submit checklist. Day 8/9/10 placeholders marked `{{double-brace}}` for fill-in. Banned-content scan clean. ✅ on Day 10 paste + submit. |
| 5.8 | Architecture diagram for repo | `docs/architecture.svg` | Vinh | ⬜ | 5.1 | Day 9. Mermaid or SVG. Surface in README. |
| 5.9 | Apache-2.0 LICENSE detectable | repo About | Stephen | ✅ | — | Already in About section. **Verify before submission.** |
| 5.10 | Demo screen capture (1080p60) | local | Stephen | ⬜ | 5.5 | Day 9. Multiple takes per scene. OBS or QuickTime. |
| 5.11 | Voiceover recording | local | Stephen | ⬜ | 5.4 | Day 9. Quiet room. Best take per scene. |
| 5.12 | GCP Console + Vertex AI capture | local | Stephen | ⬜ | 5.1 | Day 9. 5–7 sec clips. Cloud Run service detail + Vertex AI usage. |
| 5.13 | Demo video edit | local | Stephen | ⬜ | 5.10–5.12 | Day 10. DaVinci/Premiere/FCP. Match VO to capture. Background music — no copyrighted samples. |
| 5.14 | Final compliance pass — 3 watches + Vinh's eyes | demo video | Stephen+Vinh | ⬜ | 5.13 | Day 10. NIL / IOC / causal language scan. **DQ-level critical.** |
| 5.15 | YouTube upload (UNLISTED) | external | Stephen | ⬜ | 5.14 | Day 10. English captions. Verify unlisted. Copy URL. |
| 5.16 | Devpost submission — final submit | devpost | Stephen | ⬜ | 5.15, 5.7, 5.9 | Day 11 by 5pm PT. **Submit by 4pm to leave 1hr buffer.** |

---

## Coordination Protocol

1. **Before starting a task:** set status to 🟡 with timestamp in Notes, commit `PLAN.md` only, push. This is your lock.
2. **After finishing:** flip to ✅, commit `PLAN.md` only, push.
3. **If blocked:** set to ⛔, add a one-line note explaining why. Ping the other person.
4. **Before starting ANY task:** run `git pull` and check this file. If the other person has 🟡 on overlapping files, coordinate first.
5. **Hotfixes:** skip the protocol — commit the fix directly, update PLAN.md after. Don't let process block a real emergency.
6. **PLAN.md commits are atomic.** Never bundle a status update with code changes. One-line status change → commit → push.
7. **Commit messages:** use Conventional Commits style (mirrors Trace).
   - `feat(backend): add ProfileService with FIPS lookup`
   - `feat(frontend): scaffold ParityPanel with side-by-side metrics`
   - `fix(auditor): tighten causal-tone regex for "produces"`
   - `chore(repo): update PLAN.md status 1.8 → ✅`
   - `docs(plan): lock D4 — drop temporal layer`
   - `⚠️ CONTRACT: change /api/region response shape — adds `compliance_log`` (announce in chat first)
8. **Handoffs:** when your part is done and the other person picks up, add `→ Vinh` or `→ Stephen` in the Notes column.
9. **Stale lock TTL = 4 hours (hackathon mode).** A 🟡 task requires a timestamp in Notes (e.g., `🟡 May 1 3pm`). If no commit happens within 4 hours, the lock is stale — the other person can claim it. Ping the original owner first.
10. **Contract changes require announcement.** Anything in the Shared Contracts table below — API shapes, parquet schemas, field names — must be announced in chat BEFORE committing. Use `⚠️ CONTRACT` prefix in the commit message. Contract drift is the #1 cause of integration bugs.

---

## Shared Contracts

> Don't drift these without an announcement + commit prefix `⚠️ CONTRACT`.

| Contract | Owner | Consumer | Definition |
|---|---|---|---|
| `county_profiles.parquet` schema | Vinh | Vinh (services), Stephen (mocks) | See arch spec §3.2. Columns: `fips`, `county_name`, `state`, `state_fips`, `msa_label`, `population`, `olympic_count`, `paralympic_count`, `olympic_per_100k`, `paralympic_per_100k`, `olympic_smoothed`, `paralympic_smoothed`, `olympic_percentile`, `paralympic_percentile`, `olympic_evidence`, `paralympic_evidence`, `top_sports`, `sport_mix_vector`, `avg_temp_f`, `annual_precip_in`, `elevation_ft`, `climate_zone`, `move_united_chapters_50mi`, `adaptive_access_confidence`. **Never include athlete names.** |
| `similarity_matrix.parquet` schema | Vinh | AnalogService | See arch spec §3.3. Columns: `source_fips`, `analog_fips`, `overall_score`, `athlete_score`, `sport_mix_score`, `climate_score`, `analog_rank`, `same_msa_as_source`. Top 50 per source. |
| `POST /api/region` request | Stephen | Vinh | `{"zip": "30060"}` |
| `POST /api/region` response | Vinh | Stephen | See arch spec §5.2. Top-level: `fips`, `county_name`, `state`, `msa_label`, `population`, `metrics{olympic, paralympic}`, `top_sports[]`, `climate{}`, `adaptive_access{}`, `narrative`, `compliance_log[]`. |
| `GET /api/analogs/{fips}` response | Vinh | Stephen | See arch spec §5.2. Top-level: `source_fips`, `analogs[3]`, `tradeoff_explanation`. Each analog: `rank`, `fips`, `county_name`, `state`, `overall_score`, `breakdown{athlete, sport_mix, climate}`, `match_quality`, `metrics{}`, `narrative`, `compliance_log[]`. |
| `GET /api/pathway/{fips}` response | Vinh | Stephen | See arch spec §5.2. Top-level: `source_fips`, `gaps[]`. Each gap: `category` (observed_strength / public_access_signal / opportunity_hypothesis), `claim`, `evidence{}`, `confidence`. |
| `compliance_log[]` entry shape | Vinh | Stephen (UI) | `{"layer": "rules" \| "gemini", "check": "<name>", "status": "pass" \| "fail" \| "fixed", "details": "...", "ts": "ISO8601"}` |
| Gemini response schema (region narrative) | Vinh | Vinh | `{safe_summary, key_points[], uncertainty_note, parity_check{olympic_mentioned, paralympic_mentioned, deterministic_language}}` |
| Conditional phrasing dictionary | Stephen | Vinh (auditor regex), UI strings | GOOD: "originates from", "shows representation patterns", "could be associated with", "may correlate with", "could help find". BANNED: "produces", "creates", "leads to", "guarantees", "is known for", "will", "makes". |
| Hometown definition | both | data pipeline + UI | "Recognized hometown as designated on Team USA roster." NOT birthplace. NOT training residence. UI states this in methodology footnote. |

---

## Decisions (locked)

> All locked from 5 rounds of council review + NotebookLM synthesis. Reference by D# in commits and code comments. Do not re-litigate without escalation.

### D1 — ZIP is input only; County (FIPS) is the analytical unit
ZIP is the user-facing personal hook. All analysis runs on county FIPS (5-digit). UI displays the resolved county/MSA label so users know what region they're looking at. Never make ZIP-level claims.
**Locked 2026-04-30 by Stephen + council Round 4 consensus.**

### D2 — Adaptive Access (Move United) is display-only
Move United chapter density renders in the UI with a confidence label. **Never enters the similarity matrix.** Council rounds 3 + 4 unanimously flagged loading sparse proxy data into similarity as a credibility-killer.
**Locked 2026-04-30 by Stephen + council unanimous.**

### D3 — Per-capita normalization with Bayesian shrinkage
Raw counts make Los Angeles every county's analog. Empirical Bayes shrinkage with α≈50,000 pulls low-pop counties toward national rate. Standard methodology — Census Bureau, CDC, ESRI all use this for small-area rates.
**Locked 2026-04-30 by Stephen + NotebookLM-validated.**

### D4 — Olympic + Paralympic ranked separately, never merged
Each tracked via percentile rank against its own national distribution. Side-by-side display. Never combined into a single "parity score." Mathematically broken to merge unequal-volume signals.
**Locked 2026-04-30 by Stephen + DeepSeek's math (Round 4) + others' confirmation.**

### D5 — Athlete names dropped at aggregation step
Names enter raw scrape (1.1) for matching only. Dropped immediately after geocoding (1.2). Never persist to parquet. Never reach Gemini. Never appear in UI. **NIL violation = automatic DQ.**
**Locked 2026-04-30 by Stephen + hackathon rules §6.**

### D6 — Backend precomputes similarity at build time
Runtime is fast lookup, not live ETL. Eliminates rate-limited APIs, slow scrapers, broken endpoints during demo. Demo reproducibility = same ZIP returns same result every time.
**Locked 2026-04-30 by Stephen.**

### D7 — Three similarity dimensions only
Athlete profile (40%) + sport mix (35%) + climate (25%). No temporal. No OSM accessibility. No additional dimensions. Council Round 4 cut these for ship-discipline.
**Locked 2026-04-30 by Stephen + council unanimous.**

### D8 — Hometown = recognized hometown on Team USA roster
NOT birthplace (Olympedia uses different field). NOT training residence (~⅔ of athletes have moved). UI states this explicitly in methodology footnote. Gemini system instructions enforce "originates from" / "shows representation patterns."
**Locked 2026-04-30 by Stephen + NotebookLM Question 6 synthesis.**

### D9 — Analytical baseline: 2016–2024 only
Pre-2016 Paralympic data is too sparse for symmetric parity. 2016–2024 is the symmetric core window. Pre-2016 Olympic stays clean but isn't shown in parity. UI methodology footnote acknowledges scope. Demo voiceover can mention.
**Locked 2026-04-30 by Stephen + NotebookLM-validated.**

### D10 — Geographic diversity constraint on analog selection
Top 3 analogs must span ≥2 different MSAs. Prevents all 3 from clustering in one metro. Applied at request time in AnalogService. Computed at precompute and stored as `same_msa_as_source` flag.
**Locked 2026-04-30 by Stephen + Perplexity Round 4 finding.**

### D11 — Maximum Scope strategy with cuttable layers
Conservative ships first (Days 1–6). Six ambitious layers (A–F) stack on top, each independently cuttable. Day 6 Gate is non-negotiable. Day 9 EOD is hard-cut deadline.
**Locked 2026-05-01 by Stephen.**

### D12 — Apache-2.0 license
Hackathon requirement. Detected in About section.
**Locked 2026-05-01 by Stephen.**

---

## Open Questions

> Decisions that need a sign-off before work can proceed. Tag the person who needs to decide.

- [ ] **Q1 — Layer A stat selection:** which of the surfaced computed stats becomes the headline? Decision date: end of Day 3, after Vinh runs the hunt. Default: Move United 63% pipeline stat. Override only if Layer A surfaces something demonstrably more shocking. Owner: **Stephen.**
- [ ] **Q2 — Demo hero ZIPs:** which 3 regions are pre-warmed for the demo? Criteria in `docs/03_demo_outline.docx` Scene 2. Default: 1 metro (Atlanta-area Cobb County), 1 college town, 1 small/rural with strong Paralympic angle. Decision date: end of Day 7. Owner: **Stephen + Vinh.**
- [ ] **Q3 — Layer C go/no-go:** does the Gemini Live hello-world pass in 4 hours on Day 5 morning? Pre-committed cut trigger if NO. Owner: **Vinh.**
- [ ] **Q4 — Layer E temporal go/no-go:** are Days 1–7 clean enough to start temporal on Day 8? Default = NO (cut). Owner: **both, EOD Day 7.**
- [ ] **Q5 — Layer F agentic compare go/no-go:** are Layers C, D, E stable by EOD Day 7? Default = NO (cut). Owner: **both, EOD Day 7.**
- [ ] **Q6 — Pillar 5 framing:** lock TAM (NGB recruitment ~6K, youth athletic households ~50M, school athletics ~13K) + cost-of-incident framing + revenue model (B2B licensing to NGBs / B2G state recreation partnerships) into pitch script. Decision date: Day 6. Owner: **Stephen.**
- [ ] **Q7 — Background music for demo video:** YouTube Audio Library (free) or Epidemic Sound (free tier). Decision date: Day 9. Owner: **Stephen.**

---

## Day 6 Gate (NON-NEGOTIABLE)

End of Day 6 EOD checkpoint. The conservative version must satisfy ALL of the following before any ambitious layer continues. If any check fails, ALL Layers A–F pause until the gate is green.

- [ ] ZIP → county lookup works for 20+ test ZIPs (urban, rural, coastal, mountain spread)
- [ ] Region profile renders cleanly with all three metric blocks (Olympic, Paralympic, parity-side-by-side with evidence labels)
- [ ] 3 analogs return with similarity breakdown by dimension AND Gemini tradeoff narrative
- [ ] Pattern Gaps render with three categories (Observed Strength / Public Access Signal / Opportunity Hypothesis)
- [ ] Compliance Log animates live in the UI; auditor catches at least one test failure case (causal language regression test)
- [ ] Backend deployed to Cloud Run with stable URL; `/health` returns 200
- [ ] Frontend deployed to Cloud Run with stable URL; CORS configured
- [ ] End-to-end test: enter ZIP, see full results within 5 seconds, no errors, no console warnings
- [ ] Pillar 5 framing locked in `docs/pitch_pillar5.md`

---

## Hard Compliance Rules (DQ if violated)

> Memorize. Auditor catches at code level. Manual review required for demo video + pitch text.

- ❌ **No athlete name/image/likeness (NIL)** in any output, code path, parquet column, log line, or UI string.
- ❌ **No finish times.** Only placement (1st/2nd/3rd) and medals — and we don't use either.
- ❌ **No IOC/USOPC branding.** No Olympic rings. No torch. No "Olympic Games" loosely used.
- ❌ **No causal language about geography.** "produces / creates / leads to / guarantees / makes / will" are banned in user-facing strings.
- ✅ **Conditional phrasing only.** "could help find" / "may correlate with" / "originates from" / "shows representation patterns".
- ✅ **Olympic + Paralympic visual + data parity.** Same component shape, same colors weight, side-by-side, never merged.
- ✅ **Restricted terminology compliance.** "Olympic Winter Games [City] [Year]" / "Paralympic Winter Games [City] [Year]" / "LA28 Games" / "LA28 Olympic and Paralympic Games". NEVER "former Olympian" or "past Olympian".
- ✅ **Sport names use official terminology**, not NGB names ("swimming" not "USA Swimming").

---

## Setup (anyone cloning)

```bash
# 1. Clone
git clone https://github.com/StephenSook/Hometown-Pathway-Atlas.git
cd Hometown-Pathway-Atlas

# 2. Backend setup (Day 1 onward)
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. GCP auth (if you have access to the shared project)
gcloud auth login
gcloud config set project pathway-atlas-hackathon
gcloud auth application-default login

# 4. Frontend setup (after Day 1)
cd ../frontend
npm install

# 5. Local dev (after Day 4)
# Terminal 1: backend
cd backend && uvicorn main:app --reload --port 8000
# Terminal 2: frontend
cd frontend && npm run dev    # serves on :5173
```

### Updating PLAN.md (manual coordination — mirrors Trace)

No CLI, no hooks. Edit this file by hand, commit only `PLAN.md`, push. Examples:

```bash
# Claim a task — change ⬜ to 🟡 in the row, add timestamp + your name in Notes
git add PLAN.md
git commit -m "chore(plan): claim 1.1 🟡 Vinh"
git push

# Complete a task — change 🟡 to ✅
git add PLAN.md
git commit -m "chore(plan): complete 1.1 ✅"
git push

# Block a task — change to ⛔, add reason in Notes
git add PLAN.md
git commit -m "chore(plan): block 1.1 ⛔ — ACS API rate-limited until tomorrow"

# Cut a Maximum Scope layer — change to ✂️, add reason in Notes
git add PLAN.md
git commit -m "chore(plan): cut 4.E ✂️ — Day 7 not clean enough"
```

---

## Phase Build Order Notes

**Phase 1 is on the critical path.** No backend service can start until parquet files exist. Vinh has Days 1–3 owned end-to-end on Phase 1.

**Phase 3 starts in parallel.** Stephen builds against mocks (3.7) while Vinh builds the data layer. Frontend doesn't block on real data until Day 4.

**Phase 2 + Phase 3 converge Day 4.** The integration is the cross-team test. The first real `/api/region` call from frontend → backend is Day 4 PM.

**Phase 4 (ambitious) starts Day 5.** Layer C spike is the gating decision. Layers D, E, F are all conditional on prior stability.

**Phase 5 starts Day 8.** Cloud Run deploys are the highest-risk item that hasn't been tested since Day 1 hello-world. Build buffer.

---

_Last updated: 2026-05-03 by Vinh (tasks 2.2–2.5 ✅)._

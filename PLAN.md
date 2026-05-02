# Hometown Pathway Atlas — Plan & Coordination

> Living working doc for **Stephen Sookra** (frontend + pitch + project architect) and **Vinh Le** (backend + data + AI). Updated on every task status change and pushed to `main`. Authoritative over the docx specs when they disagree.

**Hackathon:** Team USA × Google Cloud Hackathon — Challenge 2 (Hometown Success Engine)
**Submission deadline:** May 11, 2026 — 5:00 PM PT
**Today:** May 1, 2026 — Day 1
**Repo:** https://github.com/StephenSook/Hometown-Pathway-Atlas
**Strategy:** Maximum Scope — playing for both Challenge 2 Winner ($8K) AND Grand Prize ($15K). Conservative ships first, ambitious layers stack on top, each independently cuttable.

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
| 0.5 | GCP project + APIs enabled | — | Stephen+Vinh | ⬜ | Project: `pathway-atlas-hackathon`. APIs: Cloud Run, Vertex AI, Cloud Build, Artifact Registry, Secret Manager. Budget alert $50. |
| 0.6 | gcloud CLI installed + authed | local | Stephen+Vinh | ⬜ | `gcloud auth login` + `gcloud config set project pathway-atlas-hackathon` on both laptops. |
| 0.7 | Hello-world Cloud Run deploy | `hello/` | Vinh | ⬜ | FastAPI + Vertex AI single endpoint. **Most important 30 min of Day 1.** Pass = `{"message": "..."}`. |
| 0.8 | Lock design system + moodboard | `DESIGN_SYSTEM.md`, `docs/moodboard/` | Stephen | ✅ | Done May 1. 7 high-fi mockups + 11+4 section spec. 4-reviewer adversarial pass complete (codex/devils-advocate/sookra-council/claude-council). |
| 0.9 | Vinh contract review of DESIGN_SYSTEM.md §13 | reads `DESIGN_SYSTEM.md` | Vinh | ⬜ | **Day 1 EOD deadline.** Verify (a) `compliance_log[].status` enum is `pass\|fail\|fixed` lowercase, (b) `compliance_log[].ts` is ISO8601, (c) decide on `/api/stats/county/{fips}` endpoint OR static parquet for map tooltips. Comment confirmation in this row. |

### Phase 1 — Data ingest pipeline (Days 1–3, Vinh)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 1.1 | 2024 athlete scrape | `backend/ingest/01_athletes.py` | Vinh | ⬜ | — | Day 1 PM. Wikipedia + teamusa.com. Output `athletes_2024_raw.csv` ~800 rows. Names attached at this stage only. |
| 1.2 | GNIS city→FIPS geocoder | `backend/ingest/02_geocode.py` | Vinh | ⬜ | 1.1 | Day 2 AM. ≥95% success rate or escalate. **Drop name column immediately after.** |
| 1.3 | nClimGrid-Daily county climate | `backend/ingest/04_climate.py` | Vinh | ⬜ | — | Day 2 PM. 5km gridded, NOT station-weighted. Categorize zones. |
| 1.4 | ACS 5-year population | `backend/ingest/05_population.py` | Vinh | ⬜ | — | Day 2 PM. Census API. Per-capita normalization needs this. |
| 1.5 | HUD ZIP-County crosswalk | `backend/ingest/03_zip_crosswalk.py` | Vinh | ⬜ | — | Day 2 PM. Most recent quarterly file. Max-residential-ratio for ambiguous ZIPs. |
| 1.6 | Day 2 validation test | `backend/ingest/validate.py` | Vinh+Stephen | ⬜ | 1.1–1.5 | **GO/NO-GO checkpoint EOD Day 2.** 100 counties, 10 random source eyeball test. 7+ pass = GO. ≤4 pass = pivot to Hometown Genome. |
| 1.7 | 2016–2024 full athlete scrape | `backend/ingest/01_athletes.py` | Vinh | ⬜ | 1.6 | Day 3 AM. Rio 2016 + PyeongChang 2018 + Tokyo 2020/2021 + Beijing 2022 + Paris 2024, both O+P. ~3-4K records. |
| 1.8 | County profiles aggregation | `backend/ingest/07_aggregate.py` | Vinh | ⬜ | 1.7, 1.3, 1.4 | Day 3 AM. Per-capita + Bayesian shrinkage (alpha=50K) + percentile rank + evidence labels. Output `county_profiles.parquet`. |
| 1.9 | Similarity matrix precompute | `backend/ingest/08_similarity.py` | Vinh | ⬜ | 1.8 | Day 3 PM. ~9.8M pairs. Athlete 40 / sport mix 35 / climate 25. Top 50 per source. MSA diversity constraint. Output `similarity_matrix.parquet`. |
| 1.10 | Move United chapter scrape | `backend/ingest/06_move_united.py` | Vinh | ⬜ | 1.5 | Day 3 PM. ~252 chapters. 50-mile county radius count. Display-only column. **NOT in similarity matching.** |
| 1.11 | **Layer A — Shocking stat hunt** | `backend/ingest/09_stat_hunt.py` | **Vinh** | ⬜ | 1.8 | Day 3 EOD ~2hr. 4 hypothesis classes. Pick 1-2 strongest by emotional resonance. Ship to Stephen for pitch. |

### Phase 2 — Backend services (Days 4–6, Vinh)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 2.1 | FastAPI scaffold + config | `backend/main.py`, `backend/config.py` | Vinh | ⬜ | 0.7 | Day 4 AM. CORS for localhost:5173. Vertex AI init. |
| 2.2 | Pydantic schemas | `backend/schemas/{region,analog,pathway}.py` | Vinh | ⬜ | — | Day 4 AM. Match API contracts in spec §5.2 EXACTLY (camelCase output, snake_case envelope). |
| 2.3 | ProfileService | `backend/services/profile_service.py` | Vinh | ⬜ | 1.8, 2.2 | Day 4 PM. ZIP→FIPS lookup. Returns region profile from parquet. |
| 2.4 | AnalogService | `backend/services/analog_service.py` | Vinh | ⬜ | 1.9, 2.2 | Day 4 PM. Top 3 from similarity matrix. Apply MSA diversity constraint at request time. |
| 2.5 | PathwayService | `backend/services/pathway_service.py` | Vinh | ⬜ | 1.8, 2.2 | Day 4 PM. Generates Pattern Gaps in 3 categories (Observed Strength / Public Access Signal / Opportunity Hypothesis). |
| 2.6 | Routes — `/api/region`, `/api/analogs/{fips}`, `/api/pathway/{fips}` | `backend/routes/*.py` | Vinh | ⬜ | 2.3, 2.4, 2.5 | Day 4 PM. |
| 2.7 | GeminiService — region narrative | `backend/services/gemini_service.py` | Vinh | ⬜ | 2.3 | Day 5 AM. Vertex AI structured output schema. Region narrative + analog tradeoff + pattern gap prompts. |
| 2.8 | GeminiService — test 5 sample counties | `backend/tests/test_gemini.py` | Vinh | ⬜ | 2.7 | Day 5 PM. Verify structured JSON output reliable. |
| 2.9 | HybridAuditor — deterministic layer | `backend/services/auditor.py` | Vinh | ⬜ | 2.7 | Day 6 AM. Regex for banned phrases, name detection, parity mention check, schema validation. |
| 2.10 | HybridAuditor — Gemini semantic layer | `backend/services/auditor.py` | Vinh | ⬜ | 2.9 | Day 6 PM. Causal-tone classifier. Rewrite loop. Compliance log emission. |
| 2.11 | Caching layer | `backend/services/cache.py` | Vinh | ⬜ | 2.7 | Day 6 PM. FIPS-keyed deterministic cache for narratives. Don't recall Gemini for same county. |

### Phase 3 — Frontend conservative (Days 1–6, Stephen)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 3.1 | Vite+React+TS+Tailwind scaffold | `frontend/` | Stephen | ⬜ | 0.2 | Day 1 PM. Lock visual ambition target — Layer B begins now. |
| 3.2 | Visual design tokens (Tailwind config) | `frontend/src/styles/`, `tailwind.config.ts` | Stephen | ⬜ | 3.1 | Day 1-2. **Source of truth: `DESIGN_SYSTEM.md` §1.** All palette + typography + spacing tokens implement the locked spec — no improvising. |
| 3.3 | Component library installed | `package.json` | Stephen | ⬜ | 3.1 | Day 2. shadcn/ui base + Framer Motion + react-simple-maps + Recharts + React Query + Lucide React (Lucide replaces custom climate SVGs per DESIGN_SYSTEM.md §6.1). |
| 3.4 | Wireframes for key screens | `docs/wireframes/` (skipped) | Stephen | ✂️ | — | Superseded by `docs/moodboard/01-07.png`. Wireframes not needed — moodboard images + DESIGN_SYSTEM.md §4 component anatomy are the visual brief. |
| 3.5 | ZipInput + landing page | `frontend/src/pages/HomePage.tsx`, `components/ZipInput.tsx` | Stephen | ⬜ | 3.2 | Day 2 AM. Single CTA. ZIP validation. |
| 3.6 | RegionHeader + ParityPanel | `frontend/src/components/RegionProfile/*` | Stephen | ⬜ | 3.2 | Day 2 PM. Side-by-side O/P metrics. EvidenceLabel badge. **Never merge into single number.** |
| 3.7 | Mock API responses | `frontend/src/lib/mocks.ts` | Stephen | ⬜ | 2.2 | Day 2. Aligned to schema. Frontend builds against mocks Day 2-3, switches to real Day 4. |
| 3.8 | AnalogList + AnalogCard + SimilarityBreakdown | `frontend/src/components/AnalogList/*` | Stephen | ⬜ | 3.6 | Day 3. Three cards. Per-dimension breakdown. Tradeoff panel placeholder. |
| 3.9 | CountyMap (choropleth) | `frontend/src/components/CountyMap/*` | Stephen | ⬜ | 3.3 | Day 3. react-simple-maps + TopoJSON. Source highlighted, 3 analog pins. Custom illustration (Layer B). |
| 3.10 | PatternGapPanel + GapCard | `frontend/src/components/PatternGapPanel/*` | Stephen | ⬜ | 3.6 | Day 4. Three categories. Conditional language enforced. |
| 3.11 | ComplianceLog component | `frontend/src/components/ComplianceLog/*` | Stephen | ⬜ | 3.6 | Day 4. Two-column live feed. Pass/fail/fixed status colors. Slide-down animation. |
| 3.12 | React Query wiring | `frontend/src/hooks/{useRegion,useAnalogs,usePathway}.ts` | Stephen | ⬜ | 3.7, 2.6 | Day 4. Connect to local backend. Loading/error states. |
| 3.13 | Compliance Log streaming animation | `frontend/src/components/ComplianceLog/*` | Stephen | ⬜ | 3.11 | Day 5. **Demo differentiator.** Cinematic but subtle. Practice the fail→rewrite sequence. |
| 3.14 | End-to-end happy path | full stack | Stephen+Vinh | ⬜ | 2.6, 3.12 | Day 5 EOD. Type ZIP → see full results, no errors. |
| 3.15 | Loading + error + mobile + a11y polish | frontend/* | Stephen | ⬜ | 3.14 | Day 6. Skeleton UIs. Sonner toast for errors. Mobile responsive. Keyboard nav. |
| 3.16 | **Pillar 5 lock — TAM, cost, revenue framing** | `docs/pitch_pillar5.md` | Stephen | ⬜ | — | Day 6 ~30 min. NotebookLM-flagged weakest pillar. NGB recruitment ~6K, youth athletic households ~50M, school athletics ~13K. B2B/B2G framing. **Do not skip.** |

### Phase 4 — Maximum Scope ambitious layers (Days 5–9)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 4.A | **Layer A — Shocking stat hunt** | tracked as 1.11 above | Vinh | ⬜ | — | Day 3. Always do. No cut trigger. |
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
| 5.2 | Frontend Dockerfile + Cloud Run deploy | `frontend/Dockerfile` | Stephen | ⬜ | 3.15 | Day 8 PM. Vite build + nginx serve. Configure CORS to backend URL. |
| 5.3 | End-to-end production test | prod URLs | Stephen+Vinh | ⬜ | 5.1, 5.2 | Day 8 EOD. 20 sample ZIPs urban/rural/coastal/mountain. |
| 5.4 | Pitch script v2 with timing | `docs/pitch_script.md` | Stephen | ⬜ | 3.16 | Day 8. 2:30 target. Practice 3x. |
| 5.5 | Pick demo hero ZIPs (3 regions) | `docs/demo_zips.md` | Stephen+Vinh | ⬜ | 5.3 | Day 7. Criteria in demo outline §Scene 2. Pre-warm cache. |
| 5.6 | README — judge-facing | `README.md` | Stephen | ⬜ | 5.3 | Day 9. Pitch + demo moment + how it works. Mirror Trace style. |
| 5.7 | SUBMISSION.md — Devpost draft | `SUBMISSION.md` | Stephen | ⬜ | 5.6 | Day 9-10. Tagline, short description, full writeup, video URL, GCP proof links. |
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

_Last updated: 2026-05-01 by Stephen (project init)._

# Hometown Pathway Atlas — Build Context

## Project
Web app for Team USA × Google Cloud Hackathon Challenge 2 (Hometown Success Engine).
Submission deadline: May 11, 2026 at 5pm PT.
Reference docs in `docs/` — architecture spec is the source of truth for conservative scope, Maximum Scope Addendum extends it.

## Status snapshot (last updated 2026-05-04 PM)
- Phase 1 ingest pipeline ✓ shipped (Vinh tasks 1.7–1.11 incl. Layer A stat hunt).
- Phase 2 backend ✓ FULLY shipped — Vinh tasks 2.2–2.11 (services + routes + GeminiService + HybridAuditor + NarrativeCache).
- Frontend ↔ backend wire ✓ shipped — React Query hooks live, schemas reconciled (incl. ComplianceEntry before/after), all 3 sentinel ZIPs end-to-end verified, RegionNarrative renderer wired post-Gemini-ship.
- **Cloud Run deploy ✓ LIVE.**
  - Frontend: https://atlas-frontend-635524063449.us-central1.run.app
  - Backend:  https://atlas-backend-635524063449.us-central1.run.app
  - Vertex AI IAM (`roles/aiplatform.user`) granted to compute SA. Live smoke 2026-05-04: POST /api/region 30060 → 8.78s with HybridAuditor producing 10 audit entries, narrative live (not fallback signature).
- HeroStat → "4 in 5" Layer A stat (4 in 5 U.S. counties show no Team USA athlete representation in our 2016–2024 indexed sources; 555 of 3,222 counties). Now backed by `/api/stats/global` (Vinh ship 2026-05-04 PM) — live numerator/denominator visible on the methodology page in the "Atlas-wide findings" section alongside a second underdog stat (68% of small counties beating major-metro Paralympic median).
- CountyMap final 15% shipped 2026-05-04 (commit e36b06a, revision atlas-frontend-00016-hsb): click-to-load real per-county metrics via Vinh's `/api/stats/county/{fips}`, auto-tour Play/Stop button (6-keyframe camera tween for Day 9 recording), peer-pin drill-down (click pin scrolls to AnalogList + 2.4s card flash). Plus prior Day 8 map upgrades: bidirectional map↔card highlight, smart Reset (fit-all-pins), RotatingGlobe ambient hero, per-county hover tooltip restored with FIPS→state lookup.
- B7 RESOLVED 2026-05-04 — Vinh shipped `/api/region/by-fips/{fips}` (commit e8cddd5, revision atlas-backend-00007-6k7). Frontend wired same day (commit 8b2caf3): SelectedCountyCard top-right slot fires `onSelectCounty(fips)` on user confirm → HomePage hydrates new region via `useRegionByFips`.
- Layer D atlas-stats RESOLVED 2026-05-04 — Vinh shipped `/api/stats/global` returning `{gap, underdog}` themed findings (4-in-5 representation gap + 68% small-county underdog Paralympic signal). Frontend wired in MethodologyPage "Atlas-wide findings" section via `useGlobalStats`.
- B3 RegionQA panel ships against the live `/api/region/qa` backend route; eyebrow flips to "Live Gemini" only on a real Vertex call (source flag returned by backend).
- B4 (`data_confidence` hatch flag) skipped — choropleth tint already conveys density signal; SVG `<pattern>` defs remain in CountyMap for future ship.
- B5b ComplianceLog: panel runs the canonical demo script in HomePage; live HybridAuditor (10-entry audit on every `/api/region` call) is auditable via curl.

## Team
- Stephen Sookra: frontend (React/Vite/TS/Tailwind), pitch, project architect
- Vinh Le: backend (FastAPI/Python), data pipeline

## Stack
- Frontend: React + Vite + TypeScript + Tailwind, deployed on Cloud Run
- Backend: FastAPI + Python, deployed on Cloud Run
- AI: Vertex AI (Gemini 2.5 Flash for narrative, Gemini Live for multimodal Q&A) with structured output schemas
- Data: precomputed parquet files baked into backend container

## Build Strategy: Maximum Scope with Cuttable Layers

We are playing for Grand Prize ($15K) AND Challenge 2 Winner ($8K), not one or the other. Strategy:

1. **Conservative version ships first** (Days 1–6). End of Day 6: must be end-to-end functional and demoable. This is the FLOOR. Never let an ambitious feature delay it.
2. **Ambitious layers stack on top** (Days 7–9). Each layer is independently cuttable if it threatens shipping.
3. **Day 10 is buffer + demo recording.** No new features after Day 9 EOD.

If a layer is half-built on Day 9, it gets cut. The conservative version always ships.

## Locked Architectural Decisions (DO NOT VIOLATE)
1. ZIP is input only. County (FIPS) is the analytical unit.
2. Adaptive Access (Move United) is display-only, never load-bearing in similarity matching.
3. Per-capita normalization with empirical Bayes shrinkage. Never raw counts.
4. Olympic + Paralympic ranked separately by percentile rank. NEVER merged.
5. Athlete names dropped at aggregation step. Never persisted, never reach Gemini, never in UI.
6. Backend precomputes similarity matrix at build time. Runtime is fast lookup, not live ETL.
7. Three similarity dimensions: athlete profile (40%), sport mix (35%), climate (25%).
8. Hometown means recognized hometown on Team USA roster. NOT birthplace, NOT training residence.
9. Analytical baseline window: 2016–2024 only.
10. Top 3 analogs must span ≥2 different MSAs (geographic diversity constraint).

## Conservative Scope (Days 1–6, MUST SHIP)
- ZIP → County resolution
- Region profile (Olympic/Paralympic parity panel, sport mix, climate, adaptive access display)
- 3 peer county analogs with similarity breakdown
- Pattern Gap panel (Observed Strength / Public Access Signal / Opportunity Hypothesis)
- Hybrid auditor (deterministic regex + Gemini semantic causal-tone analysis)
- Compliance Log panel in UI
- Cloud Run deployment (frontend + backend)

## Ambitious Layers (Days 7–9, OPT-IN, INDEPENDENTLY CUTTABLE)

### Layer A — Shocking Stat Hunt (Day 3, Vinh, ~2 hours)
Hunt the dataset for one to three genuinely non-obvious findings. Examples we're looking for:
- "X counties have produced more Paralympic athletes per capita than [major metro]"
- "Median Team USA hometown population is Y" (likely smaller than expected)
- "Z% of counties that produced any Olympian also produced a Paralympian"

The discovery is uniquely ours because we're the only team aggregating to county FIPS with parity. Surfaces in pitch, demo, and scrollytelling. Lowest cost / highest ROI ambitious layer.

### Layer A — Shocking Stat Hunt (Day 3, Vinh, ~2 hours) [PENDING — Vinh task 1.11]
HeroStat renderer is scaffolded with a placeholder; constant swap on Vinh's ship.

### Layer B — NYT/Pudding-Grade Frontend (Days 5–8, Stephen) [SHIPPED 2026-05-03 PM]
- SourceTooltip primitive on every visible metric (17 wires) — NYT/Pudding citation pattern
- Atlas favicon parity-glyph + OG image + per-route social meta tags
- Per-FIPS document.title sync + deep-link URLs (?zip=&fips=)
- "Try Cobb County" tour CTA on landing
- Replay-audit button on ComplianceLog header
- /about methodology editorial page (#about hash route)
- Sparse-county empty-state rendering across ParityPanel + SportMix + AdaptiveAccessCard (sentinel ZIP 11111)
- Pillar5Defense second-layer card (per-incident harm + 3 lighthouse NGB chips)
- Sound design recipe in `docs/sound_design.md` for Day 9 recording (still Stephen-action)

### Layer C — Reasoning-Chain Q&A [SHIPPED]
RegionQA panel renders below TradeoffPanel on results view. Question input + visible reasoning chain + final conditional-phrased answer + suggested-question chips. Three suggested-question chips (climate / parity gap / analog comparison) provide a fast tour of the reasoning surface. Backend `/api/region/qa` route returns reasoning + answer + source flag; the eyebrow flips to "Live Gemini" only on a real Vertex call. Renamed from "Multimodal Gemini Live" 2026-05-05 — current ship is text-input + text-output with visible reasoning steps; voice/audio Gemini Live multimodal is on the post-hackathon roadmap.

### Layer D — Embedded Scrollytelling Editorial [SHIPPED 2026-05-04 PM]
Five chapter scroll-triggered narrative anchored on Vinh's `/api/stats/global` (gap + underdog). Sticky-map ScrollyMap variant + react-scrollama orchestrator (commit f6dfb67). Replaces static HeroStat opener with 35-40s scrollytelling walkthrough: INTRO → GAP (4 in 5) → UNDERDOG (68%) → PATHWAY (Cobb + 3 analogs) → CTA (HeroStat + ZipInput + globe + CountyNameSearch). Reduced-motion fallback renders static stack. Pitch script needs Beat 1 re-storyboard + demo re-record around new opener (~25-27s added; fits 3:00 budget if Beats 3-5 trim 5s each). Cut trigger: revert commit f6dfb67 if scrolly causes pitch issues — conservative version still ships cleanly.

### Layer E — Temporal Layer (Day 8, both, only if Days 1–6 are clean) [CUT 2026-05-02]
Re-architects similarity matrix. Cost > marginal demo impact. Stays cut.

### Layer F — Agentic Comparison Workflow [CUT 2026-05-03]
RegionQA Layer C covers the visible-reasoning + Gemini-on-region surface differently (Q&A rather than side-by-side comparison) without the cost of a second analytical-data-dimension. Stays cut to avoid splitting judge attention between parallel reasoning surfaces.

## Day 6 Gate (Critical Discipline)

End of Day 6 EOD checkpoint. The conservative version must satisfy ALL of:
- ZIP → county lookup works for 20+ test ZIPs
- Region profile renders cleanly with all three metrics (Olympic, Paralympic, parity)
- 3 analogs return with similarity breakdown and Gemini tradeoff narrative
- Pattern Gaps render with three categories
- Compliance Log animates live, auditor catches at least one test failure case
- Backend deployed to Cloud Run with stable URL
- Frontend deployed to Cloud Run with stable URL
- End-to-end test: enter ZIP, see full results, no errors

If any of these fail at end of Day 6, all ambitious layers are paused until Day 6 gate is green.

## Hard Compliance Rules (DQ if violated)
- No athlete name/image/likeness (NIL) in any output, code path, or UI
- No finish times. Only placement and medals allowed (we don't use either)
- No IOC/USOPC branding (Olympic rings, torch, "Olympic Games" loosely used)
- Conditional phrasing only in user-facing strings ("could help find" not "produces")
- Olympic + Paralympic must have visual + data parity

## Style Conventions
- Python: black formatter, full type hints, Pydantic models for all API I/O
- TypeScript: strict mode, functional components, React Query for server state
- Conditional phrasing in all user-facing strings: "originates from", "shows representation patterns", "could be associated with" — never "produces", "creates", "guarantees"

## Project Structure
- backend/ingest/: standalone data pipeline scripts (run once, output parquet)
- backend/services/: FastAPI service layer (profile, analog, pathway, gemini, gemini_live, auditor)
- backend/routes/: FastAPI endpoints
- frontend/src/components/: React components grouped by feature
- frontend/src/scrollytelling/: editorial chapters (Layer D)
- docs/: reference documentation

## Reference Documents
- docs/01_architecture_spec.docx — full system design, schemas, API contracts, conservative timeline
- docs/02_vinh_handoff.docx — operational backend guide, conservative scope
- docs/03_demo_outline.docx — demo video storyboard
- docs/04_maximum_scope_addendum.docx — Maximum scope additions, layer cut triggers, updated timeline
- DESIGN_SYSTEM.md — visual identity spec (palette, typography, components with anatomy + states, motion choreography, accessibility, build order Day 2→Day 6). Locked 2026-05-01. Source of truth for everything visual. §4.19 added 2026-05-03 for Pillar5Defense.
- docs/moodboard/01-07.png — visual targets (hero, parity panel, analog cards, county map, compliance log, palette swatches, scrollytelling). Visual benchmark when implementing components.
- REFERENCE_FINDINGS.md — Phase A research dossier (NYT/Bloomberg/Pudding/Reuters/Census patterns + Magic 21st React components + audit feed UIs). Input to DESIGN_SYSTEM.md.
- SUBMISSION.md — Devpost form fill-in source-of-truth. Updated 2026-05-03 PM to reflect real-backend wire + Layer B/C ship.
- docs/pitch_script.md — locked beat-by-beat narration for the demo recording.
- docs/pitch_pillar5.md — Pillar 5 numbers + sources + Q&A elevator surfaces. Drift CI in scripts/check-pillar5-drift.mjs.
- docs/council_2026-05-03.md — Sookra Council Day 7 chairman synthesis + Day 8 follow-up flags.
- docs/notebooklm_oracle_prompts.md — 5-prompt deck Stephen runs in NotebookLM before final pitch lock.
- docs/sound_design.md — Day 9 demo recording sound recipe.
- docs/pitch_rehearsal.md — `./scripts/pitch-stopwatch.sh` protocol + per-beat target table.
- docs/visual_verification_checklist.md — manual browser walkthrough for the 17-commit Editorial Polish Layer.
- docs/mobile_audit_2026-05-03.md — static mobile-breakpoint sweep (no fixes required).
- docs/cloud_run_deploy.md — frontend deploy runbook (backend deploy section pending).

When asked about architectural decisions, check the architecture spec first.
When proposing changes that conflict with locked decisions above, flag it explicitly and ask for confirmation before proceeding.
When working on an ambitious layer, default to cutting it cleanly if it threatens the Day 6 gate or final shipping.

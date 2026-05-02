# Hometown Pathway Atlas — Build Context

## Project
Web app for Team USA × Google Cloud Hackathon Challenge 2 (Hometown Success Engine).
Submission deadline: May 11, 2026 at 5pm PT.
Reference docs in `docs/` — architecture spec is the source of truth for conservative scope, Maximum Scope Addendum extends it.

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

### Layer B — NYT/Pudding-Grade Frontend (Days 5–8, Stephen)
Push visual design beyond "sober editorial" toward Awwwards-tier polish:
- Custom-illustrated map elements (not flat choropleth)
- Smooth Framer Motion transitions between every state change
- Micro-interactions on hover, click, drill-down
- Custom data visualizations beyond default Recharts (e.g., parity comparison radial)
- Sound design for demo video
- Typography and spacing at editorial publication tier

### Layer C — Multimodal Gemini Live Region Q&A (Days 5–6, Vinh + Stephen integration Day 7)
User asks a natural-language question about any region they're viewing. Gemini Live receives the current map state (as image or structured data) plus the user's question and answers in real time using reasoning over visible context.

Example: "Why does this region produce so many wrestlers?" → Gemini Live reasons over visible county data + climate + sport mix and returns a conditional, evidence-grounded answer.

This is the highest-tier "Gemini in new ways" play. Multimodality + reasoning + context, all called out in judging criteria.

CUT TRIGGER: if Gemini Live integration is fighting us at end of Day 6, cut and ship without it. Conservative version still demos cleanly.

### Layer D — Embedded Scrollytelling Editorial (Days 6–7, Stephen)
Beyond the interactive tool, a 3–4 chapter scrollytelling piece walks the user through the most surprising findings from the dataset. Map drives the reveal at each step. Pudding-style narrative-first interactivity.

Anchored on Layer A's discovered stats. Becomes the demo video's structure (we walk through our own scrollytelling piece).

CUT TRIGGER: if Layer A fails to surface a genuinely surprising stat, scrollytelling has nothing to anchor on. Cut.

### Layer E — Temporal Layer (Day 8, both, only if Days 1–6 are clean)
Show how a region's Team USA story shifts from 2016 → 2024. Animated time slider on the choropleth. Sport mix evolution. Migration patterns. Gemini narrates the temporal arc.

HIGHEST COST / HIGHEST RISK ambitious layer. Adds a new data dimension (per-Games rather than aggregated). Significant re-architecture of similarity matrix.

CUT TRIGGER: if any other layer is delayed past Day 7, do not start the temporal layer. Default to cut.

### Layer F — Agentic Comparison Workflow (Day 8–9, Vinh)
User selects two counties side-by-side. A Gemini agent runs comparative analysis with tool calls — pulls evidence from both regions, reasons about tradeoffs, generates structured comparison report with cited evidence. Agent's "thinking" visible in sidebar (which counties it's examining, which dimensions it's weighing).

Visible reasoning sidebar parallels the Compliance Log pattern but in core UX, not auditing.

CUT TRIGGER: if Layers C, D, or E are running long, this is the first to cut.

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

When asked about architectural decisions, check the architecture spec first.
When proposing changes that conflict with locked decisions above, flag it explicitly and ask for confirmation before proceeding.
When working on an ambitious layer, default to cutting it cleanly if it threatens the Day 6 gate or final shipping.

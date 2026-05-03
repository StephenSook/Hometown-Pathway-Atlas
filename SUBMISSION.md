# Devpost Submission — Hometown Pathway Atlas

Source-of-truth for the Devpost form fill-in. Each section below maps
to one Devpost form page. Paste content in directly; refine anything
**`{{LIKE THIS}}`** as it gets confirmed Day 8–10.

**Hackathon:** Team USA × Google Cloud Hackathon — Challenge 2 (Hometown Success Engine)
**Submission deadline:** May 11, 2026 — 5:00 PM PT.

Cross-references:
- [`README.md`](README.md) — judge-facing repo doc (mirrored content)
- [`docs/pitch_script.md`](docs/pitch_script.md) — narration source
- [`docs/pitch_pillar5.md`](docs/pitch_pillar5.md) — locked Pillar 5 numbers
- [`docs/cloud_run_deploy.md`](docs/cloud_run_deploy.md) — deploy runbook

---

## Page 1 — Project overview / General info

### Project name *(60 char max)*

```
Hometown Pathway Atlas
```

*22 characters. Well under limit.*

### Elevator pitch *(200 char max)*

```
Per-capita parity. County granularity. Audit-grade. A live county-level Olympic and Paralympic representation lens with judge-visible AI safety. Built in 10 days on Google Cloud.
```

*177 characters. Conditional phrasing intact. No NIL / IOC-USOPC / causal verbs.*

### Thumbnail *(JPG/PNG/GIF, 5MB, 3:2 ratio)*

Use [`docs/thumbnail.png`](docs/thumbnail.png) — editorial title card
generated via Gemini Nano Banana 2 (3:2 ratio, 2K resolution, 2.1MB).
Bold serif "HOMETOWN PATHWAY ATLAS" wordmark in navy on warm-cream
background, with a stylized US map dotted in olympic-blue + paralympic-
clay scatter representing county-level data points. NYT Upshot /
WIRED data-journalism aesthetic.

Alternative if Devpost prefers a screenshot: capture results view at
1200×800 (3:2) showing RegionHeader + ParityPanel + first row of
analog cards.

---

## Page 2 — Project Story

### About the project *(markdown freeform)*

Paste the entire block below into the Project Story textarea.

```markdown
## Inspiration

63 percent of 2024 U.S. Paralympic athletes came through one national
network of community-based adaptive sports chapters — Move United. That
network reaches only a fraction of U.S. counties. A kid in Cobb County
wanting to know if anyone from a place like hers ever made Team USA has
no way to find out. State-level maps exist. Athlete finders exist. None
of them combine the data, treat Olympic and Paralympic equally, or work
at the county level — the level where local pride lives.

## What it does

Hometown Pathway Atlas is a single per-county lens for Olympic and
Paralympic representation. Type a ZIP. Atlas resolves it to county
FIPS — the analytical unit nobody else uses for this question — then
surfaces:

- **Per-capita parity** — Olympic and Paralympic shown side-by-side,
  never merged. Empirical Bayes shrinkage so a small county doesn't
  blow up the signal or get drowned by megacounties.
- **Three peer counties** matched by athlete profile (40%), sport mix
  (35%), and climate (25%). Weighted, MSA-diversified, explained per
  dimension in the UI.
- **Pattern Gaps** — three categories per spec (observed strength /
  public access signal / opportunity hypothesis), every claim
  conditionally phrased.
- **Compliance Log ★** — every Gemini-generated narrative passes a
  hybrid auditor (deterministic regex + Gemini semantic causal-tone
  analysis) before it reaches the user. The audit log streams live in
  the UI. Judges can watch it catch a draft like *"Cobb County
  PRODUCES Olympic athletes"* and rewrite it to *"could be associated
  with Olympic representation patterns."* Live. Visible. Auditable.

## How we built it

**Frontend:** React 19 + Vite 8 + TypeScript strict + Tailwind v3 with
a custom Atlas Editorial palette. Framer Motion 12 drives the motion
choreography (Compliance Log streaming, fail→fixed in-place crossfade).
react-simple-maps 3 renders the US choropleth via the us-atlas
TopoJSON. Sonner 2 handles error toasts. @tanstack/react-query 5
manages data fetching with hackathon-tuned defaults (5min staleTime,
no refetch on window focus, custom retry that skips 4xx).

**Backend:** FastAPI + Python 3.12 + Pydantic v2 with strict typed I/O.
County profiles, similarity matrix, climate signatures, and Move
United chapter coverage are precomputed into Apache Parquet at build
time and loaded at startup. Runtime is fast lookup, not live ETL.

**AI:** Vertex AI Gemini 2.5 Flash with structured output JSON schemas
generates the region narrative, peer-similarity tradeoff explanation,
and pattern gap framings. Output passes the hybrid auditor before
reaching the user. The audit events stream as the Compliance Log.

**Hosting:** Google Cloud Run in us-central1 (frontend nginx:alpine,
backend python:3.12-slim). Artifact Registry + Cloud Build CI.

**Accessibility:** axe-core/Playwright sweep across hero, results, and
mobile (375x812). Zero WCAG 2.1 AA violations across all three
surfaces. Custom focus-visible ring on Tab-reachable map counties.
Sr-only role=status announcer for the Compliance Log fail→fixed
transition (live AT-accessible, not just visual).

## Challenges we ran into

**Parity discipline.** Olympic and Paralympic must be visually and
analytically symmetric. Every component shows them side-by-side, never
merged. Every metric carries an evidence-strength label. The locked
decision: never collapse them into a single number. Holding this
discipline across 17 components meant catching three near-violations
during cold-check rounds.

**Conditional phrasing as a UI rule, not a vibe.** No causal language
about geography ever reaches the user. Banned verbs ("produces",
"creates", "leads to") are deterministically caught by regex layer 1.
Semantic causal tone is caught by Gemini layer 2. The audit happens
in real time, in front of the judge, in the Compliance Log. This is
the Pillar 4 differentiator — making AI safety a UI surface, not a
postmortem document.

**Pillar 5 number sourcing.** Our first pass had three numbers we
thought were sourced. Cold-check round 3 web-verified each against
the cited reports and caught all three: TAM was children not
households (Aspen Institute), NFHS school count was 19,983 not 13K,
NGB recruitment "6,000" was a model not a citation. Corrected and
labeled honestly.

**Three-round cold-check pattern.** We ran a Codex + Claude reviewer
+ web-verify fan-out after every major component ship. Round 1 caught
design-pattern issues, round 2 caught runtime-boundary failures, round
3 caught content-sourcing errors. Across the project this caught 30+
issues that would have shipped to judges otherwise.

## Accomplishments we're proud of

- **Compliance Log ★** — Pillar 4 demo moment. Live judge-visible AI
  safety surface that auto-plays the canonical fail→fixed sequence in
  demo mode (env-guarded, never leaks to production).
- **Per-capita parity discipline** — every analytical view treats
  Olympic and Paralympic symmetrically. No exceptions.
- **Zero axe-core WCAG 2.1 AA violations** across hero, results, and
  mobile. Caught a tailwind-merge silent bug along the way that was
  stripping `text-stat-md` when colliding with `text-olympic-blue` —
  ParityPanel stats were rendering 16px on mobile instead of 28px.
  Fixed with a custom font-size classGroup.
- **Pillar 5 numbers locked + sourced + defensible.** TAM (~50M
  children, Aspen Project Play State of Play 2024), deployment surface
  (~20,000 NFHS-affiliated high schools, NFHS 2023-24), annual signal
  (modeled ~6,000 NGB recruitment positions per year). Pre-pitch
  defensibility checklist documented.

## What we learned

- **Cold-check pattern works.** Codex (different model fingerprint) +
  Claude code-reviewer (project conventions) + general-purpose web
  verify (sources) catches different classes of issues. Three rounds
  per component is the right cadence for a 10-day build.
- **Conditional phrasing is a hard rule, not a soft preference.** Once
  we put the auditor between Gemini and the user, the conditional
  phrasing rule became enforceable, not aspirational.
- **NotebookLM as a pre-pitch oracle.** It flagged Pillar 5 as our
  weakest pitch axis on Day 5. Without that flag we would have shipped
  Pillar 5 with placeholder numbers. Worth using earlier next time.

## What's next

- **Layer A — Shocking Stat Hunt** ships Day 3 EOD (Vinh). Renderer
  scaffolded; constant swap on ship.
- **Layer B — Awwwards-tier polish** (Days 5–8). Custom illustrated
  map elements, Reuters-style stagger animations, sound design for
  the demo video.
- **Layer C — Multimodal Gemini Live region Q&A.** User asks a
  natural-language question about any visible region; Gemini Live
  reasons over the visible county data + climate + sport mix and
  answers in real time.
- **Layer D — Embedded scrollytelling editorial.** 3–4 chapters
  walking through the most surprising findings, anchored on Layer A.
- **Layer F — Agentic comparison workflow.** Side-by-side county
  comparison with a Gemini agent's reasoning visible in a sidebar
  parallel to the Compliance Log pattern.

Each layer is independently cuttable if it threatens the deadline.
Conservative ships first, always.
```

---

## Page 3 — Built with + links + media

### Built with *(tags — paste comma-separated)*

```
react, vite, typescript, tailwind-css, framer-motion, react-simple-maps, tanstack-react-query, sonner, lucide-react, fastapi, python, pydantic, pandas, pyarrow, vertex-ai, gemini, google-cloud-run, artifact-registry, cloud-build, apache-parquet, nginx, docker, axe-core, playwright
```

### "Try it out" links

```
Live demo: {{Day 8: Cloud Run frontend URL — https://atlas-frontend-xxxxxx-uc.a.run.app}}
GitHub repo: https://github.com/StephenSook/Hometown-Pathway-Atlas
```

### Project Media — Image gallery *(JPG/PNG/GIF 5MB each, 3:2 ratio)*

**`{{Day 9: 3-5 screenshots — recommend:}}`**
1. Hero view with HeroStat callout + ZIP input
2. Results view top — RegionHeader + CountyMap with pins + arcs
3. ParityPanel close-up — Olympic + Paralympic side-by-side
4. PatternGapPanel — 3 categories
5. Compliance Log ★ at the fail→fixed moment (high-leverage screenshot)
6. Pillar5Strip — 3 columns visible

---

## Page 4 — Additional info *(judges + organizers, NOT public)*

### Upload a File *(zip/pdf/word/apk, 35MB max)*

Optional. Skip unless we have a one-pager PDF design brief.

### Which US State are you physically located in? *(REQUIRED, multi-select)*

**`{{Stephen-fill: select Stephen's actual state. Per CLAUDE.md project context, anchor region is Cobb County GA but Stephen's physical location may differ.}}`**

### Submitter Type *(REQUIRED, dropdown)*

**`{{Stephen-fill: pick from actual dropdown options. Likely "Team" since 2 contributors (Stephen + Vinh).}}`**

### Organization name

Leave blank unless registered as an organization.

---

## Page 5 — Challenge + project metadata

### Which Challenge are you submitting to? *(REQUIRED)*

```
Challenge 2: Hometown Success Engine
```

### What date did you start this project? *(REQUIRED)*

```
2026-05-01
```

*Repo init was May 1, 2026 — within Submission Period per the rules.*

### URL to your public code repository *(REQUIRED, Apache 2.0)*

```
https://github.com/StephenSook/Hometown-Pathway-Atlas
```

*Apache 2.0 LICENSE is in repo root. Detectable in About section.*
*Verify before submission via: `gh repo view StephenSook/Hometown-Pathway-Atlas --json licenseInfo`*

### Did you add Reproducible Testing instructions to your README? *(REQUIRED)*

```
Yes
```

The README "Run locally" section covers frontend (`npm install
--legacy-peer-deps && npm run dev`), backend (`uv sync && uvicorn`),
and Cloud Run deploy via the runbook. Sentinel ZIP `00000` exercises
the error path. Mock data lets the frontend run standalone for judges
who skip backend setup.

### Test login credentials

```
No login required. The app is fully public — visit the live URL and
type a ZIP code (try 30060 for Cobb County, GA, our anchor region for
the demo flow). Sentinel ZIP 00000 triggers the error path so judges
can verify the toast + error UX.
```

---

## Page 6 — Google Cloud proof + datasets

### Prove your Project's backend is running on Google Cloud *(REQUIRED — URL)*

**Primary (preferred):** `{{Day 8: Vinh's backend Cloud Run URL — https://atlas-backend-xxxxxx-uc.a.run.app}}`

**Fallback (use if backend deploy is delayed):**
```
https://hello-gemini-635524063449.us-central1.run.app/
```

The hello-gemini Cloud Run service was deployed Day 2 as the GCP
toolchain end-to-end verification. It returns a Gemini-generated
welcome message via Vertex AI:
`{"message":"Welcome, and we're thrilled to share our hack!"}`

**Code-file alternative** (if Devpost wants a code link not a live URL):
```
https://github.com/StephenSook/Hometown-Pathway-Atlas/blob/main/backend/services/gemini_service.py
```
*(once Vinh ships task 2.7 GeminiService — file path may differ; verify Day 8.)*

### URL to the hosted Project for judging *(optional — but include it!)*

```
{{Day 8: Cloud Run frontend URL — https://atlas-frontend-xxxxxx-uc.a.run.app}}
```

### Which datasets did you use? *(REQUIRED — list/name)*

```
- USOPC published Team USA roster, Olympic + Paralympic, 2016-2024 cycles
- US Census ACS 5-year population (county denominator for per-capita normalization)
- NFHS 2023-24 Athletics Participation Survey (high school athletics context)
- HUD ZIP-County Crosswalk (ZIP → county FIPS resolution)
- nClimGrid 5km gridded county climate normals
- Move United chapter directory (display-only, never load-bearing in similarity matching)
- Aspen Institute Project Play, State of Play 2024 (TAM cited in business framing)
- Internal aggregation: county_profiles.parquet + similarity_matrix.parquet, precomputed at build time, baked into the backend container
```

---

## Pre-submit checklist

Day 9 evening, before clicking submit:

- [ ] All `{{double-brace}}` placeholders filled in
- [ ] Project name + elevator pitch character counts re-verified
- [ ] Demo video uploaded to Devpost OR YouTube unlisted (URL in
      Project Story or "Try it out" links)
- [ ] Thumbnail image uploaded (3:2 ratio, ≤5MB)
- [ ] 3-5 image gallery screenshots uploaded
- [ ] Live frontend URL works (curl + browser smoke test)
- [ ] Live backend URL works (curl /healthz or similar)
- [ ] Apache 2.0 LICENSE detectable in repo About sidebar
- [ ] Reproducible Testing answered "Yes" + README has the section
- [ ] Stephen watches demo video 3× for NIL/IOC-USOPC/causal scan
- [ ] Vinh watches demo video 1× for sign-off
- [ ] State + Submitter Type dropdowns selected
- [ ] All required fields (asterisked) filled
- [ ] Test the "Save & continue" button on each page (no validation errors)
- [ ] Final review: project page preview matches expectations

After submit:
- [ ] Pin Cloud Run URLs in CLAUDE.md so future sessions know where the
      live app lives
- [ ] Set Cloud Run min-instances back to 0 (was 1 for demo recording
      window — saves cost)
- [ ] Take a victory screenshot of the submitted Devpost project page

<!--
  Hometown Pathway Atlas — backup pitch deck.

  PURPOSE: emergency fallback if the live-app demo video render breaks
  on Day 10/11. Atlas IS the slide (per pitch_script.md §Slides). This
  deck only ships if Cloud Run is hard down + the recorded backup video
  ALSO fails. Order of fallback:
    1. Live Cloud Run app (primary — pitch_script.md beats)
    2. Pre-recorded screen capture (Day 9 record)
    3. Localhost dev server (sub-30s switch)
    4. THIS DECK (last resort — slides only, no live demo)

  RENDER (PDF):
    npx @marp-team/marp-cli@latest docs/pitch_deck.md --pdf \
      --allow-local-files --html

  RENDER (PPTX):
    npx @marp-team/marp-cli@latest docs/pitch_deck.md --pptx \
      --allow-local-files --html

  EDIT: source-of-truth narration is docs/pitch_script.md. This deck
  mirrors those beats — keep them in sync. If you change a Pillar 5
  number here, update docs/pitch_pillar5.md (drift CI in
  scripts/check-pillar5-drift.mjs will catch the stale number on
  next commit).
-->

---
theme: default
paginate: true
header: ''
footer: 'Hometown Pathway Atlas · Team USA × Google Cloud Hackathon Challenge 2 · 2026'
style: |
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root {
    --navy: #1F3A5F;
    --olympic-blue: #2E6BA6;
    --paralympic-clay: #B96B5C;
    --warm-neutral: #F5F1EB;
    --card-white: #FFFFFF;
    --soft-border: #E8E3D8;
    --body-text: #2A2D3A;
    --muted-text: #6B7280;
    --accent-teal: #4A8B8B;
    --status-amber: #D97706;
    --status-danger: #B91C1C;
  }

  section {
    background: var(--warm-neutral);
    color: var(--body-text);
    font-family: 'Inter', sans-serif;
    font-weight: 300;
    padding: 60px 80px;
    line-height: 1.45;
  }

  h1 {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 2.4em;
    color: var(--navy);
    letter-spacing: -0.015em;
    line-height: 1.05;
    margin-bottom: 0.3em;
  }

  h2 {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-weight: 400;
    font-size: 1.35em;
    color: var(--muted-text);
    margin-top: 0;
    margin-bottom: 1.2em;
  }

  h3 {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    font-size: 0.7em;
    color: var(--muted-text);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    margin-bottom: 0.8em;
  }

  strong { color: var(--navy); font-weight: 600; }
  em { font-family: 'Instrument Serif', serif; font-style: italic; }

  blockquote {
    border-left: 4px solid var(--olympic-blue);
    padding: 4px 0 4px 24px;
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 1.25em;
    color: var(--navy);
    margin: 0.8em 0;
    line-height: 1.4;
  }

  code {
    font-family: 'JetBrains Mono', monospace;
    background: var(--card-white);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.85em;
    border: 1px solid var(--soft-border);
    color: var(--navy);
  }

  pre {
    background: var(--card-white);
    border: 1px solid var(--soft-border);
    border-radius: 8px;
    padding: 16px;
    font-size: 0.75em;
  }

  table {
    border-collapse: collapse;
    margin: 0.8em 0;
    font-size: 0.85em;
    width: 100%;
  }

  th {
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.75em;
    color: var(--muted-text);
    text-align: left;
    padding: 8px 16px 8px 0;
    border-bottom: 2px solid var(--navy);
    font-weight: 500;
  }

  td {
    padding: 8px 16px 8px 0;
    border-bottom: 1px solid var(--soft-border);
    vertical-align: top;
  }

  ul, ol { padding-left: 1.2em; margin: 0.6em 0; }
  li { margin-bottom: 0.4em; }

  a { color: var(--olympic-blue); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }

  hr {
    border: 0;
    border-top: 1px solid var(--soft-border);
    margin: 1.2em 0;
  }

  section.lead {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    text-align: left;
    padding-left: 100px;
    padding-right: 100px;
  }

  section.lead h1 { font-size: 3.6em; max-width: 16ch; margin-bottom: 0.5em; }
  section.lead h2 { font-size: 1.5em; max-width: 42ch; }
  section.lead .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8em;
    text-transform: uppercase;
    letter-spacing: 0.25em;
    color: var(--paralympic-clay);
    margin-bottom: 2em;
  }

  section.divider {
    background: var(--navy);
    color: var(--card-white);
    display: flex;
    align-items: center;
    padding-left: 100px;
  }

  section.divider h1 {
    color: var(--card-white);
    border-left: 4px solid var(--paralympic-clay);
    padding-left: 24px;
    font-size: 2.2em;
  }

  section.divider h3 { color: var(--soft-border); }

  section.stat {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-left: 100px;
    padding-right: 100px;
  }

  section.stat .big-stat {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 6em;
    line-height: 1;
    color: var(--paralympic-clay);
    font-weight: 400;
    margin: 0.2em 0;
  }

  section.stat .stat-context {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 1.6em;
    color: var(--navy);
    max-width: 24ch;
    line-height: 1.25;
  }

  section.stat .stat-source {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7em;
    color: var(--muted-text);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-top: 2em;
  }

  .pillar-tag {
    display: inline-block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65em;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    background: var(--navy);
    color: var(--warm-neutral);
    padding: 4px 10px;
    border-radius: 4px;
    margin-bottom: 1em;
  }

  .compliance-card {
    background: var(--card-white);
    border: 1px solid var(--soft-border);
    border-radius: 8px;
    padding: 16px 20px;
    margin: 0.8em 0;
    font-size: 0.85em;
  }

  .compliance-card.fail { border-left: 4px solid var(--status-amber); }
  .compliance-card.fixed { border-left: 4px solid var(--accent-teal); }
  .compliance-card .label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--muted-text);
    margin-bottom: 6px;
  }
  .compliance-card .quote {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    color: var(--navy);
    font-size: 1em;
  }

  footer {
    color: var(--muted-text);
    font-size: 0.55em;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.05em;
  }
  section::after {
    color: var(--muted-text);
    font-size: 0.7em;
    font-family: 'JetBrains Mono', monospace;
  }
---

<!-- _class: lead -->
<!-- _paginate: skip -->

<div class="eyebrow">Hometown Pathway Atlas</div>

# Your county Team USA story.

## Per-capita parity. County granularity. Conditional phrasing only. The single per-county lens nobody else has.

---

<!-- _class: stat -->

<div class="pillar-tag">Pillar 1 — real problem, specific people</div>

<div class="big-stat">63%</div>

<div class="stat-context">of 2024 U.S. Paralympic athletes came through one national network of community-based adaptive sports chapters.</div>

<div class="stat-source">Source: Move United 2024 Impact Report — 141 of 225 athletes</div>

That network reaches only a fraction of U.S. counties. A kid in Cobb County wanting to know if anyone from a place like hers ever made Team USA — has no way to find out.

---

# How Atlas works.

## ZIP in. County out. Parity preserved.

| Step | What happens |
|------|--------------|
| **Type a ZIP** | Atlas resolves to county FIPS — the analytical unit nobody else uses for this question |
| **Per-capita normalize** | Empirical Bayes shrinkage so a single small county doesn't blow up the signal |
| **Rank separately** | Olympic + Paralympic shown side-by-side, never merged, ranked by percentile rank |
| **Find analogs** | Three weighted dimensions — athlete profile (40%), sport mix (35%), climate (25%) |
| **Audit every claim** | Hybrid auditor — deterministic regex + Gemini semantic causal-tone analysis |

<h3>Locked architectural rules — never violated</h3>

Hometown is the recognized Team USA roster hometown — not birthplace, not training residence. Baseline window 2016–2024. Top 3 analogs span ≥ 2 different MSAs.

---

<!-- _class: divider -->

<h3>Live demo — Cobb County, GA</h3>

# Three counties our similarity model could be associated with.

---

# Cobb County, Georgia. Population 766,000.

## Olympic and Paralympic shown together, never merged.

| Metric | Olympic | Paralympic |
|--------|---------|------------|
| **Per 100k** | 1.83 | 0.39 |
| **Percentile rank** | 76th | 68th |
| **Evidence count** | 14 athletes | 3 athletes |

<h3>Three peer analogs — auditor-confirmed</h3>

| Analog | Similarity drivers |
|--------|-------------------|
| **Mecklenburg County, NC** | Athlete profile + sport mix overlap, humid-subtropical climate match |
| **Wake County, NC** | Sport mix + climate match, comparable youth population density |
| **Jefferson County, AL** | Athlete profile match, comparable per-capita signal across both Games |

<h3>Three pattern gaps surfaced</h3>

Observed strength: swimming over-indexes. Public access signal: adaptive aquatics presence is sparse in our indexed sources. Opportunity hypothesis: where strong representation coexists with limited access, a pattern gap may exist — *interpretation only, not causation*.

---

<!-- _class: divider -->

<h3>Pillar 4 — technology as inevitable answer</h3>

# AI safety as a UI surface. Not a postmortem.

---

# The audit ran while you were looking at the data.

<h3>Compliance Log ★ — judge-visible, real-time</h3>

<div class="compliance-card fail">
<div class="label">Gemini causal-tone check — caught</div>
<div class="quote">"Cobb County PRODUCES Olympic athletes."</div>
</div>

<div class="compliance-card fixed">
<div class="label">Hybrid auditor — rewrote conditionally</div>
<div class="quote">"Cobb County could be associated with Olympic representation patterns."</div>
</div>

Two layers — deterministic regex catches obvious banned verbs ("produces", "creates", "leads to"); Gemini semantic analysis catches causal tone the regex can't. If either fires, the auditor rewrites conditionally before serving.

The audit log IS the Compliance Log. **AI safety as a UI surface, not a postmortem.**

---

# Tech proof.

## Cloud Run on Google Cloud. FastAPI backend. React frontend. Vertex AI Gemini with structured output schemas. Apache 2.0 repo. Reproducible.

| Layer | Stack |
|-------|-------|
| **Frontend** | React 19 + Vite 8 + TypeScript strict + Tailwind v3 |
| **Backend** | FastAPI + Python 3.12 + Pydantic v2 |
| **AI** | Vertex AI Gemini 2.5 Flash, structured-output JSON schemas |
| **Data** | Precomputed parquet baked into backend container |
| **Hosting** | Cloud Run × 2 services, us-central1 |
| **License** | Apache 2.0 — full stack documented + reproducible |

<h3>Code surface — the full stack including the hybrid auditor is documented</h3>

`backend/services/auditor.py` — hybrid regex + Gemini semantic causal-tone catch
`backend/services/gemini_service.py` — structured output Pydantic schemas
`frontend/src/components/ComplianceLog.tsx` — audit-stream UI, judge-visible
`scripts/check-conditional-phrasing.mjs` — pre-commit drift guard

---

<!-- _class: divider -->

<h3>Pillar 5 — business numbers</h3>

# A single per-county lens nobody else has.

---

# Pillar 5 numbers.

<h3>Total addressable market</h3>

**~50 million** US children in the addressable youth-sports market. *Source: Aspen Institute Project Play, State of Play 2024 — children ages 6–17.*

<h3>Existing aggregators with this exact lens</h3>

**Zero.** No public product aggregates Olympic + Paralympic representation at county FIPS granularity with parity discipline.

<h3>Distribution surfaces</h3>

| Channel | Reach | Model |
|---------|-------|-------|
| **State recreation departments** | ~20,000 high schools | B2G partnerships |
| **National Governing Bodies** | 50 NGBs (USOPC roster) | B2B licensing |
| **Open-data adjacency** | Researchers, journalists | Apache 2.0 reuse |

Surfaces signals relevant to fans, parents, NGB recruiters, and state recreation programs — through a single per-county lens nobody else has built.

---

<!-- _class: lead -->

<div class="eyebrow">Built in 10 days. Live now.</div>

# Per-capita parity. County granularity. Audit-grade compliance.

## The single per-county lens nobody else has.

---

<!-- _class: divider -->

<h3>Appendix — anticipated Q&A</h3>

# The honest answers behind the numbers.

---

# Q&A — anticipated questions.

<h3>Where does the ~50M TAM come from?</h3>

Aspen Institute Project Play, State of Play 2024 — children ages 6–17 in the addressable youth-sports market. Roughly 27 million play organized sports (NSCH + SFIA cross-cuts). Atlas uses the broader denominator for TAM.

<h3>Why per capita and not raw counts?</h3>

Raw counts privilege megacounties. A small county whose Team USA athletes appear at twice the per-capita rate of Los Angeles represents stronger pathway signal. Empirical Bayes shrinkage handles both — small counties don't blow up the signal, big counties don't drown it.

<h3>How does the auditor work?</h3>

Two layers. Deterministic regex catches obvious banned verbs. Gemini semantic analysis catches causal tone the regex can't. If either fires, the auditor rewrites conditionally before serving. The audit log is the Compliance Log on screen.

<h3>Hardest engineering problem?</h3>

Two. **Parity discipline** — Olympic and Paralympic visually + analytically symmetric so the product never accidentally centers Olympic. **The auditor catching its own outputs in the UI in real time** — Pillar 4.

<h3>What's next?</h3>

Layer A — surfacing the most counter-intuitive county pattern from the dataset (candidate identified). Layer C — multimodal Gemini Live region Q&A. Temporal layer across 2016–2024 Games.

---

<!-- _class: lead -->
<!-- _paginate: skip -->

<div class="eyebrow">Stephen Sookra · Vinh Le · 2026</div>

# Thank you.

## Live: https://atlas-frontend-{deploy}.run.app · Repo: github.com/StephenSook/Hometown-Pathway-Atlas

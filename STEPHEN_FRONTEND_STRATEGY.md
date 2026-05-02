# Stephen — Frontend Execution Strategy

> Companion doc to PLAN.md. Reference throughout the build. Optimized for Maximum Scope frontend execution and ambitious-layer integration.
>
> **Owner:** Stephen Sookra
> **Counterpart:** Vinh Le (backend)
> **Submission deadline:** May 11, 2026 — 5:00 PM PT
> **Strategy:** Conservative frontend ships by Day 6 Gate. NYT/Pudding-grade polish (Layer B) woven in from Day 1 — not bolted on later.

---

## 1. Philosophy

Three rules I'm holding myself to.

### Rule 1: Polish degrades gracefully. Conservative ships.
Every component I build needs to look acceptable at minimum-viable state and exceptional at fully-polished state. If I run out of time on Day 9, the component still ships at a reasonable level — not broken. This means NO last-minute micro-interaction injection that breaks the existing flow.

### Rule 2: The Compliance Log is the technical-depth showcase.
The 30% Technical Depth criterion is partially mine to win. The judge watching the demo video sees Gemini doing real reasoning AND being audited live. This is the "make invisible technical depth visible" moment. I budget Day 5 fully on this animation — it's not optional polish, it's the centerpiece.

### Rule 3: Visual ambition is built INTO components from Day 2, not retrofitted.
Layer B (NYT/Pudding-grade) is woven in from Day 2 — Framer Motion installed Day 2, custom illustrations sourced Day 3, micro-interactions on every interactive element by Day 5. If I try to "polish at the end" I'll either burn out trying or ship sober-clean (which is the conservative floor — fine, but not Grand Prize).

---

## 2. Stack (locked)

| Layer | Tool | Notes |
|-------|------|-------|
| Framework | React 18 + Vite + TypeScript (strict mode) | Per architecture spec §8.1 |
| Styling | Tailwind CSS 3.4+ | Custom theme tokens for Atlas palette |
| Component primitives | shadcn/ui | Mirror Trace setup. Cherry-pick only what we need. |
| Animation | Framer Motion 11+ | Page transitions, micro-interactions, Compliance Log slides. |
| Maps | react-simple-maps + TopoJSON | County choropleth. No API key. |
| Charts | Recharts | Sport mix bars, parity comparison. |
| Data | TanStack React Query 5+ | Server state. Stale-while-revalidate for analog drill-downs. |
| HTTP | Native `fetch` wrapped in `lib/api.ts` | Mirror Trace `api.ts` pattern with `ApiError` class. |
| Forms | React Hook Form (only if needed) | ZIP input is so small I may skip this. |
| Icons | Lucide React | Match shadcn/ui default. |
| Routing | React Router 6 | Single route initially; add `/region/:fips` if drill-down needs deep links. |
| Sound | Howler.js (Layer B optional) | Demo video narration only — not in app. |

### Dependencies to install Day 1 (after Vite scaffold)

```bash
# Core
npm i react react-dom react-router-dom
npm i -D typescript @types/react @types/react-dom

# Tailwind + shadcn/ui prereqs
npx tailwindcss init -p
npx shadcn@latest init   # accept defaults except: New York style, Slate base, CSS vars yes

# Animation + map + charts
npm i framer-motion react-simple-maps topojson-client recharts
npm i -D @types/react-simple-maps @types/topojson-client

# Data
npm i @tanstack/react-query

# Quality
npm i -D vitest @testing-library/react @testing-library/jest-dom
npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Notifications
npm i sonner
```

---

## 3. Visual Design System (lock Day 1–2)

### Palette — the Atlas Editorial palette

| Role | Hex | Use |
|------|-----|-----|
| Primary surface | `#FFFFFF` (light) / `#0F1B2D` (dark optional) | Background |
| Primary text | `#1C2433` | Body copy |
| Brand navy | `#1F3A5F` | Headers, primary buttons |
| Accent blue | `#2E75B6` | Links, active state, source-county highlight |
| Olympic accent | `#5B7DB1` (cool blue) | ParityPanel left column |
| Paralympic accent | `#B96B5C` (warm clay) | ParityPanel right column. Distinct hue, equal weight visually. |
| Warm neutral | `#F5F1EB` | Card backgrounds, evidence labels |
| Soft border | `#E7E2D9` | Card borders |
| Muted text | `#6B7280` | Captions, methodology footnotes |
| Success | `#2E8B57` | Compliance Log "pass" / "fixed" |
| Warning | `#D97706` | Compliance Log "fail caught" |
| Danger | `#B91C1C` | Hard errors (rare) |

**Anti-pattern (DO NOT USE):** red/white/blue combo, gold/silver/bronze gradients, Olympic-ring-adjacent compositions, flag motifs.

### Typography

```css
/* tailwind.config.ts */
fontFamily: {
  sans: ['"Inter"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
  serif: ['"Source Serif Pro"', 'Georgia', 'serif'],   // optional editorial accent
  mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'], // for Compliance Log entries
}
```

| Use | Family | Size | Weight |
|-----|--------|------|--------|
| Hero | Inter | 56–72px | 600 |
| Page title | Inter | 32–40px | 600 |
| Section heading | Inter | 20–24px | 600 |
| Body | Inter | 16px | 400 |
| Metric numbers | Inter Tabular | 28–40px | 700 |
| Caption / methodology | Inter | 13px | 400 (italic OK) |
| Compliance Log | JetBrains Mono | 12px | 400 |

### Spacing + layout

- 8px grid. Use Tailwind's default scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64).
- Generous whitespace — NYT interactive feel, not sports-app density.
- Max content width 1200px on desktop. Hero pages 880px.
- Mobile: single column, all metrics stack, ParityPanel renders vertical (Olympic above, Paralympic below — never sacrificing parity).

### Motion language (Framer Motion presets)

```ts
// frontend/src/lib/motion.ts
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export const slideInRight = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export const stagger = (delayChildren = 0.06) => ({
  animate: { transition: { staggerChildren: delayChildren } },
});

export const complianceLogEntry = {
  initial: { opacity: 0, x: -8, height: 0 },
  animate: { opacity: 1, x: 0, height: 'auto', transition: { duration: 0.25 } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.15 } },
};
```

Rule of thumb: every state change ≥ 200ms gets a transition. Hover states ≥ 100ms. Page transitions 350–500ms.

---

## 4. Component build order + integration plan

### Day 1 — PM (~3–4hr after GCP setup)

- [ ] Vite scaffold inside `frontend/` (per `npm create vite@latest`)
- [ ] Install all Day-1 deps from §2
- [ ] Tailwind config with palette tokens (§3)
- [ ] Folder skeleton: `src/{pages,components,hooks,lib,styles,scrollytelling}`
- [ ] `lib/api.ts` — typed fetch wrapper + `ApiError` class. Mirror Trace pattern. **Use `import.meta.env.VITE_API_BASE_URL`** for backend URL — defaults to `http://localhost:8000`.
- [ ] `lib/motion.ts` — Framer Motion presets (§3)
- [ ] `lib/format.ts` — number formatting helpers (`fmtPercent`, `fmtPerCapita`, `fmtPopulation`)
- [ ] Wireframe sketches for HomePage + ResultsPage (Figma or paper — doesn't matter, just decide layout)

### Day 2 — Skeleton + mocks

- [ ] `pages/HomePage.tsx` — hero copy, ZipInput, single CTA
- [ ] `components/ZipInput.tsx` — 5-digit validation, accessible label, sonner-friendly error state
- [ ] `components/RegionProfile/RegionHeader.tsx` — county name, state, MSA label, population
- [ ] `components/RegionProfile/ParityPanel.tsx` — **side-by-side O/P metrics with EvidenceLabel badges. Never merge.**
- [ ] `lib/mocks.ts` — match every API contract in PLAN.md Shared Contracts table EXACTLY. This is the contract. Drift here = drift in the integration.
- [ ] Layer B baseline: Framer Motion installed + first transition (page-level fadeUp)

### Day 3 — Analogs + map

- [ ] `components/AnalogList/AnalogList.tsx` — 3-card horizontal layout (stacks vertical mobile)
- [ ] `components/AnalogList/AnalogCard.tsx` — county header, similarity breakdown bars, drill-down CTA
- [ ] `components/AnalogList/SimilarityBreakdown.tsx` — three Recharts radial bars (athlete / sport mix / climate)
- [ ] `components/AnalogList/TradeoffPanel.tsx` — expandable Gemini explanation
- [ ] `components/CountyMap/CountyMap.tsx` — TopoJSON US counties choropleth, source highlighted, 3 analog pins
- [ ] `components/CountyMap/CountyTooltip.tsx` — hover state (county name + key metric)
- [ ] Layer B: custom illustrated map elements (subtle accent shapes overlaying choropleth — illustrator/SVG sources OK)

### Day 4 — Pattern Gaps + Compliance Log structure + React Query wiring

- [ ] `components/PatternGapPanel/PatternGapPanel.tsx` — three category sections
- [ ] `components/PatternGapPanel/GapCard.tsx` — claim, evidence, confidence badge
- [ ] `components/PatternGapPanel/GapCategoryBadge.tsx` — observed / public_access / hypothesis
- [ ] `components/ComplianceLog/ComplianceLog.tsx` — fixed bottom panel OR right sidebar (decide by visual test). Two-column: Rules | Gemini.
- [ ] `components/ComplianceLog/LogEntry.tsx` — pass/fail/fixed status colors, expandable detail
- [ ] `components/ComplianceLog/LayerIndicator.tsx` — visual differentiation between Rules and Gemini layers
- [ ] `hooks/useRegion.ts`, `hooks/useAnalogs.ts`, `hooks/usePathway.ts` — React Query hooks
- [ ] Switch from mocks to live local backend (Vinh's `/api/region` should be live by Day 4 PM per PLAN.md task 2.6)
- [ ] End-to-end happy path: enter ZIP → see real data from Vinh's local backend

### Day 5 — Compliance Log animation (THE DEMO MOMENT)

This day is sacred. Don't add new features. Polish the auditor flow until it's cinematic.

- [ ] Streaming entry animation (`complianceLogEntry` preset — slide + fade)
- [ ] Pass entries: gray dot, brief check name, no expansion
- [ ] Fail entries: warning amber dot, expands to show what was caught
- [ ] Fixed entries: success dot, expands to show before → after rewrite
- [ ] Test the failure case Vinh provides for Scene 4 of demo. Confirm the flow is reliable.
- [ ] Layer B: Add subtle sound design hooks (cued only in demo recording, off in app — Howler.js conditional load)

### Day 6 — Polish + Pillar 5 lock + Day 6 Gate

- [ ] Loading states: skeleton UIs that match the final component shape (no spinners in components — only at page level)
- [ ] Error states: sonner toasts with friendly recovery copy
- [ ] Empty states: "Limited data for this region — here are three peer regions that share its geographic and climate signature" (per the rural/tribal fallback in PLAN.md)
- [ ] Mobile responsive pass — all components stack cleanly < 768px
- [ ] Accessibility pass: keyboard nav, ARIA labels on every interactive element, color contrast ≥ 4.5:1 for body text
- [ ] **Pillar 5 lock:** write `docs/pitch_pillar5.md` with TAM (NGB recruitment ~6K, youth athletic households ~50M, school athletics ~13K), cost-of-incident framing, B2B/B2G revenue model. **30 min exercise, do not skip.**
- [ ] **Day 6 Gate self-test:** run through PLAN.md checklist. If anything fails, freeze ambitious work tomorrow.

### Day 7 — Demo prep + Layer C + Layer D start

- [ ] Pick demo hero ZIPs (3 regions) per criteria in `docs/03_demo_outline.docx` Scene 2
- [ ] Pre-warm cache for hero ZIPs (Vinh ensures backend has these cached)
- [ ] Pitch script v1 draft — match to 6-scene demo storyboard
- [ ] **Layer C frontend:** Q&A panel below RegionProfile (only if Vinh's spike succeeded Day 5 morning)
- [ ] **Layer D — Scrollytelling chapters:** start. 3–4 chapters anchored on Layer A's surfaced stats. Use `react-intersection-observer` for chapter triggers, Framer Motion for reveals.

### Day 8 — Containerize + deploy + production test + Layer B finalization

- [ ] `frontend/Dockerfile` — multi-stage Vite build → nginx serve
- [ ] Deploy to Cloud Run: `gcloud run deploy pathway-atlas-frontend --source . --region us-central1 --allow-unauthenticated`
- [ ] Configure CORS — backend `FRONTEND_ORIGIN` env var = frontend Cloud Run URL
- [ ] Production end-to-end test: 20 sample ZIPs across regions
- [ ] Pitch script v2 with timing — practice 3x
- [ ] Layer B finalization: any last polish on transitions, micro-interactions, custom illustrations

### Day 9 — Demo recording day

- [ ] Lock 6-scene demo script (final). Read aloud 5+ times.
- [ ] Lock demo ZIPs. Verify pre-warmed.
- [ ] Screen recording: full demo run-through 1080p60. OBS or QuickTime. Multiple takes per scene.
- [ ] Voiceover recording in quiet room. Best take per scene.
- [ ] GCP Console + Vertex AI usage page captures (5–7 sec clips each)
- [ ] GitHub repo screenshot showing Apache 2.0 in About section
- [ ] If Compliance Log fail-and-rewrite isn't reliable, use the parity-mention auditor backup (per demo outline)

### Day 10 — Edit + upload + Devpost draft

- [ ] Edit demo video in DaVinci Resolve / Premiere / FCP. Match VO to capture.
- [ ] Background music: YouTube Audio Library or Epidemic Sound free tier (NO copyrighted samples)
- [ ] Watch full video 3 times — NIL / IOC / causal language scan
- [ ] Vinh watches once with fresh eyes
- [ ] Upload to YouTube as **UNLISTED** (verify the setting twice)
- [ ] English captions (auto + manual correction)
- [ ] Devpost submission draft: title, tagline, short description, full writeup, video URL, GCP proof links

### Day 11 — Buffer + submit

- [ ] Final review of pitch text
- [ ] Verify video plays without auth
- [ ] Verify hosted URL works without auth
- [ ] Verify Apache-2.0 LICENSE detectable in About section
- [ ] **Submit by 4pm PT** to leave 1hr buffer before 5pm deadline

---

## 5. The Compliance Log animation in detail

This is my single highest-leverage component. Council called it "making invisible technical depth visible." It's the Pillar 4 demo moment.

### Visual layout
- Fixed-position panel: bottom-right desktop, bottom drawer mobile
- Two columns headed `RULES` and `GEMINI` (or stacked vertically on narrow widths)
- Width ~360px desktop, full-width drawer mobile
- Subtle 1px border + soft shadow, warm neutral background
- Header strip: "Live audit" + green pulse dot

### Entry shape
```tsx
type LogEntry = {
  layer: 'rules' | 'gemini';
  check: string;            // 'no_athlete_names', 'causal_tone', 'rewrite'
  status: 'pass' | 'fail' | 'fixed';
  details?: string;
  ts: string;               // ISO8601 from backend
  before?: string;          // for 'fixed' entries
  after?: string;           // for 'fixed' entries
};
```

### Animation choreography
1. Entry slides in from left, opacity 0 → 1, y 8 → 0, height 0 → auto. 250ms.
2. Status dot pulses once on mount.
3. `pass` entries auto-collapse after 1.5s — keep the panel uncluttered.
4. `fail` entries stay expanded, show banned phrase highlighted in amber.
5. `fixed` entries replace `fail` in place: amber → success transition (300ms color crossfade), expanded to show before → after diff.

### The demo moment timing (from `docs/03_demo_outline.docx` Scene 4)
- 1:25–1:30 — User scrolls / camera "zooms" into Compliance Log panel
- 1:30–1:38 — `causal_tone` FAIL entry appears with red dot, expands to show "Draft contained 'produces athletes.'"
- 1:38–1:46 — `rewrite` entry appears below: green dot, before / after side-by-side
- 1:46–1:55 — Camera pulls back. Final narrative on the page is the rewritten version.

### Reliability
The backend (`HybridAuditor` task 2.10) emits the log array on every `/api/region` response. I render it directly. **The animation must work even if the backend doesn't trigger a fail case** — for the demo recording, Vinh and I pre-stage an evidence packet that reliably triggers a causal-tone fail. If it's flaky in test recording, fall back to the parity-mention check (per demo outline backup).

---

## 6. Layer B (NYT/Pudding-grade) — woven not bolted

Layer B isn't a single feature — it's a discipline applied to every component from Day 2. Here's how it shows up at each layer:

| Component | Standard | Layer B treatment |
|-----------|----------|-------------------|
| `ZipInput` | Plain text input | Animated focus ring, Tab-key affordance, smooth submit transition that morphs into loading state |
| `RegionHeader` | Static text block | Type-in animation on county name (CharSplit), MSA label slides in from below, parallax on scroll |
| `ParityPanel` | Side-by-side stat cards | Counter-up animation on numbers (count from 0 to value over 800ms), evidence badges fade in 200ms staggered |
| `SportMix` | Recharts bar | Custom bar shape (rounded ends), color gradient by z-score, hover reveals sport icon (Lucide) |
| `ClimateBadge` | Text label | Custom illustrated icon (sun, snowflake, droplet) with subtle SVG animation |
| `CountyMap` | Default react-simple-maps choropleth | Custom illustration overlay (subtle topographical accents), source county pulses, analog pins with connecting Bezier curves |
| `AnalogCard` | Card with metric breakdown | Hover reveals expanded breakdown, click animates a "twin lines" visual connecting source ↔ analog on map |
| `PatternGapPanel` | Three sections | Each gap card uses a custom typography treatment by category — Observed Strength is bold + italic, Public Access Signal is muted + caveated, Opportunity Hypothesis is sketch-style border |
| `ComplianceLog` | Plain log feed | The full animation choreography in §5 |

### Custom illustrations source

Free SVG sources to mine (license-clear):
- **Hero patterns** — heropatterns.com (CC BY 4.0)
- **unDraw** — undraw.co (MIT) — generic editorial illustrations
- **Iconify** — iconify.design (various licenses, mostly MIT) — large icon library

For the map illustrations specifically, I'll either source US topographical SVG accents from public-domain USGS maps OR draw simple custom SVG paths in Figma and export.

### Layer B cut philosophy
Polish degrades gracefully. If I run out of time on Day 8:
- Drop hover micro-interactions first (low-impact)
- Drop counter-up animations second
- Drop custom map illustrations third (fallback to clean default choropleth)
- KEEP Compliance Log animation (it's the demo moment, not optional polish)

---

## 7. Frontend tasks I can pre-empt for the backend

Per Stephen's note: "I want you to help me guide our frontend processing on everything we can do to help on the backend."

Here's where the frontend can reduce backend load or improve integration:

1. **Build mocks first (Day 2).** Vinh doesn't need to deliver real `/api/region` until Day 4 PM. By matching mocks to the contract exactly, the frontend is integration-ready the moment Vinh ships.

2. **Cache aggressively.** React Query stale-while-revalidate keeps the experience snappy and reduces backend calls. For analog drill-downs, pre-fetch the next analog's `/api/region` on hover. Vinh's caching layer (task 2.11) handles the backend side; my React Query setup handles the client side.

3. **Pre-warm demo regions client-side.** Once demo ZIPs are picked Day 7, I'll add a small `useEffect` in HomePage that fires the 3 hero ZIPs through the cache the moment the app loads. By the time the demo cursor types the ZIP, the response is hot.

4. **Auditor regex contributions.** I'll maintain `frontend/src/lib/conditional_phrasing.ts` with the GOOD / BANNED phrase dictionary. Vinh imports the BANNED list into his Python regex auditor. Single source of truth for both sides.

5. **Compliance Log pre-render.** The log entries render live, but I can pre-compute the layout dimensions so there's no layout shift when entries arrive. CLS = 0 for the panel.

6. **Methodology footnote text.** I write the user-facing methodology disclosures (D8 hometown definition, D9 2016–2024 baseline, D2 adaptive access display-only) and Vinh links them in the Gemini system prompt so any narrative referencing methodology cites the same wording.

7. **Demo ZIP testing.** I run 20+ ZIPs through the system Day 7 and surface any data anomalies to Vinh BEFORE Day 8 deploy. Saves a deploy cycle.

---

## 8. Anti-patterns I'm not falling into

- ❌ **Sober-clean as default.** Looks fine. Loses Grand Prize. Layer B from Day 2.
- ❌ **Spinners in components.** Only at page level. Components use skeleton UIs that match final shape — preserves layout, looks intentional.
- ❌ **Olympic ring iconography or red/white/blue.** DQ-adjacent and aesthetically clichéd.
- ❌ **Causal language in any UI string.** "Cobb County produces swimmers" — banned. "Cobb County shows representation patterns in swimming" — required.
- ❌ **Hidden Paralympic data.** Toggling Paralympic off, putting it in a tab, making it secondary visually. Always parity, always side-by-side, equal hue weight.
- ❌ **Polishing at the end.** Layer B is Day 2 forward. Last-minute polish injection breaks existing flows.
- ❌ **Custom CSS where Tailwind utility works.** Maintainability matters in 10 days.
- ❌ **Skipping mobile responsive.** Judges may scroll on phones. Mobile pass Day 6 is mandatory.

---

## 9. The pitch I'm rehearsing

Three sentences I commit to memory by Day 7:

> "**63% of 2024 U.S. Paralympic athletes came through one network of community-based adaptive sports chapters — a network that exists in only a fraction of U.S. counties.** Most fans, most parents, most kids in places off the national map have no way to see whether anyone from a county like theirs has ever made Team USA. Hometown Pathway Atlas tells those stories — with parity, with evidence, and with the discipline a national audience deserves."

Three follow-ups for Q&A:

- **"Why county not state?"** State-level maps are saturated (Census, Bloomberg, CBS). County FIPS is where personal recognition lives. We aggregate over ~3,143 units, which is what makes "find your hometown" feel personal instead of generic.
- **"How are you showing parity?"** Per-capita normalization with Bayesian shrinkage on both sides. Percentile rank against each metric's own national distribution — never merged. Side-by-side display. Evidence labels on every metric so users see signal strength.
- **"What does Gemini actually do here?"** Three things. One: structured-JSON narrative generation over evidence packets, conditional phrasing enforced via response schema. Two: hybrid auditor — Gemini semantic causal-tone analysis paired with deterministic regex rules. Three (if Layer C ships): multimodal Q&A reasoning over current map state. The judge sees all three working in the demo.

---

## Addendum — DESIGN_SYSTEM.md is now source of truth (2026-05-01)

**Section 3 "Visual Design System (lock Day 1–2)" of this doc is SUPERSEDED by `DESIGN_SYSTEM.md`.** Do not implement from this doc's §3 — implement from DESIGN_SYSTEM.md §1 (Foundation), §4 (Component anatomy with all states), §5 (Motion choreography), §8 (Accessibility), §15 (Implementation Build Order).

This doc remains source of truth for:
- §1 Philosophy (3 rules: polish degrades / Compliance Log centerpiece / Layer B woven)
- §4 Daily component build order with day-by-day breakdown
- §7 Frontend → backend pre-emption ideas (mocks-first, cache aggressive, demo prefetch, auditor regex contributions, methodology footnotes)
- §8 Anti-patterns I'm not falling into
- §9 The pitch I'm rehearsing

When DESIGN_SYSTEM.md and this doc disagree on a visual decision (palette, typography, component anatomy), DESIGN_SYSTEM.md wins.

Critical updates to know:
- Custom climate SVGs: CUT. Use Lucide React icons per DESIGN_SYSTEM.md §6.1.
- Custom map illustrated accents: CUT for Day 6 Gate. Layer B opt-in only Day 8.
- Pillar 5 (Business Numbers): now has dedicated component spec — Pillar5Strip per DESIGN_SYSTEM.md §4.18. Place at Hero footer + AboutPage. Locked Day 6.
- ComplianceLog: must implement `demo-mode` prop per DESIGN_SYSTEM.md §4.16. Demo reliability requirement.
- Status enum: `pass | fail | fixed` lowercase. NEVER `PASS/FAIL/SUCCESS` (Vinh's contract).
- Olympic blue + Paralympic clay: large-text only on white (>=24px). Body text uses Navy.

Reference: `docs/moodboard/*.png` for visual targets.

---

_Last updated: 2026-05-01. Reference PLAN.md for status; reference architecture spec for system design; reference DESIGN_SYSTEM.md for visual identity; this doc is execution roadmap._

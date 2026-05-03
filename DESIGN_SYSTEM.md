# DESIGN_SYSTEM.md — Hometown Pathway Atlas Visual Identity Spec

> Single source of truth for visual identity, component anatomy, motion choreography, and accessibility. Supersedes STEPHEN_FRONTEND_STRATEGY.md §3 (visual design system) once committed. Read alongside REFERENCE_FINDINGS.md (research input) and `docs/moodboard/*.png` (visual targets).
>
> **Owner:** Stephen Sookra (frontend lead). Vinh Le invited to flag any contract drift between design system and `PLAN.md` Shared Contracts.
> **Locked:** 2026-05-01 after 4-reviewer adversarial pass (codex / devils-advocate / sookra-council / claude-council).
> **Archetype:** Editorial data journalism (NYT / Bloomberg / Pudding / Reuters / Census). NOT cinematic agency portfolio.

---

## Table of contents

1. [Foundation](#1-foundation)
2. [Layout system](#2-layout-system)
3. [Mobile-first breakpoint specs](#3-mobile-first-breakpoint-specs)
4. [Component anatomy](#4-component-anatomy) (17 components)
5. [Motion choreography](#5-motion-choreography)
6. [Illustration library](#6-illustration-library)
7. [Loading + error states](#7-loading--error-states)
8. [Accessibility (WCAG AA)](#8-accessibility-wcag-aa)
9. [Anti-patterns](#9-anti-patterns)
10. [Layer B polish targets](#10-layer-b-polish-targets)
11. [Reference moodboard index](#11-reference-moodboard-index)
12. [Source-of-truth mapping](#12-source-of-truth-mapping)
13. [Note for Vinh — Day 1 EOD review required](#13-note-for-vinh--day-1-eod-review-required)
14. [Note on moodboard image vs spec authority](#14-note-on-moodboard-image-vs-spec-authority)
15. [Implementation Build Order (component-first sequence)](#15-implementation-build-order-component-first-sequence)

---

## 1. Foundation

### 1.1 Color palette — Atlas Editorial

Reference: `docs/moodboard/06_palette_swatches.png`

| Role | Hex | RGB | Use |
|------|-----|-----|-----|
| **Brand navy** | `#1F3A5F` | rgb(31, 58, 95) | Headers, primary text, source-county highlight, primary buttons |
| **Olympic blue** | `#5B7DB1` | rgb(91, 125, 177) | ParityPanel left column, Olympic data series, analog pins. **USE: bar fills, large stat numbers (≥24px), icons. NEVER body text on white** (fails WCAG AA at small sizes) |
| **Paralympic clay** | `#B96B5C` | rgb(185, 107, 92) | ParityPanel right column, Paralympic data series, secondary CTAs. **USE: bar fills, large stat numbers (≥24px), icons. NEVER body text on white** (fails WCAG AA at small sizes) |
| **Warm neutral** | `#F5F1EB` | rgb(245, 241, 235) | Page background, card backgrounds where contrast needed |
| **Card white** | `#FFFFFF` | rgb(255, 255, 255) | Card surfaces over warm neutral page |
| **Soft border** | `#E7E2D9` | rgb(231, 226, 217) | Card borders, dividers |
| **Body text** | `#1C2433` | rgb(28, 36, 51) | All body copy |
| **Muted text** | `#6B7280` | rgb(107, 114, 128) | Captions, methodology footnotes, eyebrow labels |
| **Accent teal** | `#2E8B57` | rgb(46, 139, 87) | Status: verified data, ComplianceLog "pass" / "fixed" |
| **Status amber** | `#D97706` | rgb(217, 119, 6) | Status: pending/inferred, ComplianceLog "fail caught" |
| **Status danger** | `#B91C1C` | rgb(185, 28, 28) | Status: anomaly/outlier (rare — hard errors only) |

**Tri-color status semantic** (locked across all confidence/quality/severity surfaces):
- ✅ `#2E8B57` Accent teal = verified / passed / strong evidence
- ⚠️ `#D97706` Status amber = pending / partial / medium evidence
- ❌ `#B91C1C` Status danger = anomaly / failed / hard error (use sparingly)

**Anti-palette (DQ-adjacent or anti-pattern):**
- ❌ Pure black `#000` background
- ❌ Patriotic red `#FF0000` + blue `#0000FF` combo
- ❌ Olympic gold `#FFD700` + silver `#C0C0C0` + bronze `#CD7F32` gradient
- ❌ Neon highlights of any kind

### 1.2 Typography

Reference: `docs/moodboard/01_hero.png`, `docs/moodboard/03_analog_cards.png`

**Font families** (Google Fonts):
```css
--font-sans: 'Inter', 'IBM Plex Sans', system-ui, sans-serif;
--font-serif: 'Instrument Serif', 'Source Serif Pro', Georgia, serif;
--font-mono: 'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace;
```

**Type scale** (mobile → desktop, locked):

| Use | Family | Mobile | Desktop | Weight | Letter-spacing | Line-height |
|-----|--------|--------|---------|--------|---------------|-------------|
| Hero | Inter | 40px | 64-72px | 600 | -0.02em | 1.05 |
| Hero italic accent | Instrument Serif | 40px italic | 64-72px italic | 400 | -0.02em | 1.05 |
| Page title | Inter | 28px | 32-40px | 600 | -0.01em | 1.1 |
| Section heading | Inter | 18px | 20-24px | 600 | normal | 1.2 |
| Stat number (large) | Inter | 40px | 56-80px | 700 (tabular) | -0.02em | 1.0 |
| Stat number (medium) | Inter | 24px | 28-32px | 700 (tabular) | -0.01em | 1.05 |
| Body | Inter | 16px | 16-18px | 400 | normal | 1.5 |
| Body emphasis | Inter | 16px | 16-18px | 600 | normal | 1.5 |
| Caption | Inter | 12px | 13px | 400 | normal | 1.4 |
| Eyebrow label | JetBrains Mono | 11px | 12px | 500 uppercase | 0.2em | 1.3 |
| Compliance Log entry | JetBrains Mono | 11px | 12px | 400 | normal | 1.4 |
| Methodology footnote | Instrument Serif italic | 12px | 13px italic | 400 | normal | 1.5 |

**Italic accent rule:** Inside a heading set in Inter sans-serif, the *one or two* most semantically loaded words switch to **Instrument Serif italic** at the same px size. Examples (from moodboard):
- "Your county Team USA *story*" (01_hero.png)
- "Three regional *analogs*" (03_analog_cards.png)
- "Where representation *lives*" (07_scrollytelling.png)

Not every heading uses the italic accent. Use sparingly for emphasis — overuse dilutes the effect.

### 1.3 Spacing — 8px grid

```
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128
```

Tailwind token mapping: `p-1 / p-2 / p-3 / p-4 / p-6 / p-8 / p-12 / p-16 / p-24 / p-32`.

**Internal padding rule (per Steal #12):** All data cards and audit log rows use **24px** internal padding (Tailwind `p-6`). This single rule does most of the heavy lifting for "looks editorial, not portfolio."

### 1.4 Border radius

| Use | Value | Tailwind |
|-----|-------|----------|
| Cards (large) | 16px | `rounded-2xl` |
| Cards (medium) | 12px | `rounded-xl` |
| Buttons (primary) | 8px | `rounded-lg` |
| Pills (status, eyebrow, CTA secondary) | 9999px | `rounded-full` |
| Inputs | 9999px (pill) | `rounded-full` |
| Bars (in charts) | 4px | `rounded` |

### 1.5 Shadows + elevation

| Layer | Shadow | Tailwind |
|-------|--------|----------|
| Card resting | `0 1px 2px rgba(28,36,51,0.04), 0 4px 12px rgba(28,36,51,0.04)` | `shadow-sm` |
| Card hover | `0 4px 12px rgba(28,36,51,0.06), 0 8px 24px rgba(28,36,51,0.08)` | `shadow-md` |
| Floating nav pill | `0 2px 4px rgba(28,36,51,0.04), 0 8px 16px rgba(28,36,51,0.04)` | custom |
| Compliance Log panel | `0 4px 16px rgba(28,36,51,0.08)` | `shadow-lg` |
| Modal / overlay | `0 16px 48px rgba(28,36,51,0.12)` | `shadow-xl` |

No drop shadows on text. Subtle, not theatrical.

---

## 2. Layout system

### 2.1 Max widths

| Context | Max width | Notes |
|---------|-----------|-------|
| Hero / landing | 1200px (`max-w-[1200px]`) | Centered, generous |
| Reading content | 880px (`max-w-[880px]`) | Methodology, scrollytelling text columns |
| Region profile + analog cards | 1280px (`max-w-7xl`) | Three-card grid needs space |
| Mobile (any) | 100% padded 24px | No max-width on mobile |

### 2.2 Grid system

Tailwind 12-column grid. Common Atlas layouts:

| Layout | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| Hero | 1 col stacked | 1 col | 1 col centered max-w-[880px] |
| RegionProfile bento | 1 col stacked | 2 col 2x2 | 2 col 2x2 (ParityPanel + SportMix + Climate + AdaptiveAccess) |
| AnalogList | 1 col stacked | 1 col with sticky | 3 col `grid-cols-3 gap-6` |
| Scrollytelling chapter | 1 col stacked | 1 col | 40/60 split (`grid-cols-[40fr_60fr]`) — narrative left, map right |
| Compliance Log | bottom drawer | bottom drawer | fixed right sidebar 380px |

### 2.3 Section padding

| Section type | Mobile | Tablet | Desktop |
|--------------|--------|--------|---------|
| Hero | `py-12 px-6` | `py-16 px-8` | `py-24 px-8` |
| Standard | `py-8 px-6` | `py-12 px-8` | `py-16 px-8` |
| Compact | `py-4 px-4` | `py-6 px-6` | `py-8 px-8` |

### 2.4 Z-index scale (locked across all fixed/absolute layers)

Single source of truth — all fixed-position components reference this scale by name. Prevents collision between Navbar / Compliance Log / future modals/drawers.

| Layer | Tailwind class | Numeric | Use |
|-------|---------------|---------|-----|
| Skip-to-content link | `z-50` | 50 | First focusable, must beat everything |
| Modal / dialog overlay | `z-50` | 50 | Same plane as skip link (skip link wins on focus) |
| Floating Navbar pill | `z-40` | 40 | Stays above page content + below modals |
| Mobile menu drop | `z-40` | 40 | Sibling of Navbar pill, same plane |
| Compliance Log panel (Day 6) | `z-30` | 30 | Below Navbar (so Navbar covers it on scroll) |
| Tooltip on map hover | `z-20` | 20 | Above choropleth + analog cards |
| CountyMap analog pins / pulses | `z-10` | 10 | Above choropleth fill, below tooltip |
| Default page content | (none) | 0 | Body flow |

When adding a new fixed/sticky layer: pick from this scale. NEVER introduce ad-hoc values like `z-[27]`.

---

## 3. Mobile-first breakpoint specs

Tailwind defaults locked: `sm: 640px / md: 768px / lg: 1024px / xl: 1280px / 2xl: 1536px`.

**Component-level mobile rules (NOT optional). Concrete Tailwind class examples:**

| Component | Mobile behavior (≤768px) | Tailwind pattern |
|-----------|--------------------------|------------------|
| `Navbar` | Pill collapses to compact: logo + hamburger only; nav items in dropdown | `flex items-center justify-between md:justify-center md:gap-8` + `<nav className="hidden md:flex">` for desktop links |
| `Hero` | Full-width single column. Heading scales 40px. ZIP input full-width | `<h1 className="text-4xl md:text-6xl lg:text-7xl">` + `<form className="w-full md:max-w-xl mx-auto">` |
| `RegionHeader` | Stacks vertically: county name, state+MSA on second line, population on third | `flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between md:gap-6` |
| `ParityPanel` | **Stacks vertical (Olympic on top, Paralympic below) — NEVER stacks side-by-side at small widths.** Equal vertical real estate. Same hue weight. | `<div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-soft-border">` |
| `SportMix` | Horizontal bars retain layout, scale down | `<div className="flex flex-col gap-2 [&>div]:flex [&>div]:items-center [&>div]:gap-3">` |
| `AnalogList` | Stacks vertically as full-width cards. Sticky disabled on mobile (UX worse than scroll). | `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">` (no `sticky` on mobile) |
| `CountyMap` | Snap to top of viewport, narrative cards stack below — NYT pattern | `<div className="flex flex-col md:flex-row md:gap-8"><div className="md:order-2 md:flex-[3]"><Map /></div><div className="md:order-1 md:flex-[2]">…</div></div>` |
| `PatternGapPanel` | Stacks vertically (Observed → Public Access → Hypothesis) | `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">` |
| `ComplianceLog` | Bottom drawer slide-up triggered by floating action button. NEVER fixed sidebar (eats screen space) | `<div className="fixed bottom-0 left-0 right-0 md:left-auto md:bottom-auto md:top-24 md:right-6 md:w-[380px]">` |
| `Scrollytelling` | Single column. Map renders inline at chapter break, narrative scrolls beneath | `<section className="grid grid-cols-1 md:grid-cols-[40fr_60fr] gap-8">` |
| `Pillar5Strip` | Three columns stack vertically | `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">` |

---

## 4. Component anatomy

17 Atlas components (4.1 through 4.18, with 4.17 LogEntry as a sub-component of 4.16). Per component: visual spec + all states + ARIA notes. Implementation lives in `frontend/src/components/`.

### 4.1 ZipInput

Reference: `docs/moodboard/01_hero.png` (lower center)

**Anatomy:**
- Pill input on white background with thin gray `#E7E2D9` border
- Placeholder text in muted gray `#6B7280` reads "Enter your 5-digit ZIP"
- Submit button on right: `#B96B5C` clay, white text, "Submit" or "Show me my region"
- Below input: 11px micro-copy gray `#6B7280`

**States:**
- Default: as above
- Focus: border swaps to `#1F3A5F` navy, 2px ring `rgba(31,58,95,0.15)`
- Loading: button text → spinner, button disabled, input disabled
- Invalid (wrong digits): border to `#B91C1C` danger, micro-copy below shows error in danger color
- Success: morphs into next state via Framer Motion (page navigation)

**ARIA:**
- `<label>` (visible OR sr-only) tied via `htmlFor`
- `aria-describedby` tied to micro-copy
- `aria-invalid="true"` on validation fail
- Submit button `type="submit"` inside `<form>` with `onSubmit` handler

### 4.2 Navbar (floating pill)

Reference: `docs/moodboard/01_hero.png` (top)

**Anatomy:**
- Fixed top, centered, `max-w-5xl`, white background, `rounded-full`, `shadow-sm`, `border-soft-border`
- Left: wordmark "Atlas" in Instrument Serif italic, navy `#1F3A5F`, 24-28px
- Center (desktop only, `hidden md:flex`): nav links in 12px JetBrains Mono uppercase, letter-spacing 0.2em, gap-8
- Right: small accent button, navy bg, white text, rounded-full, 12px text

**States:**
- Default: as above, `shadow-sm`
- Scrolled (`scrollY > 100`): `shadow-md` (subtle lift)
- Mobile (`<md`): logo + hamburger only; expanded menu drops down on click

**ARIA:**
- `<nav role="navigation">` with `aria-label="Primary"`
- Nav links semantic `<a>` with `aria-current="page"` for active route
- Hamburger `<button aria-expanded aria-controls="mobile-menu">`

### 4.3 RegionHeader

**Anatomy:**
- County name in Inter 32-40px weight 600 navy `#1F3A5F`
- State + MSA label below in Instrument Serif italic 13px gray `#6B7280` — e.g., *"Cobb County, GA · Atlanta-Sandy Springs MSA"*
- Population badge to the right (or below on mobile): JetBrains Mono 12px uppercase, soft-border pill, `766,149` value tabular

**States:**
- Default
- Loading: skeleton rows matching shape (no spinner inside component)

### 4.4 ParityPanel ★ (most critical component)

Reference: `docs/moodboard/02_parity_panel.png`

**Anatomy:**
- Card on white bg, `rounded-2xl`, `border border-soft-border`, `p-6`, `shadow-sm`
- Top: small italic serif label centered — county name + MSA
- Two parallel columns separated by hairline divider (`border-r border-soft-border`)
- LEFT column (Olympic):
  - JetBrains Mono 12px uppercase header reading "OLYMPIC", color `#1F3A5F` navy
  - Large stat: Inter weight 700 tabular, 56-72px desktop, color `#1F3A5F` navy — value e.g. `1.83`
  - Small label below in gray `#6B7280` 13px reading "per 100k population"
  - Horizontal segmented bar (5 segments), filled segments in Olympic blue `#5B7DB1`, empty in `#E7E2D9` — represents percentile rank
  - Pill at bottom: tri-color status (`#2E8B57` green / `#D97706` amber / `#B91C1C` danger) with "evidence: high/medium/low" label
- RIGHT column (Paralympic): structurally **IDENTICAL** but uses Paralympic clay `#B96B5C` for accent, percentile bar in clay, separate evidence pill
- Below both columns: 11px gray monospace footnote — "Per 100k pop. Percentile rank vs national distribution. Never merged."

**Locked rules (per CLAUDE.md decisions D2, D4):**
- ✅ Two columns, equal width, equal hue weight, identical chrome
- ❌ NEVER merge into single number or single bar
- ❌ NEVER hide Paralympic behind a toggle
- ❌ NEVER stack one above the other on desktop (mobile only)

**States:**
- Default
- Empty (rural fallback — both sides 0 athletes): both columns show "—" instead of number, evidence pill = "low", footnote adds "Limited data — see Pattern Gaps for context"
- Loading: skeleton mirroring layout

**ARIA:**
- Container `role="region" aria-labelledby="parity-heading"`
- Sub-labels associate with respective sides via `aria-label`

### 4.5 SportMix

**Anatomy:**
- Card pattern same as ParityPanel
- Eyebrow: JetBrains Mono "TOP SPORTS" uppercase
- 3-5 horizontal bars, each row: sport name (Inter 14px) + bar (gradient from teal to navy by z-score) + z-score value (JetBrains Mono right-aligned)
- z-score color legend: low z = light, high z = dark (sequential, not categorical)

### 4.6 ClimateBadge

**Anatomy:**
- Compact card or inline pill
- Custom illustrated icon (per §6.1) for climate zone
- Zone label in Inter 14px
- Three small key/value rows: avg temp, annual precip, elevation — all in JetBrains Mono tabular

### 4.7 AdaptiveAccessCard ★ (display-only, never load-bearing — D2)

**Anatomy:**
- Card pattern same family
- Eyebrow: "ADAPTIVE ACCESS"
- Big number: Move United chapter count within 50mi radius — Inter weight 700, navy
- Confidence pill prominent (high/medium/low — tri-color status)
- Methodology footnote in italic serif: "Display only. Not used in similarity matching. Move United chapter density is a proxy and limited."

**Locked rule:** confidence pill is mandatory — never display the chapter count without the confidence label. Never let users mistake it for a load-bearing similarity dimension.

### 4.8 EvidenceLabel (badge)

**Anatomy:**
- Small pill, `rounded-full`, `px-3 py-1`
- Tri-color status semantic
- 11px JetBrains Mono uppercase
- Text: `evidence: high` / `evidence: medium` / `evidence: low`
- Used everywhere parity / quality / confidence is shown

### 4.9 AnalogList (container)

Reference: `docs/moodboard/03_analog_cards.png`

**Anatomy:**
- Eyebrow: "PEER COUNTIES"
- Heading: "Three regional analogs" with "analogs" in Instrument Serif italic
- 3-card grid: `grid-cols-3 gap-6` on desktop, stacks mobile
- Below cards: TradeoffPanel (collapsible)

**States:**
- Loading: 3 skeleton cards in grid
- Partial (only 1-2 analogs returned due to data sparsity): grid still shows 3 slots, missing slots render "Limited match available — see methodology"

### 4.10 AnalogCard

Reference: `docs/moodboard/03_analog_cards.png`

**Anatomy (per card):**
- Card on white, `rounded-2xl`, `border-soft-border`, `p-6`, `shadow-sm`
- Top: rank pill (1, 2, or 3) — small navy circle with white number
- County name: Inter 24px weight 600 navy
- State + MSA below: Instrument Serif italic 14px gray
- Hairline divider
- 3 horizontal similarity bars stacked vertically:
  - "ATHLETE PROFILE" eyebrow + value bar in Olympic blue `#5B7DB1` + value `81%`
  - "SPORT MIX" + bar in clay `#B96B5C` + value
  - "CLIMATE" + bar in accent teal `#2E8B57` + value
- Bottom pill: tri-color match quality — "strong match" (teal) / "partial match" (amber)

**States:**
- Default
- Hover: `shadow-md`, subtle scale 1.02 via Framer Motion
- Click: animates expand or routes to drilldown

### 4.11 SimilarityBreakdown (sub-component of AnalogCard)

Three horizontal bars described above. Each bar:
- Track: `bg-soft-border` height 8px `rounded`
- Fill: respective dimension color, width % matching value
- Label left (eyebrow) + value right (Inter 14px tabular)

### 4.12 TradeoffPanel

**Anatomy:**
- Collapsible container below AnalogList
- Header row: "Why these three" + chevron toggle
- Content: Gemini-generated tradeoff narrative in Inter 16px serif body
- Conditional phrasing enforced (never "produces", always "shows representation patterns" / "could be associated with")
- Per-region tradeoff: 1-2 sentences each

### 4.13 CountyMap

Reference: `docs/moodboard/04_county_map.png`

**Anatomy:**
- US choropleth via `react-simple-maps` + TopoJSON
- County fills: graduated warm grays from `#F5F1EB` (low) to `#E7E2D9` (medium) — sequential, not categorical
- Source county: filled `#1F3A5F` navy with small label callout
- Three analog pins: filled circles in `#5B7DB1` Olympic blue
- Connection arcs: dotted Bezier curves in `#B96B5C` clay with subtle directional arrows
- Custom illustrated topographic accents (sepia ink, hand-drawn style) at periphery — Layer B
- Floating legend card bottom-right: white bg, soft border, key for source / analog / arc

**States:**
- Default
- Hovering county: small tooltip with FIPS + per-capita stats (mono)
- Loading: gray skeleton US shape with subtle shimmer
- No-data county: `#F5F1EB` fill with "—" tooltip

### 4.14 CountyTooltip

**Anatomy:**
- Small floating card on white bg, `rounded-xl`, `shadow-md`, `p-3`
- County name (Inter 14px bold) + state (italic serif 12px)
- Olympic per 100k + Paralympic per 100k (JetBrains Mono tabular)
- Evidence labels mini

### 4.15 PatternGapPanel + GapCard

**Anatomy (panel):**
- Eyebrow: "PATTERN GAPS"
- Heading: "What this region's data shows"
- Three GapCard instances stacked or grid

**GapCard anatomy:**
- Card pattern same family
- Category badge top: tri-color
  - **Observed Strength** = teal `#2E8B57` (data-supported)
  - **Public Access Signal** = amber `#D97706` (directory-supported, may be sparse)
  - **Opportunity Hypothesis** = light navy `#1F3A5F` at lower opacity (cautious inference)
- Claim sentence in Inter 16px
- Evidence row: metric + value + caveat (mono)
- Confidence pill at bottom

**Locked language rules (ALL conditional — no declarative claims about geography or causation):**
- Observed Strength: data-supported observation, conditional phrasing — *"Cobb County's Olympic swimming representation could be associated with above-median per-capita patterns in our indexed sources"*
- Public Access Signal: directory-supported observation, conditional + data-limit acknowledgement — *"Adaptive aquatics presence in our indexed sources is limited; the pattern below may not reflect full regional access"*
- Opportunity Hypothesis: cautious inference framing — *"Where Olympic swimming representation coexists with limited public adaptive signal, a pattern gap could exist — interpretation only, not causation"*

**Banned phrases (auditor + design-time strip):** "produces", "creates", "leads to", "guarantees", "is known for", "will", "makes", "shows strong" (declarative without "could").

### 4.16 ComplianceLog ★ (Pillar 4 demo moment)

Reference: `docs/moodboard/05_compliance_log.png`

**Anatomy:**
- Fixed right sidebar desktop (380px wide), bottom drawer mobile
- White bg, `rounded-2xl`, `border-soft-border`, `shadow-lg`
- Header strip: navy `#1F3A5F` text "LIVE AUDIT" mono uppercase + green pulse dot
- Body split into TWO columns: "RULES" + "GEMINI" separated by hairline divider
- Each column shows audit log entries stacked vertically
- Entry row: status dot + monospace ISO8601 timestamp (`2026-05-11T14:02:11Z`) + check name (`causal_tone`) + status word — **enum LOCKED to PLAN.md Shared Contracts: `pass` / `fail` / `fixed`** (lowercase, NEVER `SUCCESS`)

**Status dot semantic (matches `compliance_log[].status` contract enum exactly):**
- Gray = `pass` (auto-collapses after 1.5s)
- Amber `#D97706` = `fail` (stays expanded, shows banned phrase highlighted)
- Green `#2E8B57` = `fixed` (replaces `fail` in place via 300ms crossfade)

**Demo-mode prop (`demoMode: boolean`, default `false`):** when `true`, ComplianceLog renders a canonical pre-scripted `fail` → `fixed` sequence regardless of live Gemini output. Fail entry shows "Draft contained 'produces athletes'" → fixed entry shows "region shows representation patterns". Ensures Pillar 4 demo moment is reproducible during recording. **Production behavior:** `demoMode={false}` always — must NEVER ship enabled. Add a runtime guard: `process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost'` to prevent accidental production enable. Demo recording uses a feature-flag override.

**Fail entry expansion (the demo moment):**
- Shows banned phrase highlighted in mono with strikethrough
- Below it: rewrite entry shows the safe replacement in green dot

**ARIA:**
- `role="log" aria-live="polite" aria-atomic="false"`
- Entries announced as they arrive (screen readers hear the audit happen)

### 4.17 LogEntry (sub-component)

Detailed in 4.16. Single audit log row.

### 4.18 Pillar5Strip ★ (Business Numbers — Sookra-flagged silent killer)

**Why it exists:** NotebookLM cross-source synthesis flagged Pillar 5 (Business Numbers — TAM, cost-per-incident, revenue model) as the same vulnerability that lost the prior Compass build. Adding visible Pillar 5 surface to design system so it cannot be skipped Day 6.

**Anatomy:**
- Horizontal strip at bottom of HomePage and AboutPage (two surfaces)
- Card on `#F5F1EB` warm neutral, `rounded-2xl`, `border-soft-border`, `p-6`, `shadow-sm`
- Eyebrow: JetBrains Mono "WHO THIS IS FOR" uppercase navy `#1F3A5F`
- Three columns side-by-side (mobile: stack):
  - **TAM column:** Inter weight 700 large stat (≥40px) showing target audience number, e.g., `~6,000` (NGB recruitment programs) or `~50M` (youth athletic households). Below in Inter 14px gray, the audience description. Source citation in 11px Instrument Serif italic at bottom.
  - **Cost framing column:** stat showing the cost-of-incident or visibility gap, e.g., `Zero` (existing public county-level Atlas tools) or `$150` (per athlete annual travel cost saved by hometown program awareness). Description + source.
  - **Revenue model column:** Pill or badge showing the model — "B2B licensing → NGBs", "B2G partnerships → state recreation departments", "Open source + sponsored deployment" — Inter 14px weight 600.
- Below the three columns: a small italic Instrument Serif callout — *"Built for fans, parents, NGB recruiters, and state recreation programs"*

**Locked rule:** Pillar 5 numbers are placeholder until Day 6 lock. Design system reserves the surface; copy is locked Day 6 per PLAN.md task 3.16. Do not ship without all three numbers visible.

**ARIA:** `<section aria-labelledby="pillar5-eyebrow">` with each column as `<article>`.

---

### 4.19 Pillar5Defense (per-incident harm + lighthouse NGB pilots)

**Why it exists:** Added 2026-05-03 after Sookra Council weakest-pillar verdict on Pillar 5. The locked §4.18 Pillar5Strip (TAM + Zero + Revenue pills) does not surface (a) per-incident dollar harm or (b) named first-customer ICP. Council ruled both must be on stage, not Q&A-only. §4.18 anatomy stays locked at 3 columns; §4.19 carries the second-layer defensibility receipts.

**Anatomy:**
- Sibling card to Pillar5Strip, rendered immediately below at `mt-6` spacing (tight pairing — same Pillar 5 conceptual unit)
- Card on `#FFFFFF` `bg-card-white`, `rounded-2xl`, `border-soft-border`, `p-6`, `shadow-sm` — inverted background relative to §4.18's `bg-warm-neutral` so the two cards read as paired layers, not duplicate stacks
- Eyebrow: JetBrains Mono uppercase navy `#1F3A5F` — `"Defensibility — what mistargeting could cost · who buys first"`
- Two-zone grid `[1fr_2fr]` (mobile: stack), divided by hairline border on the right edge of zone A on `md+`:
  - **Zone A — Per-incident harm (1fr):** Inter weight 700 large stat at `text-stat-md` (28px) showing the sourced unit-cost number from `PILLAR5_HARM` (`$35K–$70K` Beat the Streets startup year). Eyebrow above ("PER-INCIDENT HARM"), label below in Inter 16px body, source in Instrument Serif italic 13px caption.
  - **Zone B — Lighthouse pilots (2fr):** Eyebrow ("LIGHTHOUSE PILOTS") above a 3-column chip grid (mobile: stack) sourced from `PILLAR5_LIGHTHOUSE_NGBS`. Each chip on `bg-warm-neutral` (inverted vs. card's `bg-card-white`) showing: NGB name (Inter bold 18px navy), program (JetBrains Mono eyebrow), reach (Inter caption), unit economics (Instrument Serif italic caption).

**Locked rule:** The 3 NGB chips must always render in their declared `PILLAR5_LIGHTHOUSE_NGBS` order (USA Wrestling → USA Swimming → USA Track & Field). The order is the validation sequence (smallest/fastest validation cycle first); reordering breaks the pitch Q&A elevator surfaces in `docs/pitch_pillar5.md`. If NGB roster changes, update both surfaces in the same commit (drift script enforces).

**ARIA:** `<article role="region" aria-labelledby={eyebrowId}>` matching §4.18 landmark pattern (sibling cards use the same role so screen readers don't hop between heterogeneous landmarks). Sub-zones use sr-only `<h3>` headings. NGB chip list uses `<ul role="list">` to preserve list semantics under Tailwind's reset.

**Motion:** No bespoke motion. Inherits `fadeUp` from page transition. Future ambition: stagger NGB chip entry on results-view first paint (50ms `reutersStagger` per §5.2 AnalogCard pattern) — not in scope for the May 11 ship; revisit Day 9 if buffer.

---

### 4.20 RegionQA ★ (Layer C — multimodal Gemini Q&A panel)

**Why it exists:** Added 2026-05-03 as the Layer C "Gemini in new ways" judging surface from CLAUDE.md Maximum Scope Addendum. User asks a natural-language question about the visible region; Gemini reasons over parity metrics + sport mix + climate + analog peers and answers in conditional, evidence-grounded prose. Visible reasoning chain mirrors the ComplianceLog audit-stream pattern but at core UX layer rather than compliance instrumentation.

**Anatomy:**
- Renders below TradeoffPanel inside the `#section-qa` wrapper (mt-12 spacing from prior section)
- Card on `#FFFFFF` `bg-card-white`, `rounded-2xl`, `border-soft-border`, `shadow-sm`, `p-6`
- Header (justify-between):
  - Left: Eyebrow JetBrains Mono uppercase navy `Ask the Atlas — Gemini region Q&A` + Instrument Serif italic explainer caption
  - Right: Brain icon (lucide), `h-5 w-5 text-olympic-blue`
- Question form:
  - Eyebrow label `Question`
  - Textarea (2 rows, `bg-warm-neutral`, placeholder includes the active region's county name)
  - Send button (`bg-navy text-card-white`, swaps to spinner when `asking`)
- Suggested-question chips: 3 `<button>` chips on `bg-warm-neutral` rounded-full; click auto-fills the textarea + focuses it
- Response zone (renders only when `asking` or `response` exists):
  - Top hairline divider
  - Two-zone grid `[1fr_2fr]` (mobile: stack), with hairline divider on the right edge of zone A on `md+`
  - **Zone A — Reasoning:** ordered `<ol role="list">` of 4 numbered steps; each step's opacity transitions from 0.3 (placeholder) to 1.0 (revealed) as steps complete
  - **Zone B — Answer:** Inter body 16px paragraph + JetBrains Mono confidence pill (`Confidence: <high|medium|low>`); when `asking` is true and no response yet, renders a layout-preserving skeleton (4 lines of pulsing `bg-soft-border` placeholders + 1 small confidence-pill placeholder) so the response area doesn't reflow when data lands
- Footer note (Instrument Serif italic eyebrow muted): forward-spec disclosure that backend GeminiService (Vinh task 2.7) wires up via 1-line swap + HybridAuditor (task 2.9) gates live responses

**Locked rules:**
- Final answer text MUST pass conditional-phrasing CI (`scripts/check-conditional-phrasing.mjs`). The runtime regex check in `RegionQA.tsx` is hand-authored to satisfy the rule today; the live Gemini call must pass through HybridAuditor before reaching this panel
- Suggested-question chips intentionally include one banned-verb question (markered with `atlas-phrasing-allow`) — quoting natural-language input is the only way the audit catch demo can show what user inputs look like before the audit gate
- Zone A reasoning chain is always 4 steps minimum even if the live backend returns fewer; pad with no-op steps to preserve the visual cadence (deferred to backend implementation)
- Component is removable in 1 import + 1 JSX line per the cut posture (see RegionQA.tsx header comment) — used if Vinh task 2.7 doesn't ship by Day 9 EOD

**ARIA:**
- Outer: `<article role="region" aria-labelledby={headingId}>` matching §4.18 / §4.19 sibling landmark convention
- Question form: `<label htmlFor>` tied to textarea; submit button has `aria-label="Ask Gemini"`
- Reasoning chain: `<ol role="list">` for sequential AT readout
- Answer section: `aria-labelledby` on its container + `aria-live="polite"` so the answer announces when it lands
- Loading skeleton: `aria-label="Generating response"` on the placeholder container; the parent section's aria-live still does the work for the eventual answer announcement

**Motion:** Reasoning step opacity transition (0.3 → 1.0, 300ms) per step as the chain "completes." Pulsing skeleton uses Tailwind `animate-pulse`. No Framer Motion bespoke variants.

---

## 5. Motion choreography

All Framer Motion. Reference `frontend/src/lib/motion.ts` (to be created).

### 5.1 Presets

```ts
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export const slideInRight = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export const stagger = (delayChildren = 0.05) => ({
  animate: { transition: { staggerChildren: delayChildren } },
});

// Per Steal #3 — Reuters stagger
export const reutersStagger = stagger(0.05);  // 50ms staggered children for lists

// Per Magic 21st Dashboard Activities (Steal #15)
export const complianceLogEntry = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2, ease: 'easeIn' } },
};

// Per Kinetic Log Stream — for "fixed" status spring entries
export const fixedStatusEntry = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
};
```

### 5.2 Component-level motion

| Component | Motion |
|-----------|--------|
| Page transition | `fadeUp`, 400ms |
| Hero entrance | `fadeUp` staggered: eyebrow → heading → subhead → input (50ms stagger) |
| RegionHeader | `fadeUp` 300ms with type-in on county name (CharSplit, 30ms per char, 8 char min) |
| ParityPanel numbers | Counter-up animation 0 → value over 800ms ease-out |
| ParityPanel evidence pills | `fadeUp` 200ms, 100ms stagger after numbers |
| AnalogCard entry | `slideInRight` 350ms with `reutersStagger` (50ms between cards) |
| AnalogCard hover | `shadow-md` + scale 1.02, 200ms ease-out |
| CountyMap source pulse | Subtle 2-second pulse on source county pin — opacity 1 ↔ 0.6 |
| ComplianceLog entry | `complianceLogEntry` variants. Pass auto-collapses 1.5s after entry. Fail stays expanded. Fixed uses `fixedStatusEntry` spring. |
| Compliance Log fail→fixed crossfade | 300ms color transition amber → green, then `fixedStatusEntry` for the "fixed" entry |
| Scrollytelling chapter trigger | `react-intersection-observer` triggers `fadeUp` for narrative + map state change |
| Modal / Drawer | Slide from edge, 300ms ease-out |

### 5.3 Motion budget

Total Framer Motion animations active on screen at any time: **≤8**. Beyond this, perceived performance degrades. Use `LayoutGroup` for batched re-layouts (e.g., AnalogList re-renders).

---

## 6. Illustration library

Atlas does NOT use stock photos or athlete photographs (NIL DQ). Custom illustrated SVG accents only.

### 6.1 Climate zone icons (Day 6 Gate — Lucide React, NOT custom SVG)

**Use existing Lucide React icons (MIT licensed, already in stack).** Custom illustration is Layer B opt-in only — see §6.2.

7 climate zones map to Lucide icons:
- Humid subtropical → `Sun` + `Droplets` paired
- Marine west coast → `Cloud`
- Semi-arid → `Flame`
- Continental → `Trees`
- Subarctic → `Snowflake`
- Mediterranean → `SunMedium`
- Tropical → `CloudRain`

24x24 size, navy `#1F3A5F` color, paired with text label always.

### 6.2 Custom map accents (Layer B opt-in ONLY — Day 8 if Days 1-7 clean)

**Cut from Day 6 Gate per Phase D review (devils-advocate + codex).** Custom illustration consumes 4-8hr that Stephen needs for demo recording Days 9-10.

Default CountyMap implementation: clean choropleth from `react-simple-maps` with no custom accents. Source highlighted in navy, analog pins in Olympic blue, connection arcs in clay `#B96B5C` — these are SVG primitives, no illustration work needed.

Optional Layer B opt-in (Day 8 only if Day 6 Gate green AND Layers A-C complete):
- Subtle topographic curves at periphery (sepia ink lines, 30-40% opacity)
- 3-4 coastline accents (CA, NE, FL, Gulf)
- Hand-drawn directional arrows on connection arcs

Sources: public-domain USGS topographical SVG. Stephen's call Day 8 EOD whether to add.

### 6.3 Sources

Public-domain or MIT-licensed:
- US topographical SVG accents from public-domain USGS maps
- Lucide React for standard icons (existing MIT license)
- Custom illustrations drawn as SVG in code (no external image deps)

---

## 7. Loading + error states

### 7.1 Loading

**Rule:** No spinners inside components. Components render skeleton matching final shape. Spinners only at page-level boundaries.

**Skeleton patterns:**
- Cards: `bg-soft-border` rectangle matching card dimensions, `animate-pulse`
- Text rows: `bg-soft-border` `h-4 rounded` lines matching content paragraph shape
- Stat numbers: `bg-soft-border` `h-12 w-24 rounded` block
- Map: `bg-soft-border` US shape SVG outline filled with subtle shimmer

### 7.2 Error states

**Rule:** Friendly, never blame user. Always offer recovery.

**Patterns:**
- API error (500): inline error card with `#B91C1C` accent, message "We couldn't load this region. Try again?", retry button
- ZIP not found: inline error in ZipInput micro-copy, danger color, "ZIP not in our database. Try a nearby one."
- Network offline: full-page error with retry, friendly tone
- Sonner toast for transient errors (auto-dismiss 5s)

### 7.3 Empty states (rural / tribal fallback per Steal-list anti-pattern guard)

When a county has zero athletes AND thin ACS population data, ParityPanel renders both columns with "—" placeholders, evidence pill = "low" on both, and footnote adds:

> *"Limited public data for this region. See Pattern Gaps below — three peer regions sharing geographic and climate signature could provide context."*

This preserves the side-by-side parity discipline even when data is sparse. Never shows "no data, try another ZIP" — always offers analogs.

---

## 8. Accessibility (WCAG AA)

### 8.1 Color contrast (verified per pair)

| Foreground | Background | Ratio | Pass? |
|------------|------------|-------|-------|
| Body `#1C2433` | Page `#F5F1EB` | 12.4:1 | ✅ AAA |
| Body `#1C2433` | Card `#FFFFFF` | 14.0:1 | ✅ AAA |
| Muted `#6B7280` | Card `#FFFFFF` | 4.6:1 | ✅ AA |
| Navy `#1F3A5F` | Card `#FFFFFF` | 11.2:1 | ✅ AAA |
| Olympic `#5B7DB1` (large text/bars only) | Card `#FFFFFF` | **4.19:1** | ⚠️ FAILS AA for body text (<18.66px). PASSES AA for large text (≥24px or ≥18.66px bold) at 3:1 threshold. **USAGE RULE:** large stat numbers, bar fills, icons only. Body text uses Navy. |
| Paralympic `#B96B5C` (large text/bars only) | Card `#FFFFFF` | **3.95:1** | ⚠️ FAILS AA for body text. PASSES AA for large text. Same usage rule as Olympic. |
| White on accent teal `#2E8B57` | — | 4.5:1 | ✅ AA |
| White on amber `#D97706` | — | 3.8:1 | ⚠️ Large text only. **For status pills use `#1C2433` text** (verified 6.4:1 contrast) |
| White on danger `#B91C1C` | — | 5.5:1 | ✅ AA |

**Locked AA usage rules:**
- Olympic + Paralympic accents: large-text only (≥24px). For body text on white, always use Navy `#1F3A5F`.
- Amber pill: dark text `#1C2433`, never white.
- All evidence pills: must include text label AND icon (color is never sole information carrier per WCAG 1.4.1).

### 8.2 Keyboard navigation

- All interactive elements reachable via `Tab`
- Focus visible: 2px ring `rgba(31,58,95,0.5)` `outline-offset-2`
- ZipInput focusable on page load (`autoFocus` prop on landing)
- Skip link to main content for screen readers
- ESC closes drawers, modals
- Enter submits forms
- Arrow keys navigate within AnalogList (left/right)

### 8.3 ARIA

- All interactive elements have `aria-label` if no visible text
- Forms use `<label>` + `htmlFor` association
- Status badges use `aria-label="Evidence: high"` not just visual color
- ComplianceLog uses `role="log" aria-live="polite"` so screen readers hear audit
- ParityPanel uses `role="region" aria-labelledby` for screen reader region announcement
- Map uses `role="img" aria-label` describing the visualization

### 8.4 Motion

- Respect `prefers-reduced-motion: reduce` — disable Framer Motion transitions, snap to final state
- Counter-up animations on numbers respect reduced-motion (skip to final value)
- Compliance Log entries appear instantly with `prefers-reduced-motion`

---

## 9. Anti-patterns

Codified — DO NOT SHIP these regardless of moment of weakness.

### 9.1 Visual

- ❌ Pure black `#000` background with neon accents (agency portfolio)
- ❌ Patriotic red/white/blue palette
- ❌ Olympic ring iconography or torch imagery (DQ)
- ❌ Athlete photographs or NIL exposure (DQ)
- ❌ `.liquid-glass` class with backdrop-blur — every Magic 21st-generated SaaS site uses this; judges see it 30 times this hackathon
- ❌ Full-bleed background video on hero (SaaS template tell)
- ❌ Three.js / WebGL as architectural backbone (ship risk + impact penalty; one targeted r3f particle layer Day 8 OK as opt-in)
- ❌ Cinematic 80px Instrument Serif headline as the entire hero (Velorah / Asme / motionsites.ai pattern) — wrong shape for data tool

### 9.2 Layout

- ❌ Olympic + Paralympic merged into single number, single bar, or single visualization
- ❌ Paralympic data behind a toggle, tab, or "show more" disclosure
- ❌ Olympic and Paralympic in different visual treatments (different chart types, different sizes, different hue weights)
- ❌ Components with spinners inside (use skeleton matching final shape)
- ❌ Layout shift on data load (CLS > 0.1)

### 9.3 Typography

- ❌ Causal language anywhere in user-facing strings — "produces", "creates", "leads to", "guarantees", "is known for", "will", "makes"
- ✅ Conditional phrasing ONLY — "could be associated with", "may correlate with", "originates from", "shows representation patterns", "could help find"
- ❌ Mixing more than 3 type families
- ❌ Italic accents on every heading (overuse dilutes)
- ❌ Text under 16px for body content (mobile)

### 9.4 Color usage

- ❌ Status colors used for non-status purposes (e.g., teal for decoration)
- ❌ Olympic blue and Paralympic clay used outside their respective ParityPanel columns (don't sprinkle them around)
- ❌ Background colors with text contrast < 4.5:1
- ❌ Color as sole information carrier (always pair with icon, label, or position)

---

## 10. Layer B polish targets

Per Maximum Scope strategy, Layer B is "NYT/Pudding-grade frontend" woven from Day 2 forward, not bolted on Day 9.

### 10.1 Per-component polish ceiling

| Component | Standard (Day 6 Gate) | Layer B target (Day 8) |
|-----------|----------------------|------------------------|
| ZipInput | Plain text input | Animated focus ring, smooth submit→loading morph |
| RegionHeader | Static text block | Type-in animation on county name (CharSplit 30ms) |
| ParityPanel | Static stat cards | Counter-up animation on numbers (0 → value 800ms), evidence pills fade in 100ms staggered |
| SportMix | Plain Recharts bar | Custom rounded bars, hover reveals sport icon (Lucide), z-score gradient |
| ClimateBadge | Lucide icon + label (per §6.1) | Lucide icon paired with subtle CSS-only motion (gentle hover scale or color shift). Custom SVG cut per §6.1. |
| CountyMap | Default choropleth | Source county pulses, analog pins with Bezier connections. Custom illustrated topographic accents are §6.2 Layer B opt-in only (Day 8 if Days 1-7 clean). |
| AnalogCard | Card with bars | Hover reveals expanded breakdown, click animates "twin lines" connecting source ↔ analog on map |
| PatternGapPanel | Three section blocks | Custom typography by category — Observed Strength bold, Public Access muted+caveated, Opportunity Hypothesis sketch border |
| ComplianceLog | Plain log feed | Full animation choreography per §5.2 — slide-in, color crossfade fail→fixed, panel pulse on new entries |

### 10.2 Cut philosophy

If Day 8 runs long:
1. Drop hover micro-interactions first (low-impact)
2. Drop counter-up animations second
3. Drop custom map illustrations third (fall back to clean default choropleth)
4. KEEP Compliance Log animation (demo moment, not optional polish)

---

## 11. Reference moodboard index

Visual targets stored in `docs/moodboard/`. Each PNG is a Gemini-generated mockup at 2K resolution. Use as visual benchmark when implementing components.

| File | Component(s) it locks | Critical observation |
|------|----------------------|---------------------|
| `01_hero.png` | Hero, Navbar, ZipInput | Floating pill nav, Atlas wordmark in serif italic, hero heading with "story" italic accent, ZIP pill input with clay submit |
| `02_parity_panel.png` ★ | ParityPanel, EvidenceLabel | **Side-by-side never merged**, distinct hue weight, evidence pills, monospace footnote |
| `03_analog_cards.png` | AnalogList, AnalogCard, SimilarityBreakdown | 3-card grid, rank pills, three dimension bars per card, match status pills |
| `04_county_map.png` | CountyMap, CountyTooltip | Editorial choropleth, source highlighted, 3 analog pins across MSAs, clay arcs, illustrated accents |
| `05_compliance_log.png` ★ | ComplianceLog, LogEntry | RULES + GEMINI columns, monospace timestamps, fail-then-rewrite sequence (demo moment) |
| `06_palette_swatches.png` | Foundation §1 (palette) | All 5 brand colors with hex labels, tri-color status pills |
| `07_scrollytelling.png` | Layer D scrollytelling chapters | 40/60 narrative+map split, stat callout card, illustrated map accents |

★ = critical anchor reference. Any visual drift from these is escalation-level.

---

## 12. Source-of-truth mapping

Where DESIGN_SYSTEM.md fits in the doc tree:

```
CLAUDE.md                                ← persistent context, locked decisions
docs/01_architecture_spec.docx           ← system architecture
docs/02_vinh_handoff.docx                ← backend ops
docs/03_demo_outline.docx                ← demo storyboard
docs/04_maximum_scope_addendum.docx      ← Layer A-F strategy
PLAN.md                                  ← coordination, status, contracts
DESIGN_SYSTEM.md ★                       ← visual identity (THIS DOC)
docs/moodboard/01-07.png                 ← visual targets
REFERENCE_FINDINGS.md                    ← Phase A research input
STEPHEN_FRONTEND_STRATEGY.md             ← execution roadmap (§3 superseded by this doc)
STATUS_TEMPLATE.md                       ← handoff template
```

**Conflict resolution:**
- Locked decisions (CLAUDE.md, architecture spec) > DESIGN_SYSTEM.md
- DESIGN_SYSTEM.md > moodboard images (images are guides, not literal copy targets)
- DESIGN_SYSTEM.md > STEPHEN_FRONTEND_STRATEGY.md §3
- Vinh contract changes (PLAN.md Shared Contracts) trigger Stephen DESIGN_SYSTEM.md review — flag in chat with `⚠️ CONTRACT` commit prefix

---

## 13. Note for Vinh — Day 1 EOD review required

This document specifies what the user sees. **Required Day 1 EOD checks before coding starts:**

### 13.1 Verify these contracts match (in `PLAN.md` Shared Contracts)

| DESIGN_SYSTEM.md surface | PLAN.md contract field | Required value |
|---|---|---|
| ParityPanel evidence pill (§4.4) | `county_profiles.parquet` `*_evidence` column | `"high" \| "medium" \| "low"` |
| Pattern Gap category badge (§4.15) | `/api/pathway/{fips}` `category` field | `"observed_strength" \| "public_access_signal" \| "opportunity_hypothesis"` |
| ComplianceLog entry status (§4.16) | `/api/region` `compliance_log[].status` | **`"pass" \| "fail" \| "fixed"` — lowercase, NOT `PASS/FAIL/SUCCESS`** |
| ComplianceLog timestamp (§4.16) | `/api/region` `compliance_log[].ts` | ISO8601 (`2026-05-11T14:02:11Z`) |
| ComplianceLog layer (§4.16) | `/api/region` `compliance_log[].layer` | `"rules" \| "gemini"` |

### 13.2 New contract Vinh needs to add (codex review caught this gap)

CountyMap (§4.13) hover tooltip needs per-county metrics for arbitrary counties (not just the one being viewed). PLAN.md only defines `/api/region` returning data for ONE FIPS. Vinh: add `/api/stats/county/{fips}` lightweight endpoint returning `{fips, county_name, olympic_per_100k, paralympic_per_100k, olympic_evidence, paralympic_evidence}` for hover tooltips. **Note:** evidence fields are separate per pillar to match `county_profiles.parquet` schema (§3.2 of architecture spec) — never collapse into a single `evidence` field.

Alternative: bake all county profiles into a small static parquet served from the frontend. Either works — Vinh's call.

### 13.2.1 CountyMap centroid contract addition (added 2026-05-02 after Day 5 AM build)

`AnalogEntry` (in `/api/analogs/{fips}` response) and `RegionResponse` (in `/api/region/{fips}`) need an optional `centroid: [number, number]` field — `[longitude, latitude]` — so the frontend can place pins and Bezier arcs without a hardcoded FIPS-to-coords lookup. Vinh: cheap to compute server-side from `county_profiles.parquet`'s shapefile column (or from the FIPS centroid lookup table the Census ships). Until this lands, `frontend/src/components/CountyMap.tsx` falls back to a four-county `KNOWN_CENTROIDS` table that only covers the mock dataset; non-Cobb sources render the map with no pins or arcs.

### 13.3 Hard deadline

**Day 1 EOD:** Vinh confirms contract compatibility in PLAN.md as a comment or status update. If anything diverges, escalate before Stephen starts component implementation Day 2 AM.

If your implementation diverges from these contract values, raise it BEFORE committing. Design system follows backend reality, not the other way around for data-bound fields.

---

## 14. Note on moodboard image vs spec authority

The moodboard images at `docs/moodboard/*.png` are **visual targets only**, not literal copy targets. Where image content drifts from spec, spec wins.

Specifically:
- `07_scrollytelling.png` includes `2026 Winter athletes` references. **Disregard the year.** Production data window is 2016-2024 only per CLAUDE.md locked decision D9. Implementation uses computed dataset stats from 2016-2024.
- `02_parity_panel.png` footnote text includes auto-generated gibberish ("status sherid in 20%"). Disregard. Implementation uses spec'd text: *"Per 100k pop. Percentile rank vs national distribution. Never merged."*
- `05_compliance_log.png` includes auto-generated check name `no_parlet_r` — placeholder, ignore. Production check names: `no_athlete_names`, `causal_tone`, `parity_check`, `conditional_phrasing`, `forbidden_terminology`.
- `01_hero.png` has "EXPLORE METHOD ABOUT" nav — production nav is `Region` `Methodology` `About` (avoiding "EXPLORE" overuse).

The moodboard images lock palette + composition + typography hierarchy + motion implied. They do NOT lock specific text content.

---

## 15. Implementation Build Order (component-first sequence)

Per claude-council Executor lens — Monday morning Stephen needs to know which component first.

| Day | Components to build (in order) | Rationale |
|-----|-------------------------------|-----------|
| Day 2 AM | Foundation tokens (palette, typography, spacing in `tailwind.config.ts`), `lib/api.ts`, `lib/motion.ts`, `lib/format.ts`, `lib/mocks.ts` | Everything depends on these |
| Day 2 PM | `ZipInput` (§4.1) + `Navbar` (§4.2) + `pages/HomePage.tsx` shell | Landing surface, simplest components |
| Day 3 AM | `RegionHeader` (§4.3) + `EvidenceLabel` (§4.8) | Display primitives reused across multiple components |
| Day 3 PM | `ParityPanel` ★ (§4.4) + `SportMix` (§4.5) | Region profile core. ParityPanel is critical anchor — get this right first |
| Day 4 AM | `ClimateBadge` (§4.6) + `AdaptiveAccessCard` (§4.7) | Region profile completion |
| Day 4 PM | `AnalogList` + `AnalogCard` + `SimilarityBreakdown` + `TradeoffPanel` (§4.9–4.12) | Peer comparison |
| Day 5 AM | `CountyMap` + `CountyTooltip` (§4.13–4.14) | Map layer. Verify Vinh's new `/api/stats/county/{fips}` endpoint works |
| Day 5 PM | `PatternGapPanel` + `GapCard` (§4.15) | Pattern gaps surface |
| Day 6 AM | `ComplianceLog` ★ + `LogEntry` (§4.16–4.17) | **Pillar 4 demo moment.** Spec `demo-mode` prop. Test fail→fixed sequence reliability. |
| Day 6 PM | `Pillar5Strip` (§4.18) + Loading + Error states (§7) + Mobile responsive pass + Accessibility pass | Day 6 Gate work |
| Day 7+ | Layer B polish woven into existing components per §10 | Ambitious layer additions |

**Critical rule:** never start a Day-N component until Day-(N-1) ones pass visual eyeball test against moodboard. No leapfrogging.

---

_Locked 2026-05-01 by Stephen + 4-reviewer adversarial pass (codex / devils-advocate / sookra-council / claude-council). Maintainer: Stephen Sookra. Contributions to design system require update to this file + commit with `feat(design):` or `fix(design):` prefix._

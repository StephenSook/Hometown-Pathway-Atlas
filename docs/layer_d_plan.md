# Layer D Scrollytelling — Day 9 Build Plan

Plan written 2026-05-04 PM after Vinh's `/api/stats/global` ship.
Read this before starting Day 9 morning so the architecture decisions
are made before the keyboard.

## Goal

Turn the 2 strong findings (`gap` + `underdog` from `/api/stats/global`)
into a 4-5 chapter scrollytelling editorial that opens the Atlas demo.
Chapter scroll triggers per-chapter map state changes via Framer Motion
+ Intersection Observer. Modeled on The Pudding / NYT data-journalism
scrolly patterns.

## Library decision

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| `react-scrollama` (Pudding, 2.7k stars) | Battle-tested, IO-based, ~3KB gz | New dep, light maintenance lately | **Pick** |
| Native IntersectionObserver | Zero deps, full control | More boilerplate, edge cases | Backup if scrollama breaks |
| GSAP ScrollTrigger | Most powerful | 50KB+ gz, license thresholds, off-brand-heavy | Skip |
| Motion.dev | Modern React-native | Overlap with framer-motion (already shipped) | Skip |

Decision: install `react-scrollama` (~3KB gz). If the integration fights
us in first hour, fall back to native IO.

## Chapter outline

5 chapters, each ~6-8 seconds of scroll dwell. Total scrollytelling
read time ~35-40 seconds before lander reaches the ZipInput CTA.

### Ch 1 — "An atlas of silence"
**Hook:** Open with a black screen + a single line: "There are 3,222
counties in the United States."

**Map state:** US map fades in at low opacity, all counties warm-neutral
(no choropleth). Anchored on the gap stat from `/api/stats/global`.

**Copy:** "Most public Olympic atlases stop at the state level. At
county level, the surface is silent."

### Ch 2 — "4 in 5"
**Hook:** Reveal the gap stat by lighting up only the 555 counties
with athlete representation. The rest stay dim.

**Map state:** 555 counties fade in at choropleth tint (navy at variable
opacity by athlete count). 2,667 dim warm-neutral counties form a
visual "negative space" that reads as silence.

**Copy:** "Of those 3,222 counties, only 555 — 17% — show any Team USA
athlete representation in our 2016–2024 indexed sources. **4 in 5** are
silent."

### Ch 3 — "But the silence isn't where you'd expect"
**Hook:** Pivot from gap to underdog. Counter-intuitive setup.

**Map state:** Switch choropleth mode — 2,000 small counties (pop
<250k) light up in olympic-blue tint, weighted by Paralympic per-100k.
Major-metro counties fade.

**Copy:** "About **68%** of small counties — population under 250,000 —
show Paralympic athlete representation rates above the major-metro
median. The pipeline lives in the small counties, not where you'd
expect."

### Ch 4 — "Pathway, not pedigree"
**Hook:** Frame Atlas's analytical contribution.

**Map state:** Fade out choropleth, zoom to Cobb County, GA (canonical
demo region). Pulse animation on Cobb pin. 3 analog peers fade in with
similarity arcs (mirrors current CountyMap arrival sequence).

**Copy:** "Atlas reads each county's pathway — Olympic and Paralympic
ranked separately, climate and sport mix held constant — to surface
the 3 most analytically-similar peer counties. Where the public surface
is silent, Atlas shows the structure."

### Ch 5 — "Find your county"
**Hook:** Closing CTA.

**Map state:** Map fades to background. ZipInput + tour CTA fade in.
RotatingGlobe resumes ambient rotation.

**Copy:** Existing hero copy ("Your county Team USA story" + ZipInput).

## Architecture

### Component tree

```
HomePage (view='hero')
├── ScrollytellingHero (NEW)
│   ├── ChapterIntro     (Ch 1 — text + faded map background)
│   ├── ChapterGap       (Ch 2 — 555 counties lit)
│   ├── ChapterUnderdog  (Ch 3 — 2000 small counties lit)
│   ├── ChapterPathway   (Ch 4 — Cobb + analogs reveal)
│   └── ChapterCta       (Ch 5 — existing hero content)
└── (existing HeroStat + ZipInput now nested INSIDE ChapterCta)
```

`ScrollytellingHero` orchestrates chapter state via react-scrollama.
Each chapter consumes shared context (map mode, focus county, opacity)
and renders its own copy block.

### Map state machine

Add new `mode` prop to CountyMap that accepts:
- `'default'` — current behavior (source + analogs + arcs)
- `'scrolly-empty'` — all counties warm-neutral, no source/analog
- `'scrolly-gap'` — 555 lit by athlete density, 2,667 dim
- `'scrolly-underdog'` — small-county choropleth (subset by population)
- `'scrolly-pathway'` — Cobb + 3 analogs (default behavior, scrollytelling-trigged)

Mode prop drives Geography styling. CountyMap stays single-source-of-
truth for the SVG; ScrollytellingHero is just the orchestrator.

### Sticky positioning

`<section style={{ height: '500vh' }}>` wraps the 5 chapters. Inside,
a sticky `<div style={{ position: 'sticky', top: 0, height: '100vh' }}>`
holds the map. Scrollama detects which chapter the user is currently
in and updates the map mode + chapter copy accordingly.

This is the canonical Pudding pattern. Every Pudding scrolly does it.

### Motion choreography

- Chapter copy: fade in (opacity 0 → 1) + translate-y (24px → 0) on
  enter, opposite on exit. Framer Motion variants.
- Map mode transitions: 800ms cross-fade between Geography fills.
  Use `<Geography>` `style` prop with transition-style attribute.
- Honor prefers-reduced-motion: skip transitions, snap to chapter states.

## Pitch re-storyboard

Current pitch script (per `docs/pitch_script.md`):
1. Beat 1: HeroStat reveal "4 in 5"
2. Beat 2: Submit ZIP, transition to results
3. Beat 3: Region profile + parity panel
4. Beat 4: ComplianceLog catch+rewrite
5. Beat 5: Pillar 5 closing

**With scrollytelling:** Beat 1 expands into 5 micro-beats covering
the scrolly chapters (~35s total — replaces the current 8-10s
HeroStat reveal). Net add to pitch length: ~25-27s. Within 3:00 budget
if Beats 3-5 are tightened by 5s each.

Beat 1 narration draft:
> "There are 3,222 counties in the United States. (pause, scroll) Of
> those, only 555 show any Team USA athlete representation in our
> indexed sources. (pause) **4 in 5** are silent. (pause, scroll)
> But the silence isn't where you'd expect. About 68% of small
> counties beat the major-metro Paralympic rate. (pause, scroll) The
> pipeline lives in the small counties. Atlas reads each county's
> pathway — Olympic and Paralympic ranked separately — to surface the
> 3 most similar peer counties. (pause, scroll, ZipInput appears)
> Find your county."

Stephen needs to:
1. Decide whether to commit to the re-storyboard (binary go/no-go)
2. Time the new Beat 1 against the pitch stopwatch
3. Re-record demo with new opener if go

Cut trigger: if scrollytelling isn't working by end of Day 9, cut and
ship without it. Conservative version still demos cleanly. Don't break
what works.

## Build sequence (Day 9 morning, ~8 hr)

1. **Hour 1:** Install `react-scrollama` + sketch `ScrollytellingHero`
   skeleton with 5 placeholder chapters + sticky map container.

2. **Hour 2:** Add `mode` prop to CountyMap + implement 'scrolly-empty'
   + 'scrolly-pathway' modes (the simplest two; others derive from them).

3. **Hour 3:** Implement 'scrolly-gap' and 'scrolly-underdog' modes.
   Test choropleth tint switches.

4. **Hour 4:** Wire scrollama chapter triggers + plug each chapter into
   the map mode state. Test scroll behavior end-to-end.

5. **Hour 5:** Editorial copy for each chapter. Plug `useGlobalStats`
   data into copy strings (don't hardcode numbers — let backend drive).

6. **Hour 6:** Motion polish — fade choreography, reduced-motion guard,
   mobile responsive (sticky positioning is fragile on mobile, may need
   per-breakpoint logic).

7. **Hour 7:** Review against pitch script. Adjust chapter copy / dwell
   time to align.

8. **Hour 8:** Manual QA on production build. Commit + push + redeploy.

## Cut criteria

If by end of hour 4 the scroll-trigger → map state flow isn't smooth,
cut. Either:
- Simpler: scrollytelling stays as a static section below the hero
  (no scroll triggers, just sequential text blocks).
- Cleanest: revert all scrollytelling commits, lock the existing build.

Half-built scrollytelling is the worst outcome. Better to ship clean
without it.

## Files touched

New:
- `frontend/src/components/ScrollytellingHero.tsx`
- `frontend/src/components/scrolly/ChapterIntro.tsx`
- `frontend/src/components/scrolly/ChapterGap.tsx`
- `frontend/src/components/scrolly/ChapterUnderdog.tsx`
- `frontend/src/components/scrolly/ChapterPathway.tsx`
- `frontend/src/components/scrolly/ChapterCta.tsx`

Modified:
- `frontend/src/components/CountyMap.tsx` (add `mode` prop)
- `frontend/src/pages/HomePage.tsx` (mount ScrollytellingHero in hero
  view; current ZipInput + HeroStat block becomes ChapterCta content)
- `package.json` (add react-scrollama)
- `docs/pitch_script.md` (rewrite Beat 1 around scrolly)
- `CLAUDE.md` (Layer D PENDING → SHIPPED line)

Deleted: none.

## Decision needed before Day 9 morning

**Stephen go/no-go:** commit to scrollytelling + re-record demo, OR
lock the existing build and use Day 9 for pitch dry-runs + recording.

If go: this plan executes Day 9. Demo records Day 10.
If no-go: Day 9 = pitch dry-runs + NotebookLM oracle + demo recording
on the existing build.

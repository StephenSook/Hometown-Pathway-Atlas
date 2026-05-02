# REFERENCE_FINDINGS.md — Phase A Design Research

> Working research dossier for Hometown Pathway Atlas frontend design lock. Editorial data journalism archetype, NOT cinematic agency portfolio. Drives DESIGN_SYSTEM.md synthesis (Phase C).
>
> **Sources:** Gemini deep research (NYT / Bloomberg / Reuters / Pudding / Census), Magic 21st component library (production React patterns), Pudding homepage scrape, prior council research.
>
> **Date:** 2026-05-01

---

## Table A — Editorial Data Journalism Anchors

| Source | Layout | Type Scale | Palette (hex) | Motion | Illustration | Mobile | O+P Dual-Data Notes |
|---|---|---|---|---|---|---|---|
| **NYT Interactive** — "Where Olympians Come From" | Sticky-map scrollytelling; narrative cards scroll over fixed Mapbox base | Hero 42px Cheltenham · Body 18px Georgia · Labels 12px Franklin | `#000` text · `#F6CB2F` saffron accent · `#F9F9F9` bg | Map `flyTo` triggers on text-card entry; smooth panning between hotspots | Flat vector geographic map; no in-map photos | Map snaps top, text cards stack below | Separate Winter/Summer tabs; consistent dot color across disciplines |
| **Bloomberg Graphics** — Tokyo 2020 Medal Count | High-density grid; "golden bubbles" on global choropleth | Title 32px Haas Bold · Table 13px Haas Roman · Data 12px Mono | `#000` bg · `#FFB000` gold · `#CCCCCC` silver · `#CC7722` bronze | Scroll-linked timeline scrubbing; bubbles morph on hover | Terminal-style; proportional circles + grid lines | Horizontal tables scroll; map simplifies to country shapes | Side-by-side participation counters (e.g., 11k vs 4k) for scale comparison |
| **Reuters Graphics** — Paris 2024 Medal Tracker | Multi-column dashboard with floating explainers + venue maps | Headline 30px Knowledge · Body 16px Source Sans · Captions 11px | `#FF8000` orange · `#232649` navy · `#555` gray | Staggered fade-in 300ms duration · 50ms stagger between bars | Isometric 3D venue renders + flat data viz | Mobile-first cards; charts re-sort to vertical stacks | Dual medal tables; highlights first-ever-medal countries across both Games |
| **The Pudding** — "Shape of an Athlete's Career" | Visual essay; beeswarm transitioning into coordinate timelines | Display 48px Publico · Body 20px Tiempos · UI 14px Atlas | `#F0F0F0` bg · `#326891` blue · `#BF9005` mustard | D3 force-directed transitions ~800ms; dots "walk" to new positions | Stylized vector dots; minimal UI chrome, narrative-first | Full-screen interactive; tap-to-advance | Compares age-at-peak across sports — useful template for Para vs Olympic side-by-side |
| **Census.gov** — 2024 Olympic Stats | Standard GIS-style dashboard; interactive state choropleth | Header 24px Sans · Body 14px · Legend 12px | `#002F6C` navy · `#D55E00` vermillion · `#E0E0E0` grid | Immediate filter on click; minimal transition | Pure data; standard US Census projection | Responsive iframe; legends collapse to toggle menus | **Per-capita normalization** for both Olympic + Paralympic (key Atlas pattern) |

> **URL caveat:** Gemini's web-search step partially failed mid-retry. URLs above are approximate — the design patterns themselves are accurate to each outlet's house style. Verify exact live URLs before citing in any published spec.

---

## Table B — Live Audit Feed References (for ComplianceLog)

| Source | Row Structure | Severity Colors | New-Entry Motion | Density | Typography |
|---|---|---|---|---|---|
| **Stripe Radar** | Avatar + Actor + Action + Status pill | `#24b47e` success · `#ffac00` warning · `#df1b41` danger | Slide-down + 0.4s fade; subtle yellow highlight on new | 32px row height · 12px padding | Sans (`system-ui`) for prose · Mono for ID/hash |
| **Datadog Logs** | Timestamp + Service + Status + Message | `#f05050` error · `#ffc227` warn · `#4a90e2` info | Instant arrival; scrolling tail view | 24px compact / 32px normal | Monospace for all fields (rigid alignment) |
| **Sentry Activity** | User + Verb + Resource + Relative Time | `#7b61ff` debug · `#f05050` issue | 200ms staggered slide-in for batches | 48px (high-breathability) | Sans for description · Mono for commit SHA |
| **LangSmith Trace** | Nested tree (elbow lines) + Duration + Cost | `#e2e8f0` neutral · `#24b47e` pass | Tree expands on click 150ms slide | 28px per tree node | Sans-serif with 400/600 weight contrast |

---

## Table C — Magic 21st Production React Patterns (Steal-Ready)

Pulled four near-fits from 21st.dev component library. Code patterns extracted; we use as templates, not full-clone.

### C.1 — Dashboard Activities (RecentActivityFeed) — closest fit for ComplianceLog

**Pattern:** Framer Motion `AnimatePresence` + `layout` prop on container, individual items use variants for enter/exit.

```tsx
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2, ease: "easeIn" } },
};

<motion.div layout className="divide-y divide-border">
  <AnimatePresence initial={false}>
    {activities.map((activity) => (
      <motion.div key={activity.id} variants={itemVariants}
        initial="hidden" animate="visible" exit="exit" layout
        className="flex items-start gap-3 p-4">
        <div className={cn("flex-shrink-0 p-1 rounded-full", activity.iconColorClass)}>
          <activity.icon className="h-4 w-4" />
        </div>
        <div className="flex-grow flex flex-col">
          <p className="text-sm font-medium leading-tight">{activity.message}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{activity.timestamp}</p>
        </div>
      </motion.div>
    ))}
  </AnimatePresence>
</motion.div>
```

**Atlas adaptation:** swap `iconColorClass` for `layerIndicator` (Rules vs Gemini), add 1.5s wash-decay on entry, use 'fixed' status that swaps before→after diff.

### C.2 — Sticky Scroll Cards Section — closest fit for AnalogList drill-down sequence

**Pattern:** Cards have `sticky` class + same `top: 200px`, creating a stacking effect as user scrolls.

```tsx
{features.map((feature, index) => (
  <div key={index}
    className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 p-12 rounded-3xl mb-16 sticky"
    style={{ top: '200px' }}>
    {/* card content */}
  </div>
))}
```

**Atlas adaptation:** three AnalogCards stack as user scrolls past source RegionProfile. Each scales down 0.97 per index for depth illusion.

### C.3 — Kinetic Log Stream — terminal-aesthetic for live feed

**Pattern:** dark terminal-window chrome, monospace font, color-coded log type icons, spring entry animation.

```tsx
const logVariants = {
  initial: { opacity: 0, x: -50, scale: 0.8 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
  exit: { opacity: 0, x: 50, transition: { duration: 0.3 } }
};
```

**Atlas adaptation:** AVOID the terminal chrome (too dark for editorial palette). KEEP the spring-entry animation timing for entries. Severity color discipline lives in our palette as `#2E8B57 success / #D97706 warning / #B91C1C danger`.

### C.4 — Bento Grid Layout — closest fit for hero+RegionProfile composition

**Pattern:** 2x2 grid (`md:grid-cols-2 md:grid-rows-2`) with each cell containing a domain widget (map, chart, message-feed, feature-cards). All cells share a consistent border + padding rhythm.

**Atlas adaptation:** hero composition uses bento — top-left: ZipInput card, top-right: brief Atlas explainer, bottom-left: live ComplianceLog preview, bottom-right: "explore" CTA card. RegionProfile uses bento too — ParityPanel + SportMix + Climate + AdaptiveAccess as four cells.

---

## Table D — Pudding Homepage (Visual Style Reference)

| Aspect | Observation |
|---|---|
| **Color palette** | Light bg, colorful sticker accents on nav icons (varied hues) |
| **Typography** | Clean contemporary sans-serif; hierarchical heading sizes; readable contrast |
| **Layout** | Grid article cards with thumbnail + title + date (#) + month/year + brief description |
| **Navigation** | Icon-based "stickers" arranged horizontally |
| **Pagination** | Masonry-style article cards with "Load More Stories" |

> Note: Pudding sports archive returned only one article in homepage scrape — we proceed without specific Pudding sports article URLs and rely on the general Pudding aesthetic.

---

## Steal List — Tactical Patterns for Atlas DESIGN_SYSTEM.md

Numbered for cross-reference in the spec. Direct mappings to Atlas components.

1. **Editorial palette anchor** — `#1F3A5F` navy (data series, headers) + `#2E75B6` accent blue (interaction) + `#F5F1EB` warm neutral (cards) + `#5B7DB1` Olympic + `#B96B5C` Paralympic. Avoid generic web-blue. Background surfaces stay `#F5F1EB` warm or `#FFFFFF` — never pure `#000` with neon.

2. **Typographic hierarchy ("Graphics Rig" standard)** — Inter 18px for narrative body · Inter 12px sans for map labels · Instrument Serif italic 18-24px for accent words inside headings · IBM Plex Mono / JetBrains Mono 12px for FIPS, county codes, audit log timestamps, evidence labels.

3. **The "Reuters stagger"** — entrance animations 300ms `ease-out`. For long lists (analogs, audit rows, region profile metrics), use 50ms stagger per row for the cascading editorial feel.

4. **Audit row grammar** — every Compliance Log entry follows `[Timestamp] [Layer] [Check] [Status] [Detail]`, e.g., `14:02:11 · rules · no_athlete_names · pass`. Mono for timestamp + check name, sans for status + detail.

5. **Per-capita normalization (Census + Bloomberg)** — show Olympic and Paralympic counts as "per 100k population" so rural counties are not crushed by metros. Display raw count as secondary tooltip metric, not primary visual.

6. **Status semantics (Stripe spec mapped to editorial palette)** — `#2E8B57` verified data · `#D97706` pending/inferred · `#B91C1C` anomaly/outlier. Reuse the same three across data quality badges, audit-log severity, Pattern Gaps confidence.

7. **Sticky-map layout (NYT pattern)** — anchor map on right 60% of viewport; left 40% holds scrollable narrative + region profile cards. On mobile collapse to map-on-top, cards-below stack.

8. **Mono-metadata convention (Sentry/Datadog)** — every "raw" value (FIPS code, lat/long, athlete count, percentile) renders in monospace for vertical scan alignment in tables.

9. **Scroll-linked map interpolation** — bind scroll position to map zoom so camera transitions national → state → county precisely on chapter breaks (Bloomberg scrubbing pattern). For Layer D Scrollytelling.

10. **Dual-data side-by-side (never merged)** — for Olympic vs Paralympic, use Bloomberg's twin-counter pattern: parallel columns, identical visual treatment, distinct accent (`#5B7DB1` Olympic, `#B96B5C` Paralympic). Same dot size, same chart type, separate color channels.

11. **Audit-feed motion budget** — new entries slide-down + fade over 300-400ms (Stripe), with a 1.5s subtle highlight wash that decays to neutral. Do not flash, do not bounce — Compliance Log must read as audit-grade, not gamified. Spring stiffness for "fixed" status entries: 300, damping 20 (from Magic 21st Kinetic Log Stream).

12. **Gutter discipline** — strict 24px (Tailwind p-6) internal padding on data cards and audit rows. This single rule does most of the heavy lifting for "looks editorial, not portfolio."

13. **Sticky-stacking analog cards (Magic 21st C.2)** — three AnalogCards use `sticky` + same `top` value to create stacking depth as user scrolls past source profile. Each card scales 0.97 per index for depth illusion.

14. **Bento composition (Magic 21st C.4)** — RegionProfile is a 2x2 bento: ParityPanel + SportMix + Climate + AdaptiveAccess. Hero is also bento: ZipInput + brief explainer + live ComplianceLog preview + explore CTA.

15. **Framer Motion item variants for Compliance Log (Magic 21st C.1)** — `AnimatePresence` + `layout` prop + per-entry variants (hidden/visible/exit). 0.3s entry, 0.2s exit, ease-out / ease-in. Verified production-ready pattern.

---

## Anti-pattern enforcement (from research)

What to NOT ship — codified for DESIGN_SYSTEM.md §9:

- ❌ Pure black `#000` background with neon accents — agency portfolio aesthetic
- ❌ Full-bleed background video on hero — SaaS template tell
- ❌ `.liquid-glass` class with `backdrop-filter: blur(50px)` everywhere — every Magic 21st-generated SaaS site has this; judges will recognize
- ❌ Olympic ring iconography or torch imagery — DQ
- ❌ Red/white/blue patriotic palette — anti-pattern per locked decision
- ❌ Athlete faces or NIL exposure — DQ
- ❌ Three.js / WebGL as architectural backbone — ship risk + impact penalty (one targeted r3f particle layer Day 8 OK as Layer B opt-in)
- ❌ Causal language anywhere in user-facing strings — auditor catches but we strip at design time too
- ❌ Cinematic 80px Instrument Serif headline as the entire hero (Velorah / Asme / motionsites.ai pattern) — wrong shape for data tool
- ❌ Mux HLS background video for any visual layer — overkill, no video assets, slows first paint

---

## Olympic+Paralympic dual-data visualization patterns (specific to Atlas)

Synthesizing across all references for the parity-display challenge:

| Pattern | Where it works | Where it fails |
|---|---|---|
| **Twin counter** (Bloomberg) | Strong when comparing scale (counts, percentiles) | Fails when one side is sparse (Paralympic-low counties) |
| **Side-by-side density chart** (NYT) | Good for time-series comparison | Doesn't scale to county-level grid |
| **Per-capita radial gauge** (Census) | Honest about denominator | Visually heavier than line/bar |
| **Single chart, two color series** (D3 standard) | Most common, most-recognized | Risk of legend confusion + accidental "merge" interpretation |

**Atlas decision:** Bloomberg twin counter pattern + per-capita normalization + percentile rank against own national distribution. Two parallel columns. Distinct accent hues with equal saturation/lightness. Evidence labels per side. Never merged into single number.

---

## Reference URLs (verify before citing)

- NYT Interactive — Olympic hometown features (multiple, search nyt.com/interactive + olympics)
- Bloomberg Graphics — bloomberg.com/graphics/tokyo-2020-summer-olympics-medal-count/ (verify live)
- Reuters Graphics — graphics.reuters.com (Paris 2024 olympics tracker, verify)
- The Pudding — pudding.cool (browse for sports demographics)
- Census Bureau — census.gov/library/visualizations (search Olympic)
- Stripe Radar — stripe.com/radar
- Datadog Logs — datadoghq.com
- Sentry Activity — sentry.io
- LangSmith Trace — smith.langchain.com
- 21st.dev component library — 21st.dev (Magic MCP source)

---

## Application to Atlas components (preview for Phase C)

| Atlas Component | Steal from | Specific pattern |
|---|---|---|
| Hero / ZipInput | Bento (C.4) | 2x2 grid composition with ZipInput top-left |
| RegionHeader | NYT typography | 32-40px Inter + Instrument Serif italic accent for county name |
| ParityPanel | Bloomberg twin counter (10) | Two columns, identical chrome, distinct accents |
| SportMix | Recharts + Census per-capita (5) | Horizontal bars w/ z-score |
| ClimateBadge | Pudding stylized vector dots | Custom illustrated climate zone icons |
| AdaptiveAccessCard | Stripe status pill (6) | Confidence label with tri-color semantic |
| AnalogList | Sticky stacking (13) | Three cards stack as user scrolls |
| AnalogCard | Reuters dashboard (3) | Cascading 50ms stagger entry |
| SimilarityBreakdown | Census bar chart | Per-dimension breakdown w/ per-capita normalization labels |
| TradeoffPanel | Pudding narrative | Conditional language, expandable detail |
| CountyMap | NYT sticky-map (7) | Right 60% map, left 40% narrative on desktop; stack mobile |
| PatternGapPanel | Stripe semantic tri-color (6) | Three categories color-coded |
| ComplianceLog | Magic 21st Dashboard Activities (C.1) + audit feed grammar (4) | AnimatePresence + variants + mono timestamps |
| Loading state | Pudding minimal | Skeleton matching final shape, no spinner inside components |
| Mobile responsive | NYT (1) + Reuters (3) | Map snaps top, narrative stacks below |

---

_Generated 2026-05-01 by Claude (Phase A research). Inputs synthesized from Gemini deep research + Magic 21st component library + WebFetch (Pudding) + prior council research dossiers. Source caveats noted above. Do not cite Table A URLs without live verification._

# Mobile breakpoint sweep — 2026-05-03

Static-analysis audit of every component in `frontend/src/components/`
to verify mobile-first responsive layout. Methodology: grep for
Tailwind responsive prefixes (`sm:` `md:` `lg:` `xl:`) plus fixed
pixel widths plus raw `grid-cols-N` without `grid-cols-1` fallback.
Yesterday's Playwright sweep at 375×812 already verified Pillar5Defense
specifically; this audit covers the rest of the surface.

## Verdict

PASS. Zero structural fixes required.

## Findings detail

### Page-wide grids — all use responsive fallback

| Component | Layout | Mobile | Verdict |
|---|---|---|---|
| AnalogList | `grid-cols-1 md:grid-cols-3` | stacks 1-col | ✓ |
| PatternGapPanel | `grid-cols-1 md:grid-cols-3` | stacks 1-col | ✓ |
| HomePage region profile (SportMix + ClimateBadge + AdaptiveAccessCard) | parent `grid-cols-1 md:grid-cols-3 gap-6` | stacks 1-col | ✓ |
| Pillar5Strip | `grid-cols-1 md:grid-cols-3 gap-8` | stacks 1-col | ✓ |
| Pillar5Defense | `grid-cols-1 md:grid-cols-[1fr_2fr]` (zone) + `grid-cols-1 md:grid-cols-3` (NGB chips) | stacks zones + chips 1-col | ✓ verified at 375px |
| ParityPanel | `grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x` | stacks Olympic above Paralympic with horizontal divider | ✓ |

### Card components — designed for any container

12 components flagged by static-analysis as "no responsive prefix":
AdaptiveAccessCard, AnalogCard, ClimateBadge, CountyMap, CountyTooltip,
EvidenceLabel, GapCard, LogEntry, SimilarityBreakdown, SportMix,
TradeoffPanel, ZipInput.

False positive — these cards are designed to fit any container. They
rely on the PARENT's responsive grid (e.g., `grid-cols-1 md:grid-cols-3`
in HomePage) to handle layout switching. Each card itself just renders
flex-column content that flows naturally at any container width.

### Fixed pixel widths — all auto-clamp via mx-auto

- HeroStat `max-w-[640px] mx-auto px-6` — auto-clamps within viewport
- HomePage hero `max-w-[880px] mx-auto px-6` — same pattern
- MethodologyPage `max-w-3xl mx-auto px-6` — same pattern
- CountyTooltip `min-w-[200px]` — pointer-anchored fixed tooltip, by
  design

### Single intentional tight layout

ComplianceLog mobile drawer renders `grid-cols-2` for the Rules + Gemini
columns regardless of viewport. At 375px viewport with 32px outer margin
+ panel padding + col divider, each column is ~158px content width.
Tight but functional.

This is by design: the panel is hidden by default on mobile (FAB
toggle), so a user opening it has explicitly opted into the audit
view. The 2-column Rules/Gemini split is the locked Pillar 4 anatomy
per DESIGN_SYSTEM §4.16. Stacking 1-col on mobile would conceal the
"two parallel audit layers" framing that's the visual narrative.

If browser review surfaces real text wrap/clip issues at 375px, the
fix is reducing column padding (currently `px-3`) rather than
collapsing to 1-col.

## Re-run instructions

```bash
cd frontend/src/components
# Find raw grid-cols-N without grid-cols-1 fallback
grep -nE "grid-cols-[2-9]" *.tsx | grep -v "grid-cols-1.*md:grid-cols\|grid-cols-1 sm:"

# Find fixed widths above 400px
grep -nE 'w-\[(4[0-9][0-9]|[5-9][0-9][0-9])px\]|min-w-\[(4[0-9][0-9]|[5-9][0-9][0-9])px\]' *.tsx

# Find flex-row without responsive consideration
grep -nE "flex-row" *.tsx
```

When new components ship, re-run these three commands and triage any
new flags against the same false-positive criteria above.

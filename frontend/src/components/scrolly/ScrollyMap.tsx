/**
 * ScrollyMap — slim US choropleth used by ScrollytellingHero chapters.
 *
 * Distinct from CountyMap (which renders a single source + 3 analog
 * peers + arcs + Move United dots + drill-down + zoom controls). The
 * scrolly version renders ONLY the 3,231 counties tinted by chapter
 * mode. No overlays, no controls, no interactivity. Pure visual
 * backdrop for chapter copy.
 *
 * Five modes drive Geography fill:
 *   - 'empty'    — all warm-neutral; opens the scrolly with negative space
 *   - 'gap'      — counties with athlete representation lit navy by density
 *   - 'underdog' — Paralympic-rep counties lit clay; metro tint dimmed
 *   - 'pathway'  — Cobb (13067) + 3 known analogs lit, rest dimmed
 *   - 'cta'      — opacity fade-out so the ZIP form on top reads
 *
 * Performance: 3,231 counties × 5 modes = potentially 16k style reads
 * across the scroll. Module-level WeakMap-style cache (per-mode +
 * per-fips) keeps each mode's styling memoized; mode switches just
 * re-bind the cached object refs, no per-county recomputation.
 *
 * Reduced motion: caller (ScrollytellingHero) decides whether to mount
 * this at all under reduced-motion preference. ScrollyMap itself just
 * renders whatever mode it's given.
 */

import { useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import countiesTopo from 'us-atlas/counties-10m.json';
import countyDensity from '../../data/county_density.json';

export type ScrollyMode = 'empty' | 'gap' | 'underdog' | 'pathway' | 'cta';

interface ScrollyMapProps {
  mode: ScrollyMode;
}

// Hardcoded Cobb + analogs for 'pathway' chapter — derived live from
// /api/analogs/13067 on 2026-05-04 PM. Stable per locked decision #10
// (top 3 analogs from similarity matrix); these are the canonical demo
// values. If similarity matrix re-derives in a future session, these
// FIPS would need updating. Worth one console.warn in DEV if backend
// returns different ones.
const COBB_FIPS = '13067';
const ANALOG_FIPS = new Set(['51510', '45019', '09120']);

type DensityRow = readonly [number, number, number]; // [olympic, paralympic, percentile]
const densityMap = countyDensity as unknown as Record<string, DensityRow>;

interface GeoStyle {
  default: Record<string, string | number>;
  hover: Record<string, string | number>;
  pressed: Record<string, string | number>;
}

// Empty + dim modes: counties rendered with navy stroke at low alpha so
// the map structure reads as a faint blueprint even when no county is
// "lit." Earlier iteration used the warm-neutral border (#E7E2D9) which
// disappeared into the warm-neutral background — Stephen flagged Ch 1
// looked too empty for the demo opener (2026-05-04 visual review).
// Stronger stroke on empty + dim makes the 3,222-county scaffold
// visible while still reading as "silence" against the lit chapters.
const WARM_NEUTRAL: GeoStyle = {
  default: { fill: '#F5F1EB', stroke: 'rgba(31, 58, 95, 0.22)', strokeWidth: 0.5, outline: 'none' },
  hover: { fill: '#F5F1EB', stroke: 'rgba(31, 58, 95, 0.22)', strokeWidth: 0.5, outline: 'none' },
  pressed: { fill: '#F5F1EB', outline: 'none' },
};

const DIM: GeoStyle = {
  default: { fill: '#F5F1EB', stroke: 'rgba(31, 58, 95, 0.12)', strokeWidth: 0.4, outline: 'none', opacity: 0.55 },
  hover: { fill: '#F5F1EB', stroke: 'rgba(31, 58, 95, 0.12)', strokeWidth: 0.4, outline: 'none', opacity: 0.55 },
  pressed: { fill: '#F5F1EB', outline: 'none' },
};

const SOURCE: GeoStyle = {
  default: { fill: '#1F3A5F', stroke: '#FFFFFF', strokeWidth: 0.5, outline: 'none' },
  hover: { fill: '#1F3A5F', stroke: '#FFFFFF', strokeWidth: 0.5, outline: 'none' },
  pressed: { fill: '#1F3A5F', outline: 'none' },
};

const ANALOG: GeoStyle = {
  default: { fill: '#5B7DB1', stroke: '#FFFFFF', strokeWidth: 0.5, outline: 'none' },
  hover: { fill: '#5B7DB1', stroke: '#FFFFFF', strokeWidth: 0.5, outline: 'none' },
  pressed: { fill: '#5B7DB1', outline: 'none' },
};

function navyTint(total: number): GeoStyle {
  // Lifted opacity floor 0.08 → 0.32 (single-athlete counties were
  // invisible against warm-neutral background). Cap raised 0.55 → 0.78
  // so dense metros pop convincingly. Stroke also navy-tinted to give
  // each lit county a clear edge.
  const opacity = Math.min(0.78, Math.log10(total + 1) * 0.42 + 0.22);
  return {
    default: { fill: `rgba(31, 58, 95, ${opacity.toFixed(3)})`, stroke: 'rgba(31, 58, 95, 0.45)', strokeWidth: 0.5, outline: 'none' },
    hover: { fill: `rgba(31, 58, 95, ${opacity.toFixed(3)})`, stroke: 'rgba(31, 58, 95, 0.45)', strokeWidth: 0.5, outline: 'none' },
    pressed: { fill: `rgba(31, 58, 95, ${opacity.toFixed(3)})`, outline: 'none' },
  };
}

function clayTint(paralympic: number): GeoStyle {
  // Paralympic-focused tint for underdog chapter — clay (paralympic-
  // brand color) at variable opacity. Counties with paralympic
  // representation pop forward; counties with only Olympic recede.
  // Bumped floor 0.15 → 0.38 + cap 0.6 → 0.82 so the underdog signal
  // reads clearly against the dimmed metro background (Stephen
  // 2026-05-04 visual review — Ch 3 was too faint).
  const opacity = Math.min(0.82, Math.log10(paralympic + 1) * 0.5 + 0.38);
  return {
    default: { fill: `rgba(185, 107, 92, ${opacity.toFixed(3)})`, stroke: 'rgba(185, 107, 92, 0.55)', strokeWidth: 0.5, outline: 'none' },
    hover: { fill: `rgba(185, 107, 92, ${opacity.toFixed(3)})`, stroke: 'rgba(185, 107, 92, 0.55)', strokeWidth: 0.5, outline: 'none' },
    pressed: { fill: `rgba(185, 107, 92, ${opacity.toFixed(3)})`, outline: 'none' },
  };
}

// Per-mode style cache. Computed lazily on first reference per mode,
// then reused for all subsequent geographies + scroll passes.
const styleCache: Record<ScrollyMode, Map<string, GeoStyle>> = {
  empty: new Map(),
  gap: new Map(),
  underdog: new Map(),
  pathway: new Map(),
  cta: new Map(),
};

function styleFor(mode: ScrollyMode, fips: string): GeoStyle {
  const cached = styleCache[mode].get(fips);
  if (cached) return cached;

  const density = densityMap[fips];
  const olympic = density?.[0] ?? 0;
  const paralympic = density?.[1] ?? 0;
  const total = olympic + paralympic;

  let style: GeoStyle;
  switch (mode) {
    case 'empty':
      style = WARM_NEUTRAL;
      break;
    case 'gap':
      style = total > 0 ? navyTint(total) : WARM_NEUTRAL;
      break;
    case 'underdog':
      // Paralympic-representation counties light clay; Olympic-only
      // counties stay dim. Visually pivots the same county set from
      // navy-tint in 'gap' chapter to clay-tint here, making the
      // "different lens, same atlas" reading concrete.
      if (paralympic > 0) {
        style = clayTint(paralympic);
      } else if (olympic >= 5) {
        // Big-Olympic counties (proxy for major metro) recede so the
        // Paralympic underdog signal pops forward.
        style = DIM;
      } else {
        style = WARM_NEUTRAL;
      }
      break;
    case 'pathway':
      if (fips === COBB_FIPS) {
        style = SOURCE;
      } else if (ANALOG_FIPS.has(fips)) {
        style = ANALOG;
      } else {
        style = DIM;
      }
      break;
    case 'cta':
      style = WARM_NEUTRAL;
      break;
  }

  styleCache[mode].set(fips, style);
  return style;
}

export default function ScrollyMap({ mode }: ScrollyMapProps) {
  // CTA mode: drop the map entirely so the RotatingGlobe behind the
  // hero content reads as the sole visual texture. Earlier iteration
  // dimmed the map to opacity 0.25 in CTA, but the dimmed US scaffold
  // competed with the globe — Stephen 2026-05-04 PM visual review.
  // Returning null also lets the parent sticky layer stop rendering
  // an SVG that has zero load-bearing visual purpose at this beat.
  if (mode === 'cta') return null;

  // Memoize the geography render fn per mode so React doesn't tear
  // down + remount every <Geography> on each scroll tick.
  const renderGeographies = useMemo(
    () =>
      ({ geographies }: { geographies: Array<{ rsmKey: string; id: string }> }) =>
        geographies.map((geo) => (
          <Geography
            key={geo.rsmKey}
            geography={geo as unknown as never}
            style={styleFor(mode, geo.id) as never}
          />
        )),
    [mode],
  );

  return (
    <ComposableMap
      projection="geoAlbersUsa"
      projectionConfig={{ scale: 1100 }}
      width={900}
      height={560}
      style={{
        width: '100%',
        height: 'auto',
        // CTA path returns null upstream; type-narrowed mode never
        // reaches here as 'cta'. opacity: 1 is the only state.
        opacity: 1,
        transition: 'opacity 0.6s ease-out',
      }}
      aria-hidden="true"
    >
      <Geographies geography={countiesTopo}>{renderGeographies}</Geographies>
    </ComposableMap>
  );
}

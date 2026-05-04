/**
 * CountyMap — US choropleth showing source county + analog peers.
 * Anatomy per DESIGN_SYSTEM §4.13.
 *
 * Rendered with `react-simple-maps@3` (geoAlbersUsa projection, includes
 * AK/HI insets). TopoJSON is the bundled `us-atlas/counties-10m.json`.
 *
 * Visual contract:
 * - All counties: `warm-neutral` fill (no per-county metric data yet)
 * - Source FIPS: `navy` fill + label callout
 * - Analog FIPSes: lighter olympic-blue tint + olympic-blue circle pin
 * - Similarity arcs: paralympic-clay dotted Bezier with arrowhead marker
 * - Bottom-right legend card explains the three marks
 * - Top-right limited-data chip surfaces when any FIPS is missing a centroid
 *
 * Per-100k choropleth gradient is intentionally deferred — backend `/api/region`
 * does not yet expose neighbor-county metrics. PLAN 3.9 ships highlights only.
 *
 * Accessibility:
 * - Outer figure carries an aria-label but NOT role="img" — role="img" makes
 *   all descendants presentational, hiding the focusable Geography aria-labels
 *   AND the Legend from AT (W3C ACT-Rules 307n5z, MDN ARIA img role).
 * - Source + analog Geographies are Tab-reachable with descriptive aria-label.
 *   Background counties stay tabIndex={-1} to keep keyboard nav usable.
 * - Visible keyboard focus ring lives in `index.css` (`.rsm-geography
 *   [tabindex='0']:focus-visible`) — react-simple-maps merges focus into hover
 *   internally, so we restore the focus indicator at the CSS layer.
 *
 * Performance:
 * - Geography style objects are memoized const (SOURCE_STYLE / ANALOG_STYLE /
 *   DEFAULT_STYLE). `<Geography>` is wrapped in `memo()` upstream; without
 *   stable style refs, every hover would re-render all 3000+ counties.
 *
 * React 19 risk: `react-simple-maps` v3 still pulls in `prop-types`. Added as
 * a direct dep so Vite/Rolldown resolves it. If runtime errors surface, swap
 * to `@nivo/geo` per PLAN.md task 3.9.
 */

import { useCallback, useId, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  useMapContext,
} from 'react-simple-maps';
import countiesTopo from 'us-atlas/counties-10m.json';
import type { AnalogEntry } from '../lib/api';
import type { CountyTooltipData } from './CountyTooltip';
import CountyTooltip from './CountyTooltip';
// Static data extracted 2026-05-04 from Vinh's
// backend/data/processed/county_profiles.parquet (3,222 counties) +
// move_united_chapters.parquet (260 chapters). Slim shapes:
//   countyDensity: {fips: [olympic_count, paralympic_count, olympic_percentile]}
//   moveUnitedChapters: [[lat, lng], ...]
// Powers the choropleth tinting (background counties darken by athlete
// representation density) + the Move United chapter dot layer. Bundles
// inline rather than fetched at runtime so CountyMap renders complete
// on first paint (already lazy-loaded chunk; ~16KB gz extra).
import countyDensity from '../data/county_density.json';
import moveUnitedChapters from '../data/move_united_chapters.json';
import { fmtPerCapita } from '../lib/format';
import { cn } from '../lib/utils';

type DensityRow = readonly [number, number, number]; // [olympic, paralympic, percentile]
// Cast through `unknown` because Vite's JSON-import inference widens
// the array shapes to plain `number[]` (loses tuple arity) — TS won't
// downcast `number[]` to `readonly [number, number, number]` directly.
// The runtime shape IS the tuple per the extraction script — the cast
// just tells the type-system to trust the producer.
const densityMap = countyDensity as unknown as Record<string, DensityRow>;
const chapterCoords = moveUnitedChapters as unknown as ReadonlyArray<readonly [number, number]>;

// Choropleth — non-highlighted counties get a navy-tinted fill at
// variable opacity based on combined athlete count. Sequential scale
// caps at 35% opacity to stay subtle (doesn't compete with the navy
// source pin or olympic-blue analog pins). Counties with zero athletes
// keep the warm-neutral default fill so the map's negative space
// reads as "no data" not "low data".
//
// Module-level cache keyed by fips so we don't allocate a new style
// object per Geography per render — preserves the memo() bailout that
// keeps 3,222 counties from re-rendering on every hover state change.
const densityStyleCache = new Map<string, typeof DEFAULT_STYLE>();
function getDensityStyle(fips: string): typeof DEFAULT_STYLE {
  const cached = densityStyleCache.get(fips);
  if (cached) return cached;
  const data = densityMap[fips];
  const total = data ? data[0] + data[1] : 0;
  if (total === 0) {
    densityStyleCache.set(fips, DEFAULT_STYLE);
    return DEFAULT_STYLE;
  }
  // Logarithmic scale — most counties have 0-5 athletes, but LA/Cook/
  // Harris have 50+. Linear would flatten the distribution. Log keeps
  // visual variance across the long tail. Cap at 0.35 opacity so the
  // densest counties don't overpower the source pin.
  const opacity = Math.min(0.35, Math.log10(total + 1) * 0.18);
  const fill = `rgba(91, 125, 177, ${opacity.toFixed(3)})`;
  const hoverFill = `rgba(91, 125, 177, ${Math.min(0.55, opacity + 0.18).toFixed(3)})`;
  const style = {
    default: { ...DEFAULT_STYLE.default, fill },
    hover: { ...DEFAULT_STYLE.hover, fill: hoverFill },
    pressed: { ...DEFAULT_STYLE.pressed, fill },
  };
  densityStyleCache.set(fips, style);
  return style;
}

// Fallback centroids for mock-only flows (sparse sentinel ZIP 11111
// + the 4 mock counties). Real backend (Vinh Phase 2 ship 2026-05-03)
// emits centroid: [lng, lat] | null on every RegionResponse +
// AnalogEntry — caller passes those via sourceCentroid prop +
// AnalogEntry.centroid field. This table only gates against the
// frontend-only mock paths where centroid wasn't available at the
// data source. Drop entirely if mock paths get a centroid backfill
// or after backend wire-up sweeps every demo path.
const FALLBACK_CENTROIDS: Record<string, [number, number]> = {
  '13067': [-84.55, 33.94], // Cobb County, GA — mockRegion
  '37119': [-80.83, 35.24], // Mecklenburg County, NC — mockAnalogs[0]
  '37183': [-78.65, 35.78], // Wake County, NC — mockAnalogs[1]
  '21111': [-85.66, 38.19], // Jefferson County, KY — mockAnalogs[2]
  '30033': [-106.99, 47.02], // Garfield County, MT — mockSparseRegion
};

// Memoized style objects — defined module-level to keep referential equality
// across renders so memo() on <Geography> bails out and we don't pay for
// 3000+ rerenders on hover state changes.
const SOURCE_STYLE = {
  default: { fill: '#1F3A5F', stroke: '#E7E2D9', strokeWidth: 0.3, outline: 'none' },
  hover: { fill: '#1F3A5F', stroke: '#1F3A5F', strokeWidth: 0.5, outline: 'none', cursor: 'crosshair' },
  pressed: { fill: '#1F3A5F', outline: 'none' },
};
const ANALOG_STYLE = {
  default: { fill: '#D6E0EE', stroke: '#E7E2D9', strokeWidth: 0.3, outline: 'none' },
  hover: { fill: '#E7E2D9', stroke: '#1F3A5F', strokeWidth: 0.5, outline: 'none', cursor: 'crosshair' },
  pressed: { fill: '#D6E0EE', outline: 'none' },
};
const DEFAULT_STYLE = {
  default: { fill: '#F5F1EB', stroke: '#E7E2D9', strokeWidth: 0.3, outline: 'none' },
  hover: { fill: '#E7E2D9', stroke: '#1F3A5F', strokeWidth: 0.5, outline: 'none', cursor: 'crosshair' },
  pressed: { fill: '#F5F1EB', outline: 'none' },
};

interface CountyMapProps {
  sourceFips: string;
  /** Source county centroid as [lng, lat] from RegionResponse.centroid.
   *  Falls back to FALLBACK_CENTROIDS when null (mock paths). */
  sourceCentroid?: [number, number] | null;
  sourceTooltip: CountyTooltipData;
  analogs: AnalogEntry[];
  className?: string;
}

interface HoverState {
  fips: string;
  x: number;
  y: number;
  data: CountyTooltipData;
}

export default function CountyMap({
  sourceFips,
  sourceCentroid,
  sourceTooltip,
  analogs,
  className,
}: CountyMapProps) {
  const [hover, setHover] = useState<HoverState | null>(null);
  // Zoom + pan state. ZoomableGroup handles drag-pan + scroll-zoom
  // internally; we maintain coordinates + zoom so external buttons
  // (+ / − / reset) can drive the same state. Initial centered on
  // continental US (lng -96, lat 38) at 1x — matches default
  // geoAlbersUsa rendering of the static map.
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [-96, 38],
    zoom: 1,
  });
  const arrowMarkerId = useId();

  const handleMoveEnd = useCallback(
    (next: { coordinates: [number, number]; zoom: number }) => {
      setPosition(next);
    },
    [],
  );

  const zoomIn = useCallback(() => {
    setPosition((p) => ({ ...p, zoom: Math.min(5, p.zoom * 1.5) }));
  }, []);

  const zoomOut = useCallback(() => {
    setPosition((p) => ({ ...p, zoom: Math.max(1, p.zoom / 1.5) }));
  }, []);

  const resetZoom = useCallback(() => {
    setPosition({ coordinates: [-96, 38], zoom: 1 });
  }, []);

  // Single source of truth for centroid lookup. Prefers the API-supplied
  // centroid, falls back to FALLBACK_CENTROIDS for mock paths or any
  // legacy backend response that hasn't yet populated the field. One
  // DEV-mode warn per missing FIPS on the way through, plus a
  // missingCount surface for the visible degradation chip below.
  const centroids = useMemo(() => {
    const source: [number, number] | null =
      sourceCentroid ?? FALLBACK_CENTROIDS[sourceFips] ?? null;
    // byFips: O(1) lookup keyed by FIPS, used by arc render + label render.
    // Replaces O(n²) `analogList.find(...)` + `analogs.find(...)` pattern
    // that ran on every parent render of those JSX expressions. n is always
    // 3 per locked decision #10, so the asymptotic win is small (9 → 3
    // comparisons), but the consistency with `analogTooltipsByFips`
    // (already a Map below) matters more than the perf delta. (Codex
    // review 2026-05-04 caught the asymmetry.)
    const byFips = new Map<string, { coords: [number, number] | null; analog: AnalogEntry }>();
    for (const a of analogs) {
      byFips.set(a.fips, {
        coords: a.centroid ?? FALLBACK_CENTROIDS[a.fips] ?? null,
        analog: a,
      });
    }
    const analogList = analogs.map((a) => ({
      fips: a.fips,
      coords: byFips.get(a.fips)?.coords ?? null,
    }));
    if (import.meta.env.DEV) {
      if (!source) {
        console.warn(
          `[CountyMap] Source FIPS ${sourceFips} has no centroid in API ` +
            `response or FALLBACK_CENTROIDS. Pin will not render.`,
        );
      }
      analogList.forEach((x) => {
        if (!x.coords) {
          console.warn(
            `[CountyMap] Analog FIPS ${x.fips} has no centroid in API ` +
              `response or FALLBACK_CENTROIDS. Pin + arc will not render.`,
          );
        }
      });
    }
    return { source, analogList, byFips };
  }, [sourceFips, sourceCentroid, analogs]);

  const totalCount = 1 + analogs.length;
  const plottedCount =
    (centroids.source ? 1 : 0) + centroids.analogList.filter((x) => x.coords).length;
  const missingCount = totalCount - plottedCount;

  const analogTooltipsByFips = useMemo(() => {
    const map = new Map<string, CountyTooltipData>();
    for (const a of analogs) {
      map.set(a.fips, {
        countyName: a.county_name,
        state: a.state,
        olympicPer100k: a.metrics.olympic.per_100k,
        paralympicPer100k: a.metrics.paralympic.per_100k,
        olympicEvidence: a.metrics.olympic.evidence,
        paralympicEvidence: a.metrics.paralympic.evidence,
      });
    }
    return map;
  }, [analogs]);

  const analogFipsSet = useMemo(
    () => new Set(analogs.map((a) => a.fips)),
    [analogs],
  );

  const lookup = useCallback(
    (id: string, name?: string): CountyTooltipData => {
      if (id === sourceFips) return sourceTooltip;
      const a = analogTooltipsByFips.get(id);
      if (a) return a;
      return {
        countyName: name ?? 'Unknown',
        state: '',
        olympicPer100k: null,
        paralympicPer100k: null,
      };
    },
    [sourceFips, sourceTooltip, analogTooltipsByFips],
  );

  const handleMove = useCallback(
    (e: React.MouseEvent, id: string, name?: string) => {
      setHover({ fips: id, x: e.clientX, y: e.clientY, data: lookup(id, name) });
    },
    [lookup],
  );

  const clearHover = useCallback(() => setHover(null), []);

  return (
    <figure
      aria-label={`Map showing ${sourceTooltip.countyName} and three peer-county candidates our similarity model could be associated with`}
      className={cn(
        'relative rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-4',
        className,
      )}
      style={{
        // Hairline editorial grid — Reuters/Pudding scenery move. Grid sits on
        // the figure container BEHIND the SVG (which uses bg-card-white and
        // warm-neutral county fills, both opaque, so the grid is only visible
        // in the figure margin around the map). Subtle navy at ~3% opacity —
        // does not compete with the choropleth, signals editorial precision.
        backgroundImage:
          'linear-gradient(to right, rgba(31,58,95,0.04) 1px, transparent 1px), ' +
          'linear-gradient(to bottom, rgba(31,58,95,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Wrapper carries onMouseLeave so the tooltip clears even when the
       * pointer exits the SVG into the figure padding gap (figure-level
       * onMouseLeave wouldn't fire there). */}
      <div onMouseLeave={clearHover}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          width={800}
          height={500}
          style={{ width: '100%', height: 'auto' }}
        >
          <defs>
            <marker
              id={arrowMarkerId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#B96B5C" />
            </marker>
            {/* Hatch pattern reserved for counties with confidence below
             * empirical-Bayes threshold, OR counties truly missing source
             * data. Backend Phase 2 (Vinh tasks 2.1-2.10) will expose a
             * `data_confidence` flag per FIPS — once that lands, switch
             * affected county Geographies to fill="url(#missing-data-hatch)"
             * instead of warm-neutral. Scoped to defs-only today so the
             * pattern is ready when backend signal arrives without
             * requiring a CountyMap structural change. */}
            <pattern
              id="missing-data-hatch"
              patternUnits="userSpaceOnUse"
              width="6"
              height="6"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill="#F5F1EB" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="#1F3A5F"
                strokeOpacity="0.18"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            maxZoom={5}
            minZoom={1}
          >

          <Geographies geography={countiesTopo}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const id = geo.id as string;
                const name = (geo.properties as { name?: string })?.name;
                const isSource = id === sourceFips;
                const isAnalog = analogFipsSet.has(id);
                const isHighlighted = isSource || isAnalog;
                const style = isSource
                  ? SOURCE_STYLE
                  : isAnalog
                    ? ANALOG_STYLE
                    : getDensityStyle(id);
                const tip = isHighlighted ? lookup(id, name) : null;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    tabIndex={isHighlighted ? 0 : -1}
                    role={isHighlighted ? 'img' : undefined}
                    aria-label={tip ? formatGeographyLabel(tip) : undefined}
                    // Hover handlers ONLY on highlighted counties (source +
                    // 3 analogs). Attaching onMouseMove to all 3,222
                    // counties causes a re-render storm during zoom/pan —
                    // every cursor pixel triggers setHover even on
                    // background counties that have no tooltip data.
                    // (Codex review 2026-05-04 caught the perf risk that
                    // also explains the 5s screenshot timeout in cold-
                    // check Playwright runs.)
                    onMouseMove={isHighlighted ? (e) => handleMove(e, id, name) : undefined}
                    onMouseLeave={isHighlighted ? clearHover : undefined}
                    onFocus={(e) => {
                      if (!isHighlighted) return;
                      const rect = (e.target as SVGElement).getBoundingClientRect();
                      setHover({
                        fips: id,
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                        data: lookup(id, name),
                      });
                    }}
                    onBlur={clearHover}
                    style={style}
                  />
                );
              })
            }
          </Geographies>

          {analogs.map((a, index) => {
            const from = centroids.source;
            const to = centroids.byFips.get(a.fips)?.coords ?? null;
            if (!from || !to) return null;
            return (
              <BezierArc
                key={`arc-${a.fips}`}
                from={from}
                to={to}
                markerId={arrowMarkerId}
                index={index}
              />
            );
          })}

          {centroids.source && (
            <Marker coordinates={centroids.source}>
              {/* Pulsing concentric ring — "you are here" affordance.
                  Subtle (low opacity, slow 2s cycle) so it doesn't
                  compete with the analog arcs. Mirrors the AUDIT chip
                  pulse animation language. Honors prefers-reduced-motion
                  via PulseRing internal hook. */}
              <PulseRing />
              <circle r={6} fill="#1F3A5F" stroke="#FFFFFF" strokeWidth={1.5} />
              <text
                x={10}
                y={4}
                fontFamily="JetBrains Mono, ui-monospace, monospace"
                fontSize={10}
                fontWeight={600}
                fill="#1F3A5F"
              >
                {sourceTooltip.countyName.toUpperCase()}
              </text>
            </Marker>
          )}

          {centroids.analogList.map((x) => {
            if (!x.coords) return null;
            // Look up matching analog entry for label text via byFips Map
            // (O(1) — was O(n) .find before 2026-05-04 refactor).
            const analog = centroids.byFips.get(x.fips)?.analog;
            // Truncate "Greater Bridgeport Planning Region" → "Greater
            // Bridgeport" so labels don't overlap each other on the map.
            // Take first 2 words max; for "Alexandria city" → "Alexandria"
            // works naturally.
            const fullName = analog?.county_name ?? '';
            const labelText = fullName
              .split(/\s+/)
              .slice(0, 2)
              .join(' ');
            // Flip label to LEFT side when pin sits in the extreme right
            // of the US (lng > -74° — captures Connecticut, NJ, far-east
            // NY). Greater Bridgeport CT (~-73.2°) was clipping past the
            // map's right edge with the default right-side label. Stephen
            // caught 2026-05-04. Threshold tuned so VA + SC pins stay
            // right-side (Alexandria ~-77°, Charleston ~-79.9°).
            const lng = x.coords[0];
            const labelOnLeft = lng > -74;
            return (
              <Marker key={`pin-${x.fips}`} coordinates={x.coords}>
                <circle
                  r={5}
                  fill="#5B7DB1"
                  stroke="#FFFFFF"
                  strokeWidth={1.25}
                />
                {labelText && (
                  <text
                    x={labelOnLeft ? -9 : 9}
                    y={4}
                    textAnchor={labelOnLeft ? 'end' : 'start'}
                    fontFamily="JetBrains Mono, ui-monospace, monospace"
                    fontSize={9}
                    fontWeight={500}
                    fill="#1F3A5F"
                  >
                    {labelText.toUpperCase()}
                  </text>
                )}
              </Marker>
            );
          })}

          {/* Move United chapter density layer — 260 small dots, navy
              at low opacity. Subtle visual reinforcement of Pillar 5 /
              Beat 1 narrative ("63% of Paralympic athletes route through
              this network → network reaches only fraction of US
              counties"). Renders inside ZoomableGroup so dots scale +
              pan with the map. */}
          <MoveUnitedLayer />
          </ZoomableGroup>
        </ComposableMap>

        {/* Zoom controls — overlaid top-left of figure. Bottom-left is
            occupied by the ProvenanceFooter (Sources panel); top-left
            is clear. Stacked vertical pills matching the AUDIT chip +
            SectionNav design language. Reset only renders when
            zoom !== 1. */}
        <div className="absolute top-6 left-6 z-10 hidden md:flex flex-col gap-1.5">
          <button
            type="button"
            onClick={zoomIn}
            disabled={position.zoom >= 5}
            aria-label="Zoom in"
            title="Zoom in"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-card-white border border-soft-border shadow-md text-navy hover:bg-warm-neutral focus-ring transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            disabled={position.zoom <= 1}
            aria-label="Zoom out"
            title="Zoom out"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-card-white border border-soft-border shadow-md text-navy hover:bg-warm-neutral focus-ring transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          {position.zoom !== 1 && (
            <button
              type="button"
              onClick={resetZoom}
              aria-label="Reset map zoom"
              title="Reset zoom"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-card-white border border-soft-border shadow-md text-muted-text hover:text-navy hover:bg-warm-neutral focus-ring transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <Legend />

      <ProvenanceFooter />

      {missingCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-6 right-6 max-w-[260px] rounded-xl bg-card-white border border-soft-border shadow-md p-3"
        >
          <p className="font-serif italic text-caption text-muted-text leading-snug">
            Map highlights limited — {missingCount} of {totalCount} regions could
            not be plotted in our indexed location data.
          </p>
        </div>
      )}

      {hover && (
        <CountyTooltip
          x={hover.x}
          y={hover.y}
          countyName={hover.data.countyName}
          state={hover.data.state}
          olympicPer100k={hover.data.olympicPer100k}
          paralympicPer100k={hover.data.paralympicPer100k}
          olympicEvidence={hover.data.olympicEvidence}
          paralympicEvidence={hover.data.paralympicEvidence}
        />
      )}
    </figure>
  );
}

/**
 * PulseRing — concentric expanding ring behind the source pin. Visual
 * "you are here" affordance, mirrors the AUDIT chip pulse language.
 *
 * Animates: r from 5 → 14, opacity from 0.5 → 0, repeating every 2s.
 * The ring is a stroke-only circle (fill="none") so it expands as a
 * hollow ring rather than a filled disc.
 *
 * Honors prefers-reduced-motion: when set, renders a static ring at
 * mid-state opacity instead of animating.
 */
function PulseRing() {
  const reduceMotion = useReducedMotion() ?? false;
  if (reduceMotion) {
    return (
      <circle r={9} fill="none" stroke="#1F3A5F" strokeOpacity={0.25} strokeWidth={1.25} />
    );
  }
  return (
    <motion.circle
      fill="none"
      stroke="#1F3A5F"
      strokeWidth={1.25}
      initial={{ r: 5, opacity: 0.55 }}
      animate={{ r: [5, 14, 14], opacity: [0.55, 0, 0] }}
      transition={{
        duration: 2.2,
        repeat: Infinity,
        ease: 'easeOut',
        times: [0, 0.7, 1],
      }}
    />
  );
}

/**
 * MoveUnitedLayer — render 260 chapter dots from the bundled JSON.
 *
 * Each dot is a small navy circle at low opacity inside a Marker so
 * react-simple-maps' projection handles lng/lat → SVG coords. Dots
 * scale + pan with the parent ZoomableGroup transform.
 *
 * Visual restraint: r=1.6, opacity 0.35, navy fill — quiet enough to
 * NOT compete with the source pin, analog pins, or arcs (all of which
 * are bolder), but visible at first paint as a geographic-density
 * scatter overlay. Reinforces the Pillar 5 / Beat 1 narrative without
 * hijacking the visual hierarchy.
 *
 * Uses a single <g> with raw <circle> children projected via
 * useMapContext.projection, NOT 260 individual <Marker> components —
 * 260 Marker re-renders on every parent state change would be wasteful.
 */
function MoveUnitedLayer() {
  const { projection } = useMapContext();
  return (
    <g aria-hidden="true">
      {chapterCoords.map(([lat, lng], i) => {
        const projected = projection([lng, lat]);
        if (!projected) return null;
        const [x, y] = projected;
        return (
          <circle
            key={`mu-${i}`}
            cx={x}
            cy={y}
            r={1.6}
            fill="#1F3A5F"
            fillOpacity={0.35}
          />
        );
      })}
    </g>
  );
}

function formatGeographyLabel(t: CountyTooltipData): string {
  const o =
    t.olympicPer100k === null
      ? 'no Olympic data'
      : `${fmtPerCapita(t.olympicPer100k)} Olympic per 100k`;
  const p =
    t.paralympicPer100k === null
      ? 'no Paralympic data'
      : `${fmtPerCapita(t.paralympicPer100k)} Paralympic per 100k`;
  const place = `${t.countyName}${t.state ? `, ${t.state}` : ''}`;
  return `${place}. ${o}. ${p}. Representation patterns in our indexed sources.`;
}

/**
 * BezierArc — quadratic curve between two lng/lat points using the parent
 * map's projection. Lifted perpendicular to the chord for a gentle arc.
 *
 * `projection` is set synchronously inside MapProvider before any child
 * renders (verified in react-simple-maps@3 dist), so we don't guard for
 * the projection itself. Out-of-bounds coords (e.g. Pacific territories)
 * still need the p1/p2 null checks because geoAlbersUsa rejects them.
 */
function BezierArc({
  from,
  to,
  markerId,
  index = 0,
}: {
  from: [number, number];
  to: [number, number];
  markerId: string;
  /** Stagger index — arc N animates draw-on at delay 0.3s + N * 0.18s.
   *  First arc lands at 0.3s, last at 0.3 + 2 * 0.18 = 0.66s for 3 arcs.
   *  Sequential reveal feels like data flowing source → peers. */
  index?: number;
}) {
  const { projection } = useMapContext();
  const reduceMotion = useReducedMotion() ?? false;
  const p1 = projection(from);
  const p2 = projection(to);
  if (!p1 || !p2) return null;
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const norm = Math.hypot(dx, dy) || 1;
  const lift = Math.min(60, norm * 0.25);
  const cx = mx + (-dy / norm) * lift;
  const cy = my + (dx / norm) * lift;
  return (
    <motion.path
      d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
      fill="none"
      stroke="#B96B5C"
      strokeWidth={1.5}
      strokeDasharray="4 3"
      strokeLinecap="round"
      markerEnd={`url(#${markerId})`}
      initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        pathLength: { duration: 1.2, delay: 0.3 + index * 0.18, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.4, delay: 0.3 + index * 0.18 },
      }}
    />
  );
}

function Legend() {
  return (
    <div
      aria-label="Map legend"
      className="absolute bottom-6 right-6 rounded-xl bg-card-white border border-soft-border shadow-md p-3 flex flex-col gap-2"
    >
      <p className="font-mono uppercase tracking-wider text-eyebrow text-navy">
        Legend
      </p>
      <LegendRow swatch="navy" label="Source county" />
      <LegendRow swatch="olympic" label="Peer counties" />
      <LegendRow swatch="clay" label="Similarity link" />
      <LegendRow swatch="chapter" label="Move United chapter" />
      <DensityGradientRow />
    </div>
  );
}

/**
 * DensityGradientRow — horizontal gradient swatch + label.
 * Communicates that background-county tint encodes athlete-representation
 * density (none → highest indexed). Brand-consistent: navy at variable
 * opacity matches the choropleth fill rule in getDensityStyle.
 */
function DensityGradientRow() {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="shrink-0 inline-block h-2 w-12 rounded-sm"
        style={{
          background:
            'linear-gradient(to right, rgba(91,125,177,0) 0%, rgba(91,125,177,0.35) 100%)',
        }}
      />
      <span className="text-caption text-body-text">Athlete density</span>
    </div>
  );
}

/**
 * ProvenanceFooter — names the four-source data join behind the map.
 * Per 2026-05-03 Sookra Council: structural-gap claim ("zero public products
 * aggregate at county-FIPS with parity") MUST show its receipts on screen.
 * Without provenance visible within ~10s of the map appearing, the gap claim
 * reads as marketing rather than analytical work.
 *
 * Sources named: USOPC (Team USA roster + NGB list), NFHS (high-school
 * athletic participation), BLS (county economic context), NWS (climate).
 * Update date is hand-set — when backend ingest pipelines refresh on Day 8
 * deploy, bump the date here.
 */
function ProvenanceFooter() {
  return (
    <div
      aria-label="Data sources"
      className="absolute bottom-6 left-6 rounded-xl bg-card-white border border-soft-border shadow-md p-3 max-w-[260px]"
    >
      <p className="font-mono uppercase tracking-wider text-eyebrow text-navy mb-1">
        Sources
      </p>
      <p className="font-serif italic text-caption text-muted-text leading-snug">
        USOPC roster · NFHS participation · BLS county economics · NWS climate
      </p>
      <p className="font-mono text-eyebrow text-muted-text mt-1">
        Joined at county FIPS · Updated 2026-05
      </p>
    </div>
  );
}

function LegendRow({
  swatch,
  label,
}: {
  swatch: 'navy' | 'olympic' | 'clay' | 'chapter';
  label: string;
}) {
  // Decorative swatches use raw hex strokes to satisfy DESIGN_SYSTEM §1.1
  // (olympic-blue + paralympic-clay are restricted to bar fills + ≥24px text).
  // Hollow circles avoid the small-area background-fill rule. Chapter dot
  // uses the same low-opacity navy as the actual map dots.
  const stroke: Record<typeof swatch, string> = {
    navy: '#1F3A5F',
    olympic: '#5B7DB1',
    clay: '#B96B5C',
    chapter: '#1F3A5F',
  };
  const fill: Record<typeof swatch, string> = {
    navy: '#1F3A5F',
    olympic: 'transparent',
    clay: 'transparent',
    chapter: 'rgba(31,58,95,0.35)',
  };
  const strokeWidth: Record<typeof swatch, number> = {
    navy: 1.5,
    olympic: 1.5,
    clay: 1.5,
    chapter: 0,
  };
  return (
    <div className="flex items-center gap-2">
      <svg
        aria-hidden="true"
        width={12}
        height={12}
        viewBox="0 0 12 12"
        className="shrink-0"
      >
        <circle
          cx={6}
          cy={6}
          r={swatch === 'chapter' ? 2.5 : 5}
          fill={fill[swatch]}
          stroke={stroke[swatch]}
          strokeWidth={strokeWidth[swatch]}
        />
      </svg>
      <span className="text-caption text-body-text">{label}</span>
    </div>
  );
}

// CountyMapSkeleton moved to ./CountyMapSkeleton.tsx — leaf-only file
// avoids dragging us-atlas TopoJSON + react-simple-maps + d3-geo into
// every loading state of ResultsSkeleton.

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
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  useMapContext,
} from 'react-simple-maps';
import countiesTopo from 'us-atlas/counties-10m.json';
import type { AnalogEntry } from '../lib/api';
import type { CountyTooltipData } from './CountyTooltip';
import CountyTooltip from './CountyTooltip';
import { fmtPerCapita } from '../lib/format';
import { cn } from '../lib/utils';

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
  const arrowMarkerId = useId();

  // Single source of truth for centroid lookup. Prefers the API-supplied
  // centroid, falls back to FALLBACK_CENTROIDS for mock paths or any
  // legacy backend response that hasn't yet populated the field. One
  // DEV-mode warn per missing FIPS on the way through, plus a
  // missingCount surface for the visible degradation chip below.
  const centroids = useMemo(() => {
    const source: [number, number] | null =
      sourceCentroid ?? FALLBACK_CENTROIDS[sourceFips] ?? null;
    const analogList = analogs.map((a) => ({
      fips: a.fips,
      coords: a.centroid ?? FALLBACK_CENTROIDS[a.fips] ?? null,
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
    return { source, analogList };
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
                    : DEFAULT_STYLE;
                const tip = isHighlighted ? lookup(id, name) : null;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    tabIndex={isHighlighted ? 0 : -1}
                    role={isHighlighted ? 'img' : undefined}
                    aria-label={tip ? formatGeographyLabel(tip) : undefined}
                    onMouseMove={(e) => handleMove(e, id, name)}
                    onMouseLeave={clearHover}
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
            const to = centroids.analogList.find((x) => x.fips === a.fips)?.coords ?? null;
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
            // Find the matching analog entry to get the county name for
            // the label. Analog list is small (3) so .find is fine.
            const analog = analogs.find((a) => a.fips === x.fips);
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
        </ComposableMap>
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
  swatch: 'navy' | 'olympic' | 'clay';
  label: string;
}) {
  // Decorative swatches use raw hex strokes to satisfy DESIGN_SYSTEM §1.1
  // (olympic-blue + paralympic-clay are restricted to bar fills + ≥24px text).
  // Hollow circles avoid the small-area background-fill rule.
  const stroke: Record<typeof swatch, string> = {
    navy: '#1F3A5F',
    olympic: '#5B7DB1',
    clay: '#B96B5C',
  };
  const fill: Record<typeof swatch, string> = {
    navy: '#1F3A5F',
    olympic: 'transparent',
    clay: 'transparent',
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
          r={5}
          fill={fill[swatch]}
          stroke={stroke[swatch]}
          strokeWidth={1.5}
        />
      </svg>
      <span className="text-caption text-body-text">{label}</span>
    </div>
  );
}

// CountyMapSkeleton moved to ./CountyMapSkeleton.tsx — leaf-only file
// avoids dragging us-atlas TopoJSON + react-simple-maps + d3-geo into
// every loading state of ResultsSkeleton.

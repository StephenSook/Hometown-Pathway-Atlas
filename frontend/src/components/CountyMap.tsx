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

// Hardcoded centroids for the four counties used in the mock dataset.
// Backend contract addition tracked in PLAN.md task 0.9 + DESIGN_SYSTEM
// §13.2.1 — once `AnalogEntry`/`RegionResponse` grow a `centroid` field,
// this lookup goes away.
const KNOWN_CENTROIDS: Record<string, [number, number]> = {
  '13067': [-84.55, 33.94], // Cobb County, GA
  '37119': [-80.83, 35.24], // Mecklenburg County, NC
  '37183': [-78.65, 35.78], // Wake County, NC
  '21111': [-85.66, 38.19], // Jefferson County, KY
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
  sourceTooltip,
  analogs,
  className,
}: CountyMapProps) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const arrowMarkerId = useId();

  // Single source of truth for centroid lookup. One DEV-mode warn per
  // missing FIPS on the way through, plus a missingCount surface for the
  // visible degradation chip below.
  const centroids = useMemo(() => {
    const source = KNOWN_CENTROIDS[sourceFips] ?? null;
    const analogList = analogs.map((a) => ({
      fips: a.fips,
      coords: KNOWN_CENTROIDS[a.fips] ?? null,
    }));
    if (import.meta.env.DEV) {
      if (!source) {
        console.warn(
          `[CountyMap] Source FIPS ${sourceFips} missing from KNOWN_CENTROIDS. ` +
            `Wire centroid through AnalogEntry per DESIGN_SYSTEM §13.2.1.`,
        );
      }
      analogList.forEach((x) => {
        if (!x.coords) {
          console.warn(`[CountyMap] Analog FIPS ${x.fips} missing from KNOWN_CENTROIDS.`);
        }
      });
    }
    return { source, analogList };
  }, [sourceFips, analogs]);

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

          {analogs.map((a) => {
            const from = centroids.source;
            const to = centroids.analogList.find((x) => x.fips === a.fips)?.coords ?? null;
            if (!from || !to) return null;
            return (
              <BezierArc
                key={`arc-${a.fips}`}
                from={from}
                to={to}
                markerId={arrowMarkerId}
              />
            );
          })}

          {centroids.source && (
            <Marker coordinates={centroids.source}>
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

          {centroids.analogList.map((x) =>
            x.coords ? (
              <Marker key={`pin-${x.fips}`} coordinates={x.coords}>
                <circle r={5} fill="#5B7DB1" stroke="#FFFFFF" strokeWidth={1.25} />
              </Marker>
            ) : null,
          )}
        </ComposableMap>
      </div>

      <Legend />

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
}: {
  from: [number, number];
  to: [number, number];
  markerId: string;
}) {
  const { projection } = useMapContext();
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
    <path
      d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
      fill="none"
      stroke="#B96B5C"
      strokeWidth={1.5}
      strokeDasharray="4 3"
      strokeLinecap="round"
      markerEnd={`url(#${markerId})`}
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

export function CountyMapSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading regional map"
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-4 animate-pulse',
        className,
      )}
    >
      <div className="aspect-[8/5] w-full rounded-xl bg-soft-border" />
    </div>
  );
}

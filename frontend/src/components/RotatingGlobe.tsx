/**
 * RotatingGlobe — subtle ambient world map that rotates slowly behind
 * the landing-view hero text. Editorial-restrained interpretation of
 * the "spinning globe" pattern from Stephen's Bloom AI reference
 * (2026-05-04). NOT a glossy 3D earth — a low-opacity wireframe-style
 * orthographic projection of world country borders, navy on warm-
 * neutral, rotating one full revolution every 90 seconds.
 *
 * Why orthographic + react-simple-maps over three.js / globe.gl:
 *   - Atlas brand is editorial-restraint, not glossy 3D
 *   - geoOrthographic in d3-geo gives the "globe view" without WebGL
 *     overhead (~25KB world-110m TopoJSON gz vs ~150KB three.js)
 *   - Zero new tooling — already have d3-geo + topojson-client + Vite
 *
 * Position: absolute behind hero content. pointer-events:none so it
 * never steals from the ZipInput / HeroStat / tour CTA.
 *
 * Honors prefers-reduced-motion: skips RAF rotation, renders static
 * orthographic view rotated to a "default tilt" (looks like Earth
 * from a perspective angle, not a flat circle).
 *
 * Bundle: world-atlas/countries-110m.json (~80KB raw / ~25KB gz)
 * inlined via JSON import. Lands on the initial bundle since the
 * landing view is the first paint — globe is part of the hero
 * landing experience, not lazy-loadable like CountyMap.
 */

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
// world-atlas ships JSON without strict types but Vite's JSON import
// inference is permissive enough that react-simple-maps' geography
// prop accepts it without a cast at compile time.
import worldTopo from 'world-atlas/countries-110m.json';

interface RotatingGlobeProps {
  /** Diameter in CSS pixels. Default 720 — large but constrained
   *  by parent absolute positioning. */
  size?: number;
  /** Rotation speed in seconds for one full revolution. Default 90s
   *  (slow ambient — judges shouldn't notice motion at first; the
   *  globe is a visual texture, not a focal element). */
  rotationDurationSec?: number;
  className?: string;
}

export default function RotatingGlobe({
  size = 720,
  rotationDurationSec = 90,
  className,
}: RotatingGlobeProps) {
  const reduceMotion = useReducedMotion() ?? false;
  // Rotation state — [longitude, latitude, roll]. We rotate longitude
  // continuously, hold latitude at -10° (slight downward tilt for the
  // "Earth from above the equator" perspective), roll at 0.
  const [rotation, setRotation] = useState<[number, number, number]>([0, -10, 0]);

  useEffect(() => {
    if (reduceMotion) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsedSec = (now - start) / 1000;
      const lng = (elapsedSec / rotationDurationSec) * 360;
      setRotation([lng, -10, 0]);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion, rotationDurationSec]);

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        pointerEvents: 'none',
        // Bumped 0.18 → 0.32 on 2026-05-04 PM — at the lower opacity the
        // globe was nearly invisible against warm-neutral background per
        // Stephen's CTA-chapter visual review. 0.32 keeps it ambient
        // (still recedes behind HeroStat / ZipInput) while reading as
        // clearly present rather than ghosted.
        opacity: 0.32,
      }}
    >
      <ComposableMap
        projection="geoOrthographic"
        projectionConfig={{ scale: size / 2.1, rotate: rotation }}
        width={size}
        height={size}
        style={{ width: '100%', height: 'auto' }}
      >
        {/* Background sphere — gives the globe a subtle filled
            silhouette so the rotating country borders don't feel
            disembodied. Editorial navy at low alpha. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2.1}
          fill="rgba(31, 58, 95, 0.04)"
          stroke="rgba(31, 58, 95, 0.18)"
          strokeWidth={0.8}
        />
        <Geographies geography={worldTopo}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: {
                    fill: 'rgba(31, 58, 95, 0.10)',
                    stroke: 'rgba(31, 58, 95, 0.35)',
                    strokeWidth: 0.4,
                    outline: 'none',
                  },
                  hover: {
                    fill: 'rgba(31, 58, 95, 0.10)',
                    stroke: 'rgba(31, 58, 95, 0.35)',
                    strokeWidth: 0.4,
                    outline: 'none',
                  },
                  pressed: {
                    fill: 'rgba(31, 58, 95, 0.10)',
                    outline: 'none',
                  },
                }}
              />
            ))
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}

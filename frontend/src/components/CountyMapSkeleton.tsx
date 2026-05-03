/**
 * CountyMapSkeleton — leaf-only loading placeholder for CountyMap.
 *
 * Lives in its own file (not co-located with CountyMap.tsx) so importing
 * the skeleton via ResultsSkeleton doesn't drag in the ~230KB us-atlas
 * TopoJSON + react-simple-maps + d3-geo bundle that the parent module
 * pulls in at the top.
 *
 * Render shape matches the loaded CountyMap card chrome (rounded-2xl
 * card with the 8/5 aspect placeholder) so layout doesn't reflow when
 * data lands per DESIGN_SYSTEM §7.1.
 */

import { cn } from '../lib/utils';

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

/**
 * ClimateBadge — region climate signature card.
 * Anatomy per DESIGN_SYSTEM §4.6 + icon mapping per §6.1.
 *
 * Lucide icons (no custom SVG per §6.1 cut). One icon per zone.
 */

import {
  Sun,
  Cloud,
  Flame,
  Trees,
  Snowflake,
  SunMedium,
  CloudRain,
  type LucideIcon,
} from 'lucide-react';
import type { ClimateProfile } from '../lib/api';
import { fmtPopulation } from '../lib/format';
import { cn } from '../lib/utils';

interface ClimateBadgeProps {
  climate: ClimateProfile;
  className?: string;
}

const ZONE_ICONS: Record<string, LucideIcon> = {
  humid_subtropical: Sun,
  marine_west_coast: Cloud,
  semi_arid: Flame,
  continental: Trees,
  subarctic: Snowflake,
  mediterranean: SunMedium,
  tropical: CloudRain,
};

function prettyZone(zone: string): string {
  return zone
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function ClimateBadge({ climate, className }: ClimateBadgeProps) {
  const Icon = ZONE_ICONS[climate.zone] ?? Cloud;

  return (
    <article
      aria-label={`Climate signature: ${prettyZone(climate.zone)}`}
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-6',
        className,
      )}
    >
      <p className="font-mono uppercase tracking-wider text-eyebrow text-navy mb-4">
        Climate
      </p>

      <div className="flex items-center gap-3 mb-4">
        <Icon className="h-6 w-6 text-navy shrink-0" aria-hidden="true" />
        <span className="text-body font-medium text-body-text">
          {prettyZone(climate.zone)}
        </span>
      </div>

      <dl className="flex flex-col gap-2 font-mono text-caption">
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-text uppercase tracking-wider">Avg temp</dt>
          <dd className="text-body-text tabular">
            {climate.avg_temp_f.toFixed(1)}°F
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-text uppercase tracking-wider">Precip</dt>
          <dd className="text-body-text tabular">
            {climate.annual_precip_in.toFixed(1)} in
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-text uppercase tracking-wider">Elevation</dt>
          <dd className="text-body-text tabular">
            {fmtPopulation(climate.elevation_ft)} ft
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function ClimateBadgeSkeleton({ className }: { className?: string }) {
  return (
    <article
      aria-busy="true"
      aria-label="Loading climate signature"
      className={cn(
        'rounded-2xl bg-card-white border border-soft-border shadow-card-resting p-6 animate-pulse',
        className,
      )}
    >
      <div className="h-3 w-16 rounded bg-soft-border mb-4" />
      <div className="flex items-center gap-3 mb-4">
        <div className="h-6 w-6 rounded bg-soft-border" />
        <div className="h-5 w-40 rounded bg-soft-border" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 w-20 rounded bg-soft-border" />
            <div className="h-3 w-16 rounded bg-soft-border" />
          </div>
        ))}
      </div>
    </article>
  );
}

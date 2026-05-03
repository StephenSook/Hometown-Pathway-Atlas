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
import SourceTooltip from './SourceTooltip';
import { cn } from '../lib/utils';

const DASH = '—';

const CLIMATE_SOURCE =
  'NOAA nClimGrid 5km gridded climate dataset, county-FIPS aggregated 30-year normals. Zone classification per Köppen-Geiger system. Avg temp / precip are county centroid values; null when nClimGrid coverage is unavailable for the county polygon.';

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
        <SourceTooltip source={CLIMATE_SOURCE}>Climate</SourceTooltip>
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
            {climate.avg_temp_f === null
              ? DASH
              : `${climate.avg_temp_f.toFixed(1)}°F`}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-text uppercase tracking-wider">Precip</dt>
          <dd className="text-body-text tabular">
            {climate.annual_precip_in === null
              ? DASH
              : `${climate.annual_precip_in.toFixed(1)} in`}
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

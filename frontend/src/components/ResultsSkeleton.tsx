/**
 * ResultsSkeleton — orchestrator that mirrors the HomePage results view
 * layout with skeleton placeholders for every component.
 *
 * Used during the loading state between submit and real data arriving.
 * Per DESIGN_SYSTEM §7.1 — skeletons match final shape so the layout
 * doesn't reflow when data lands.
 *
 * Pillar5Strip is intentionally excluded (spec §4.18 forbids a loading
 * state — numbers must always be visible). ComplianceLog is rendered
 * as an overlay sibling and has its own ComplianceLogSkeleton mounted
 * separately by the page.
 */

import { RegionHeaderSkeleton } from './RegionHeader';
import { CountyMapSkeleton } from './CountyMapSkeleton';
import { ParityPanelSkeleton } from './ParityPanel';
import { SportMixSkeleton } from './SportMix';
import { ClimateBadgeSkeleton } from './ClimateBadge';
import { AdaptiveAccessCardSkeleton } from './AdaptiveAccessCard';
import { AnalogListSkeleton } from './AnalogList';
import { PatternGapPanelSkeleton } from './PatternGapPanel';
import { TradeoffPanelSkeleton } from './TradeoffPanel';
import { cn } from '../lib/utils';

interface ResultsSkeletonProps {
  className?: string;
}

export default function ResultsSkeleton({ className }: ResultsSkeletonProps) {
  return (
    <section
      aria-busy="true"
      aria-label="Loading region representation results"
      className={cn('mx-auto max-w-7xl px-6', className)}
    >
      <div className="mb-10">
        <RegionHeaderSkeleton />
      </div>

      <div className="mb-10">
        <CountyMapSkeleton />
      </div>

      <ParityPanelSkeleton className="max-w-3xl mx-auto" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <SportMixSkeleton />
        <ClimateBadgeSkeleton />
        <AdaptiveAccessCardSkeleton />
      </div>

      <div className="mt-16">
        <AnalogListSkeleton />
      </div>

      <div className="mt-12">
        <PatternGapPanelSkeleton />
      </div>

      <div className="mt-8">
        <TradeoffPanelSkeleton />
      </div>
    </section>
  );
}

/**
 * Footer — editorial-finish bottom-of-page card. Renders on all 3
 * views (hero / results / methodology). Mirror Navbar's role as a
 * persistent shell element rather than a per-view component.
 *
 * Anatomy:
 *   - Atlas wordmark + tagline (left)
 *   - Quick links (center): Methodology, GitHub, Apache 2.0 LICENSE
 *   - Data-as-of date stamp (right) — NYT/Bloomberg editorial pattern
 *     making data freshness visible without requiring a tooltip
 *
 * A11y: <footer role="contentinfo"> landmark. Internal links use real
 * <a href>; external links open in new tab with rel="noopener
 * noreferrer". Date is wrapped in <time dateTime> for AT date-format
 * pickup.
 *
 * The data-as-of date is module-scope const — bump it whenever the
 * underlying parquet data refreshes (Vinh's ingest re-run). Keeps
 * the footer source-of-truth in one place rather than fanning out
 * across components.
 */

import { Code2 } from 'lucide-react';
import { cn } from '../lib/utils';

const DATA_AS_OF = '2026-05-03';
const REPO_URL = 'https://github.com/StephenSook/Hometown-Pathway-Atlas';
const LICENSE_URL =
  'https://github.com/StephenSook/Hometown-Pathway-Atlas/blob/main/LICENSE';

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps) {
  return (
    <footer
      role="contentinfo"
      className={cn(
        'mt-16 border-t border-soft-border bg-warm-neutral',
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div>
          <p className="font-mono uppercase tracking-wider text-eyebrow text-navy mb-1">
            Hometown Pathway Atlas
          </p>
          <p className="font-serif italic text-caption text-muted-text leading-snug">
            Per-capita parity. County granularity. Audit-grade.
          </p>
        </div>

        <nav aria-label="Footer navigation" className="md:text-center">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 md:justify-center text-caption">
            <li>
              <a
                href="#about"
                className="font-mono uppercase tracking-wider text-eyebrow text-navy hover:text-olympic-blue focus-ring rounded transition-colors"
              >
                Methodology
              </a>
            </li>
            <li>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono uppercase tracking-wider text-eyebrow text-navy hover:text-olympic-blue focus-ring rounded transition-colors"
              >
                <Code2 className="h-3 w-3" aria-hidden="true" />
                GitHub
              </a>
            </li>
            <li>
              <a
                href={LICENSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono uppercase tracking-wider text-eyebrow text-navy hover:text-olympic-blue focus-ring rounded transition-colors"
              >
                Apache 2.0
              </a>
            </li>
          </ul>
        </nav>

        <div className="md:text-right">
          <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-1">
            Data as of
          </p>
          <p className="font-mono text-caption tabular text-body-text">
            <time dateTime={DATA_AS_OF}>{DATA_AS_OF}</time>
          </p>
        </div>
      </div>

      <div className="border-t border-soft-border">
        <p className="mx-auto max-w-7xl px-6 py-4 font-serif italic text-eyebrow text-muted-text text-center leading-relaxed">
          Built in 10 days for the Team USA × Google Cloud Hackathon
          Challenge 2 (Hometown Success Engine). All claims are
          conditionally phrased; sources cite themselves on hover.
          Athlete names dropped at aggregation; never persisted, never
          shown.
        </p>
      </div>
    </footer>
  );
}

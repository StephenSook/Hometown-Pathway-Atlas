/**
 * MethodologyPage — full editorial methodology surface for skeptical judges.
 *
 * Per 2026-05-03 Sookra Council Day 8 follow-up: provide a verifiability
 * surface beyond the hover-tooltip citations on individual metrics.
 * Modeled on NYT / 538 / Pudding methodology pages — long-form prose,
 * clear sectioning, sourced claims, no marketing.
 *
 * Activated via the Navbar `#about` anchor (HomePage sets view to
 * 'methodology' on hashchange). Standalone full-page layout with its
 * own back button.
 *
 * Content is derived from CLAUDE.md (10 locked architectural decisions),
 * DESIGN_SYSTEM.md (Pillar discipline), README.md (data sources). When
 * any source-of-truth changes, update this surface in the same commit.
 */

import { ArrowLeft } from 'lucide-react';
import { useGlobalStats } from '../hooks/useGlobalStats';

// Public NotebookLM link — Stephen creates the public notebook
// (architecture spec + CLAUDE.md + methodology docs uploaded; share
// set to "Anyone with link"), then pastes the URL here. Empty string
// hides the affordance, so deploying this code before the notebook
// exists doesn't surface a broken link to judges.
const NOTEBOOKLM_PUBLIC_URL = '';

interface MethodologyPageProps {
  onBack: () => void;
}

export default function MethodologyPage({ onBack }: MethodologyPageProps) {
  // Atlas-wide findings — backed by Vinh's `/api/stats/global` ship
  // 2026-05-04. Falls back to skeleton on first paint, gracefully
  // hides the section if the endpoint errors (defensive for any future
  // backend regression that breaks this surface but not the demo path).
  const stats = useGlobalStats();
  return (
    <article
      aria-labelledby="methodology-heading"
      className="mx-auto max-w-3xl px-6 py-16"
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 mb-12 text-eyebrow font-mono uppercase text-muted-text hover:text-navy transition-colors focus-ring rounded"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to home
      </button>

      <header className="mb-16 text-center">
        <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-4">
          Methodology
        </p>
        <h1
          id="methodology-heading"
          className="text-[40px] md:text-h1 font-sans font-semibold text-navy leading-[1.05] tracking-tight"
        >
          How Atlas works
        </h1>
        <p className="font-serif italic text-body-lg text-muted-text mt-6 leading-relaxed">
          Per-capita parity. County granularity. Audit-grade prose. Every
          number cites itself, every interpretation hedges its causality.
        </p>
      </header>

      <Section heading="Analytical unit: county FIPS" eyebrow="Decision 1">
        <p>
          ZIP code is input only — the analytical unit is the county FIPS
          code (5-digit federal county identifier). Existing public Olympic
          atlases stop at state level. At county level, the public surface
          is silent. Atlas closes that gap with consistent methodology
          across all 3,000+ U.S. counties.
        </p>
        <p>
          Hometown means the recognized hometown on the Team USA roster —
          not birthplace, not training residence. The roster is the source
          of truth, even when public commentary disagrees about where an
          athlete is "from."
        </p>
      </Section>

      <Section heading="Per-capita parity discipline" eyebrow="Decision 3, 4">
        <p>
          Olympic and Paralympic representation are shown side-by-side,
          never merged into a single number, never collapsed under a
          toggle. Each pillar is ranked by percentile separately against
          the national county distribution. A county that ranks 76th in
          Olympic per-capita and 68th in Paralympic per-capita gets both
          numbers visible, both columns equal-weight, both bar fills
          equal-saturation.
        </p>
        <p>
          Per-capita normalization uses Census ACS 5-year population as
          the denominator, with empirical Bayes shrinkage to dampen the
          small-county noise problem: a county with 800 residents and
          one Olympian would otherwise show a 125 per-100k rate that
          looks identical to a county with 800,000 residents and 1,000
          Olympians. Bayes shrinkage pulls the small-sample county toward
          the national mean, so the displayed per-100k reflects the
          confidence-weighted estimate, not the raw ratio.
        </p>
      </Section>

      <Section heading="Three-dimension peer similarity" eyebrow="Decision 7, 10">
        <p>
          Each county's three peer analogs are computed across three
          dimensions with locked weights:
        </p>
        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 not-prose">
          {[
            {
              dim: 'Athlete profile',
              weight: '40%',
              note: 'County athlete pipeline density, Bayes-shrunk per 100k pop.',
            },
            {
              dim: 'Sport mix',
              weight: '35%',
              note: 'Per-sport county participation z-scores vs national distribution.',
            },
            {
              dim: 'Climate',
              weight: '25%',
              note: 'NOAA nClimGrid 30-year normals + Köppen-Geiger zone match.',
            },
          ].map(({ dim, weight, note }) => (
            <div
              key={dim}
              className="rounded-xl border border-soft-border bg-card-white p-4"
            >
              <dt className="font-mono uppercase tracking-wider text-eyebrow text-navy">
                {dim} · {weight}
              </dt>
              <dd className="font-sans text-caption text-body-text mt-2 leading-snug">
                {note}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6">
          MSA diversity constraint enforces that the top 3 analogs span
          at least 2 different Metropolitan Statistical Areas — a county
          can't be matched to its own three suburbs and call it a peer
          set. The constraint is a tie-break overlay, not a re-weighting
          of the three dimensions.
        </p>
      </Section>

      <Section
        heading="Adaptive access is display-only"
        eyebrow="Decision 2"
      >
        <p>
          Move United chapter density within 50 miles is shown on the
          Adaptive Access card but is never load-bearing in similarity
          matching. Adaptive sports access likely exists through
          organizations not in our source set; using a single proxy as a
          ranking input would penalize counties whose adaptive
          infrastructure is real but not Move-United-affiliated.
        </p>
        <p>
          Display-only is the honest position: the data is present so
          users see the proxy signal, the ranking math doesn't pretend
          the proxy is the truth.
        </p>
      </Section>

      <Section
        heading="Compliance Log: the hybrid auditor"
        eyebrow="Pillar 4 demo moment"
      >
        <p>
          Every Gemini-generated narrative passes through a two-layer
          audit before reaching the user. Layer one is deterministic
          regex catching banned causal verbs (<em>produces</em>,{' '} {/* atlas-phrasing-allow */}
          <em>creates</em>, <em>guarantees</em>, <em>leads to</em>,{' '} {/* atlas-phrasing-allow */}
          <em>causes</em>). Layer two is Gemini itself, called with a
          structured-output JSON schema (verdict / violations /
          rewritten) constraining the model to a self-review of its own
          tone.
        </p>
        <p>
          The audit log streams live in the right-side panel. When the
          regex layer catches{' '}
          <em>"Cobb County PRODUCES Olympic athletes"</em> and the {/* atlas-phrasing-allow */}
          Gemini layer rewrites it to{' '}
          <em>
            "could be associated with Olympic representation patterns,"
          </em>{' '}
          both events render in the panel — one amber, one green —
          within seconds. Judges can watch the rewrite happen.
        </p>
        <p>
          Conditional phrasing in user-facing strings is a hard rule
          across every code path: Gemini-generated narratives, mock
          fixtures, even React component string literals. A pre-commit
          script (<code>scripts/check-conditional-phrasing.mjs</code>)
          enforces the rule; the runtime auditor catches anything that
          slips past it.
        </p>
      </Section>

      <Section heading="Hard rules (DQ if violated)" eyebrow="Compliance">
        <ul className="list-disc list-inside space-y-2 marker:text-muted-text">
          <li>
            No athlete name, image, or likeness in any output, code path,
            or UI surface — names are dropped at the data aggregation
            step, never persisted, never reach Gemini, never reach React.
          </li>
          <li>
            No finish times. Placement and medal counts are also
            unused — neither feeds into similarity scoring.
          </li>
          <li>
            No IOC or USOPC branding (Olympic rings, torch imagery,
            "Olympic Games" used loosely). Atlas references the events
            directly when needed and uses no protected marks.
          </li>
          <li>
            Conditional phrasing only in user-facing strings.
          </li>
          <li>
            Olympic and Paralympic must have visual and data parity. Same
            chrome, same anatomy, same prominence.
          </li>
        </ul>
      </Section>

      <Section heading="Data sources" eyebrow="Provenance">
        <ul className="list-disc list-inside space-y-2 marker:text-muted-text">
          <li>2016–2024 Team USA roster (Olympic + Paralympic combined)</li>
          <li>US Census ACS 5-year population (county denominator)</li>
          <li>NFHS Athletics Participation Survey 2023-24 (high school context)</li>
          <li>HUD ZIP–County crosswalk</li>
          <li>NOAA nClimGrid 5km gridded climate</li>
          <li>Move United chapter directory (display-only, never load-bearing)</li>
          <li>USOPC NGB list (Pillar 5 sourcing context)</li>
        </ul>
      </Section>

      <Section heading="Atlas-wide findings" eyebrow="Two non-obvious signals">
        {stats.isPending && (
          <div aria-label="Loading global stats" className="animate-pulse space-y-3">
            <div className="h-4 w-3/4 rounded bg-soft-border" />
            <div className="h-4 w-2/3 rounded bg-soft-border" />
          </div>
        )}
        {stats.data && (
          <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-4">
            <FindingCard
              label="Representation gap"
              metric={stats.data.gap.ratio_display}
              headline={stats.data.gap.headline}
              footer={`${stats.data.gap.counties_no_athletes.toLocaleString()} of ${stats.data.gap.total_counties.toLocaleString()} counties (${stats.data.gap.pct_with_athletes.toFixed(1)}% with athletes)`}
            />
            <FindingCard
              label="Underdog signal"
              metric={stats.data.underdog.pct_display}
              headline={stats.data.underdog.headline}
              footer={`${stats.data.underdog.n_beating_metro.toLocaleString()} of ${stats.data.underdog.n_small_counties.toLocaleString()} small counties (pop <250k) above the major-metro Paralympic median per 100k`}
            />
          </div>
        )}
        <p className="font-serif italic text-caption text-muted-text mt-2">
          Both surfaced via `/api/stats/global`; numerators + denominators
          shown so the math is verifiable.
        </p>
      </Section>

      <Section heading="Talk to the methodology in NotebookLM" eyebrow="Deeper dive">
        <p>
          For judges and researchers who want to interrogate Atlas's
          methodology beyond this page: the same source material —
          architecture spec, locked decisions, data sources, sourcing
          appendix — is mirrored in a public Google NotebookLM. Open it
          to ask questions, generate audio overviews, or surface
          cross-document tradeoffs that this page summarizes.
        </p>
        {/* Public link populated once Stephen creates the NotebookLM
            and toggles "Anyone with link". Until then, the anchor is
            disabled. Hidden when NOTEBOOKLM_PUBLIC_URL is empty so
            judges don't see a broken affordance. */}
        {NOTEBOOKLM_PUBLIC_URL && (
          <p className="not-prose mt-3">
            <a
              href={NOTEBOOKLM_PUBLIC_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-xl bg-navy text-card-white px-4 py-2.5 font-mono uppercase tracking-wider text-eyebrow hover:bg-olympic-blue focus-ring transition-colors"
            >
              Open Atlas in NotebookLM →
            </a>
          </p>
        )}
      </Section>

      <Section heading="Limits + open questions" eyebrow="Honest framing">
        <p>
          Atlas is descriptive, not predictive. Patterns the similarity
          model surfaces could be associated with regional pathway
          dynamics — they may correlate with under-explored hometown
          stories — but causation is interpretation only. The Pattern
          Gap panel is structured to make this distinction visible:
          observed strength, public access signal, opportunity hypothesis
          are three different epistemic categories, not a confidence
          ladder.
        </p>
        <p>
          Sparse rural counties (zero or near-zero athlete placements)
          render in an empty-state variant that names the absence
          honestly rather than rendering empty bar charts. Try ZIP{' '}
          <code className="font-mono text-eyebrow text-navy">11111</code>{' '}
          to see this state.
        </p>
        <p>
          Methodology will evolve as Vinh's Phase 2 backend ships richer
          per-FIPS metrics. This page is the editorial source of truth;
          if the math changes, the page changes in the same commit.
        </p>
      </Section>
    </article>
  );
}

interface SectionProps {
  heading: string;
  eyebrow: string;
  children: React.ReactNode;
}

function Section({ heading, eyebrow, children }: SectionProps) {
  return (
    <section className="mb-12">
      <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-2">
        {eyebrow}
      </p>
      <h2 className="text-h2 font-sans font-semibold text-navy mb-6 leading-tight">
        {heading}
      </h2>
      <div className="prose-atlas font-sans text-body text-body-text leading-relaxed space-y-4">
        {children}
      </div>
    </section>
  );
}

interface FindingCardProps {
  label: string;
  metric: string;
  headline: string;
  footer: string;
}

function FindingCard({ label, metric, headline, footer }: FindingCardProps) {
  return (
    <div className="rounded-2xl bg-card-white border border-soft-border shadow-sm p-5 flex flex-col gap-3">
      <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text">
        {label}
      </p>
      <p className="font-sans font-semibold text-h2 text-navy leading-none">
        {metric}
      </p>
      <p className="font-serif italic text-body text-body-text leading-snug">
        {headline}
      </p>
      <p className="font-mono text-eyebrow text-muted-text mt-auto">
        {footer}
      </p>
    </div>
  );
}

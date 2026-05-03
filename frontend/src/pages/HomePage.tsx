/**
 * HomePage — landing + results view, real-backend integrated as of
 * 2026-05-03 PM (Vinh Phase 2 ship).
 *
 * Hero submits a ZIP → useRegion fires POST /api/region → useAnalogs +
 * usePathway chain off the resolved FIPS → results view renders the full
 * region profile from real backend response data.
 *
 * Sentinel ZIPs (frontend-only escape hatches preserved through
 * Phase 2 wire):
 *   - 11111 → frontend mock-only sparse region (Garfield County, MT).
 *     Skips network call entirely — backend has no 11111 in its zip
 *     crosswalk (would 404 anyway), and the empty-state demo is a
 *     pitch surface independent of backend data shape.
 *   - 00000 → real backend 404 (no entry in crosswalk). QueryCache.
 *     onError in lib/queryClient.ts auto-fires Sonner toast; an effect
 *     here reverts view to hero when query errors land.
 *
 * Reference: docs/moodboard/01_hero.png + 02_parity_panel.png + 03_analog_cards.png.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import ZipInput from '../components/ZipInput';
import RegionHeader from '../components/RegionHeader';
import ParityPanel from '../components/ParityPanel';
import SportMix from '../components/SportMix';
import ClimateBadge from '../components/ClimateBadge';
import AdaptiveAccessCard from '../components/AdaptiveAccessCard';
import AnalogList from '../components/AnalogList';
import TradeoffPanel from '../components/TradeoffPanel';
import CountyMap from '../components/CountyMap';
import PatternGapPanel from '../components/PatternGapPanel';
import ComplianceLog from '../components/ComplianceLog';
import Pillar5Strip from '../components/Pillar5Strip';
import Pillar5Defense from '../components/Pillar5Defense';
import ResultsSkeleton from '../components/ResultsSkeleton';
import HeroStat from '../components/HeroStat';
import MethodologyPage from '../components/MethodologyPage';
import { useRegion } from '../hooks/useRegion';
import { useAnalogs } from '../hooks/useAnalogs';
import { usePathway } from '../hooks/usePathway';
import { HERO_STAT } from '../lib/heroStat';
import { mockSparseRegion, mockAnalogs, mockPathway } from '../lib/mocks';

const SPARSE_SENTINEL_ZIP = '11111';

type View = 'hero' | 'results' | 'methodology';

// Per-FIPS document.title format. Mock data only renders Cobb County
// today; once backend integrates, the actual region.county_name + state
// from the API response feeds this.
const DEFAULT_TITLE = 'Hometown Pathway Atlas — Team USA county-level analytics';
function resultsTitle(countyName: string, state: string): string {
  return `${countyName}, ${state} — Hometown Pathway Atlas`;
}

export default function HomePage() {
  // URL-state hydration on first mount: ?fips=13067 in the URL means a
  // judge clicked a deep-link share — skip the hero view and land
  // directly on results. #about hash routes to the methodology page.
  // window.location used directly (no react-router dependency yet);
  // Day 4 router migration will swap to useSearchParams + useNavigate.
  const initialView: View =
    typeof window === 'undefined'
      ? 'hero'
      : new URLSearchParams(window.location.search).has('fips')
        ? 'results'
        : window.location.hash === '#about'
          ? 'methodology'
          : 'hero';

  const [view, setView] = useState<View>(initialView);
  // submittedZip drives all 3 React Query hooks. Null when no ZIP yet.
  // Initialized from URL ?zip= for deep-link hydration.
  const initialZip =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('zip');
  const [submittedZip, setSubmittedZip] = useState<string | null>(initialZip);

  const isSparse = submittedZip === SPARSE_SENTINEL_ZIP;

  // React Query hooks — disabled when sparse sentinel routes to local
  // mock OR when no ZIP submitted yet. useAnalogs + usePathway chain
  // off the FIPS resolved by useRegion (their hooks are no-op until
  // region.data lands, per Boolean(fips) enabled guard).
  const region = useRegion(isSparse ? null : submittedZip);
  const analogs = useAnalogs(isSparse ? null : region.data?.fips);
  const pathway = usePathway(isSparse ? null : region.data?.fips);

  // Derived data — sparse path uses local mocks, real path uses query
  // results once they land. AnalogList and PatternGapPanel render
  // skeletons inside ResultsSkeleton during their own loading state.
  const activeRegion = isSparse ? mockSparseRegion : region.data;
  const activeAnalogs = isSparse ? mockAnalogs : analogs.data;
  const activePathway = isSparse ? mockPathway : pathway.data;

  // Loading: sparse never loads (instant from mock), real path waits for
  // all 3 queries. analogs.isFetching covers refetches too; the dependent
  // chain means analogs/pathway naturally idle when region hasn't resolved.
  const loading = !isSparse &&
    (region.isPending || analogs.isFetching || pathway.isFetching);

  const mainRef = useRef<HTMLElement>(null);
  // Skip the very first paint — only manage focus on user-driven view change.
  const isInitialMount = useRef(true);

  // Focus management on view transition (a11y per DESIGN_SYSTEM §8.2):
  // moves focus to <main> (tabIndex=-1) so screen readers announce the
  // newly mounted region without jarring sighted users.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [view]);

  // Per-FIPS <title> sync. Judges browsing multiple regions across tabs
  // get navigable browser-tab labels instead of every tab reading
  // "Hometown Pathway Atlas — Team USA county-level analytics".
  useEffect(() => {
    if (view === 'results' && activeRegion) {
      document.title = resultsTitle(activeRegion.county_name, activeRegion.state);
    } else if (view === 'methodology') {
      document.title = 'Methodology — Hometown Pathway Atlas';
    } else {
      document.title = DEFAULT_TITLE;
    }
  }, [view, activeRegion]);

  // Error recovery — when region query errors out (most often the 00000
  // sentinel 404), revert to hero. QueryCache.onError in lib/queryClient.ts
  // already fired the Sonner toast; this effect just unwinds the view.
  useEffect(() => {
    if (region.error && view === 'results' && !isSparse) {
      setView('hero');
      setSubmittedZip(null);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [region.error, view, isSparse]);

  // Hash-router for the methodology page. Listens for clicks on the
  // Navbar #about anchor; updating window.location.hash triggers the
  // listener which sets view='methodology'. Day 4 router migration
  // replaces this with a real /about route.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      if (window.location.hash === '#about') {
        setView('methodology');
      } else if (view === 'methodology') {
        setView('hero');
      }
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, [view]);

  const handleMethodologyBack = () => {
    setView('hero');
    if (typeof window !== 'undefined') {
      // Strip the #about hash so refresh doesn't re-route to methodology.
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleSubmit = (zip: string) => {
    setSubmittedZip(zip);
    setView('results');
    // URL state sync — push deep-link with zip immediately. The fips
    // param is added in a follow-up effect once region.data lands (we
    // don't know the FIPS until backend resolves the ZIP). Sparse
    // sentinel uses mockSparseRegion.fips synchronously.
    const params = new URLSearchParams();
    params.set('zip', zip);
    if (zip === SPARSE_SENTINEL_ZIP) {
      params.set('fips', mockSparseRegion.fips);
    }
    window.history.replaceState({}, '', `?${params.toString()}`);
  };

  // Once region.data resolves from backend, append fips to URL params
  // so the deep-link is shareable with the resolved FIPS too. This runs
  // independently of handleSubmit because the FIPS isn't known at
  // submit time for non-sentinel ZIPs.
  useEffect(() => {
    if (!region.data || isSparse) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('fips') === region.data.fips) return;
    params.set('fips', region.data.fips);
    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [region.data, isSparse]);

  const handleBack = () => {
    setView('hero');
    setSubmittedZip(null);
    // Clear URL params on navigation back so the deep-link doesn't
    // re-trigger results-view hydration if the user refreshes.
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-warm-neutral">
      <Navbar />

      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        className="pt-32 md:pt-40 pb-16 focus:outline-none"
      >
        {view === 'methodology' ? (
          <MethodologyPage onBack={handleMethodologyBack} />
        ) : view === 'hero' ? (
          <>
            <HeroStat stat={HERO_STAT} className="mb-8" />

            <section
              aria-labelledby="hero-heading"
              className="mx-auto max-w-[880px] px-6 text-center"
            >
              <p className="text-eyebrow font-mono uppercase text-muted-text mb-6">
                Hometown Pathway Atlas
              </p>

              <h1
                id="hero-heading"
                className="text-[40px] md:text-h1 font-sans font-semibold text-navy leading-[1.05] tracking-tight mb-6"
              >
                Your county{' '}
                <span className="font-serif italic font-normal">Team USA</span>{' '}
                story
              </h1>

              <p className="text-body-lg text-muted-text max-w-2xl mx-auto mb-10">
                Per-capita parity. County-level granularity. Conditional phrasing
                only. Enter your ZIP code to see Olympic and Paralympic
                representation patterns in your region.
              </p>

              <ZipInput onSubmit={handleSubmit} loading={loading} />

              {/* Tour CTA — eliminates type-friction for judges + demo
                  recording. Single click jumps to the canonical demo
                  region (Cobb County, GA / ZIP 30060). Editorial-restrained
                  styling: serif italic prefix + monospace ZIP token + arrow,
                  positioned as a soft secondary affordance below the
                  primary ZipInput rather than competing with it. */}
              <p className="mt-6 font-serif italic text-caption text-muted-text">
                or try{' '}
                <button
                  type="button"
                  onClick={() => handleSubmit('30060')}
                  disabled={loading}
                  className="font-mono uppercase tracking-wider text-eyebrow text-navy hover:text-olympic-blue focus-ring rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Auto-load Cobb County, GA demo (ZIP 30060)"
                >
                  Cobb County, GA →
                </button>
              </p>
            </section>

            <section
              aria-label="Methodology footnote"
              className="mx-auto max-w-[640px] px-6 mt-20 text-center"
            >
              <p className="font-serif italic text-caption text-muted-text leading-relaxed">
                Hometown is the recognized hometown on the Team USA roster — not
                birthplace, not training residence. Analytical baseline window is
                2016–2024. Olympic and Paralympic data displayed side-by-side,
                never merged.
              </p>
            </section>
          </>
        ) : (
          <section
            aria-labelledby="results-heading"
            className="mx-auto max-w-7xl px-6"
          >
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 mb-8 text-eyebrow font-mono uppercase text-muted-text hover:text-navy transition-colors focus-ring rounded"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </button>

            <h2 id="results-heading" className="sr-only">
              Region representation results
            </h2>

            {loading || !activeRegion ? (
              <ResultsSkeleton />
            ) : (
            <>
            <div className="mb-10">
              <RegionHeader
                countyName={activeRegion.county_name}
                state={activeRegion.state}
                msaLabel={activeRegion.msa_label}
                population={activeRegion.population}
              />
            </div>

            <div className="mb-10">
              <CountyMap
                sourceFips={activeRegion.fips}
                sourceTooltip={{
                  countyName: activeRegion.county_name,
                  state: activeRegion.state,
                  olympicPer100k: activeRegion.metrics.olympic.per_100k,
                  paralympicPer100k: activeRegion.metrics.paralympic.per_100k,
                  olympicEvidence: activeRegion.metrics.olympic.evidence,
                  paralympicEvidence: activeRegion.metrics.paralympic.evidence,
                }}
                analogs={activeAnalogs?.analogs ?? []}
              />
            </div>

            <ParityPanel
              countyName={activeRegion.county_name}
              msaLabel={activeRegion.msa_label}
              olympic={activeRegion.metrics.olympic}
              paralympic={activeRegion.metrics.paralympic}
              className="max-w-3xl mx-auto"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <SportMix sports={activeRegion.top_sports} />
              <ClimateBadge climate={activeRegion.climate} />
              <AdaptiveAccessCard access={activeRegion.adaptive_access} />
            </div>

            <div className="mt-16">
              <AnalogList analogs={activeAnalogs?.analogs ?? []} />
            </div>

            <div className="mt-12">
              <PatternGapPanel gaps={activePathway?.gaps ?? []} />
            </div>

            <div className="mt-8">
              <TradeoffPanel
                explanation={activeAnalogs?.tradeoff_explanation ?? ''}
              />
            </div>
            </>
            )}

            {/* Pillar5Strip + Pillar5Defense are region-agnostic (data
                lifted from PILLAR5_* constants in lib/pillar5.ts), so
                they render OUTSIDE the loading conditional. Per §4.18
                lock — Pillar 5 numbers must always be visible — and
                ResultsSkeleton intentionally excludes them. Keeping
                them outside the conditional eliminates the layout
                pop-in when data lands; skeleton + Pillar 5 are visible
                together during load, then the data section swaps in
                place above them with zero reflow. */}
            <div className="mt-16">
              <Pillar5Strip />
            </div>

            <div className="mt-6">
              <Pillar5Defense />
            </div>

            {isSparse && (
              <p className="font-serif italic text-caption text-muted-text text-center mt-12">
                ZIP 11111 routes to a synthetic sparse-county fixture
                (Garfield County, MT) to demo the editorial empty-state
                rendering. Real ZIPs hit the live backend.
              </p>
            )}
          </section>
        )}
      </main>

      {view === 'results' && (
        <ComplianceLog
          entries={activeRegion?.compliance_log ?? []}
          demoMode={!activeRegion?.compliance_log?.length}
        />
      )}
    </div>
  );
}

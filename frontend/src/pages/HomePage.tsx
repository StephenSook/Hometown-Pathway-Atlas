/**
 * HomePage — landing + Day 2-3 mock-driven results view.
 *
 * Hero submits a ZIP → 600ms simulated network → results view renders the
 * full region profile (header, parity, sport mix, climate, adaptive access,
 * analog peers, tradeoff narrative) from lib/mocks.ts.
 *
 * Day 4 replaces the state machine with react-router-dom + api.region(zip).
 *
 * Reference: docs/moodboard/01_hero.png + 02_parity_panel.png + 03_analog_cards.png.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
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
import { ApiError } from '../lib/api';
import { HERO_STAT } from '../lib/heroStat';
import { mockRegion, mockAnalogs, mockPathway } from '../lib/mocks';

type View = 'hero' | 'results';

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
  // directly on results. window.location used directly (no react-router
  // dependency yet); Day 4 router migration will swap to useSearchParams.
  const initialView: View =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('fips')
      ? 'results'
      : 'hero';

  const [view, setView] = useState<View>(initialView);
  const [loading, setLoading] = useState(false);
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
    if (view === 'results') {
      document.title = resultsTitle(mockRegion.county_name, mockRegion.state);
    } else {
      document.title = DEFAULT_TITLE;
    }
  }, [view]);

  const handleSubmit = async (zip: string) => {
    setLoading(true);
    setView('results');
    // URL state sync — push deep-link with both zip + fips so judges can
    // share the exact view. Mock data always resolves to mockRegion.fips
    // until Day 4 backend integrates real ZIP→FIPS resolution.
    const params = new URLSearchParams();
    params.set('zip', zip);
    params.set('fips', mockRegion.fips);
    window.history.replaceState({}, '', `?${params.toString()}`);
    try {
      // ───────── DAY 4 INTEGRATION POINT ─────────
      // Replace the simulated network below with React Query hook adoption:
      //   1. Lift `setSubmittedZip(zip)` to component state
      //   2. Read `useRegion(submittedZip)` + `useAnalogs(region.data?.fips)`
      //      + `usePathway(region.data?.fips)` at the top of HomePage
      //   3. Derive `loading` from `region.isPending || analogs.isFetching
      //      || pathway.isFetching` (`isPending` not `isLoading` per RQ v5)
      //   4. Drop the manual try/catch — `QueryCache.onError` in
      //      lib/queryClient.ts already toasts every failure globally
      //   5. Pass `region.data`, `mockAnalogs.analogs`→`analogs.data?.analogs`,
      //      `mockPathway.gaps`→`pathway.data?.gaps` into the existing JSX
      //
      // Sentinel ZIP `00000` throws ApiError(404) so the catch arm and the
      // global QueryCache.onError handler both get exercised before Day 4
      // — without this, the entire error UX is dead code until the real
      // backend ships.
      if (zip === '00000') {
        throw new ApiError(404, 'No region for ZIP 00000 (sentinel test)');
      }
      void zip;
      await new Promise((resolve) => setTimeout(resolve, 600));
      setLoading(false);
    } catch (err) {
      setView('hero');
      setLoading(false);
      const message =
        err instanceof ApiError
          ? `Could not load that region (HTTP ${err.status}). Try another ZIP.`
          : 'Something went wrong loading that region. Try again in a moment.';
      toast.error(message);
    }
  };

  const handleBack = () => {
    setView('hero');
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
        {view === 'hero' ? (
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

            {loading ? (
              <ResultsSkeleton />
            ) : (
            <>
            <div className="mb-10">
              <RegionHeader
                countyName={mockRegion.county_name}
                state={mockRegion.state}
                msaLabel={mockRegion.msa_label}
                population={mockRegion.population}
              />
            </div>

            <div className="mb-10">
              <CountyMap
                sourceFips={mockRegion.fips}
                sourceTooltip={{
                  countyName: mockRegion.county_name,
                  state: mockRegion.state,
                  olympicPer100k: mockRegion.metrics.olympic.per_100k,
                  paralympicPer100k: mockRegion.metrics.paralympic.per_100k,
                  olympicEvidence: mockRegion.metrics.olympic.evidence,
                  paralympicEvidence: mockRegion.metrics.paralympic.evidence,
                }}
                analogs={mockAnalogs.analogs}
              />
            </div>

            <ParityPanel
              countyName={mockRegion.county_name}
              msaLabel={mockRegion.msa_label}
              olympic={mockRegion.metrics.olympic}
              paralympic={mockRegion.metrics.paralympic}
              className="max-w-3xl mx-auto"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <SportMix sports={mockRegion.top_sports} />
              <ClimateBadge climate={mockRegion.climate} />
              <AdaptiveAccessCard access={mockRegion.adaptive_access} />
            </div>

            <div className="mt-16">
              <AnalogList analogs={mockAnalogs.analogs} />
            </div>

            <div className="mt-12">
              <PatternGapPanel gaps={mockPathway.gaps} />
            </div>

            <div className="mt-8">
              <TradeoffPanel explanation={mockAnalogs.tradeoff_explanation} />
            </div>

            <div className="mt-16">
              <Pillar5Strip />
            </div>

            <div className="mt-6">
              <Pillar5Defense />
            </div>

            <p className="font-serif italic text-caption text-muted-text text-center mt-12">
              Showing mock data while the backend pipeline is in build (Day 4
              integrates real /api/region + /api/analogs responses).
            </p>
            </>
            )}
          </section>
        )}
      </main>

      {view === 'results' && (
        <ComplianceLog entries={mockRegion.compliance_log} demoMode={true} />
      )}
    </div>
  );
}

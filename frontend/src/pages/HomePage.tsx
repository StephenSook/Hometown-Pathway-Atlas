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

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ZipInput from '../components/ZipInput';
import RegionHeader from '../components/RegionHeader';
import ParityPanel from '../components/ParityPanel';
import SportMix from '../components/SportMix';
import ClimateBadge from '../components/ClimateBadge';
import AdaptiveAccessCard from '../components/AdaptiveAccessCard';
import AnalogList from '../components/AnalogList';
import TradeoffPanel from '../components/TradeoffPanel';
// CountyMap is lazy-loaded — its static import of us-atlas/counties-10m
// .json adds 250KB gz to the bundle (55% of total). Splitting it into
// its own chunk pulls that weight off the initial bundle. CountyMap
// only mounts AFTER region data lands (inside the loading conditional),
// so the chunk download isn't truly parallel with the API request — the
// chunk request fires when the Suspense boundary first attempts to
// render, which is gated on activeRegion. CountyMapSkeleton fallback
// covers the brief load, and the chunk is cached for subsequent
// region-view mounts within the same session.
const CountyMap = lazy(() => import('../components/CountyMap'));
import PatternGapPanel from '../components/PatternGapPanel';
import ComplianceLog from '../components/ComplianceLog';
import Pillar5Strip from '../components/Pillar5Strip';
import Pillar5Defense from '../components/Pillar5Defense';
import ResultsSkeleton from '../components/ResultsSkeleton';
import { CountyMapSkeleton } from '../components/CountyMapSkeleton';
// MethodologyPage is lazy-loaded — only renders on #about hash route,
// never on the critical demo path (30060 → results). React.lazy splits
// it into its own chunk so the initial bundle ships ~6KB lighter and
// the methodology-prose JS only downloads when a judge clicks About.
const MethodologyPage = lazy(() => import('../components/MethodologyPage'));
import RegionQA from '../components/RegionQA';
import RegionNarrative from '../components/RegionNarrative';
import RotatingGlobe from '../components/RotatingGlobe';
import SectionNav from '../components/SectionNav';
import CountyNameSearch from '../components/CountyNameSearch';
import ScrollytellingHero from '../components/scrolly/ScrollytellingHero';

const RESULTS_SECTIONS = [
  { id: 'section-region', label: 'Region' },
  { id: 'section-map', label: 'Map' },
  { id: 'section-parity', label: 'Parity' },
  { id: 'section-analogs', label: 'Analogs' },
  { id: 'section-qa', label: 'Q&A' },
  { id: 'section-pillar5', label: 'Pillar 5' },
];
import { useRegion } from '../hooks/useRegion';
import { useRegionByFips } from '../hooks/useRegionByFips';
import { useAnalogs } from '../hooks/useAnalogs';
import { usePathway } from '../hooks/usePathway';
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
  // URL-state hydration on first mount: ?zip= AND ?fips= in the URL
  // means a judge clicked a deep-link share — skip the hero view and
  // land directly on results. ?fips= ALONE is intentionally NOT a
  // valid hydration path — frontend useRegion takes a ZIP not a FIPS,
  // so a fips-only URL would render an indefinite ResultsSkeleton.
  // Day 4 router migration could add a fips→region path via a new
  // GET /api/region/by-fips/{fips} backend route; until then, require
  // both params to hydrate. Sparse sentinel `?zip=11111` works as
  // expected since 11111 is a frontend-only escape hatch.
  // #about hash routes to the methodology page.
  const initialParams =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search);
  const initialView: View =
    typeof window === 'undefined'
      ? 'hero'
      : initialParams?.has('zip') || initialParams?.has('fips')
        ? 'results'
        : window.location.hash === '#about'
          ? 'methodology'
          : 'hero';

  const [view, setView] = useState<View>(initialView);
  // submittedZip drives all 3 React Query hooks. Null when no ZIP yet.
  // Initialized from URL ?zip= for deep-link hydration. (Reuses
  // initialParams from above — both reads are wallclock-pure so a
  // single URLSearchParams instance is fine across mounts.)
  const initialZip = initialParams?.get('zip') ?? null;
  const initialFips = initialParams?.get('fips') ?? null;
  const [submittedZip, setSubmittedZip] = useState<string | null>(initialZip);
  // submittedFips alternative input — when user clicks a county on the
  // CountyMap and confirms via SelectedCountyCard CTA, HomePage hydrates
  // a new region view from the FIPS instead of the ZIP. URL ?fips=
  // (without ?zip=) was previously NOT a valid hydration path; with
  // useRegionByFips (Vinh task B7 ship 2026-05-04) it is now. If both
  // ?zip and ?fips are present, ZIP wins (ZIP is the canonical user-
  // input route from the hero form; FIPS is the deeper drill-down).
  const [submittedFips, setSubmittedFips] = useState<string | null>(
    !initialZip ? initialFips : null,
  );

  const isSparse =
    submittedZip === SPARSE_SENTINEL_ZIP ||
    submittedFips === '30033'; // mockSparseRegion FIPS — keep sparse-state demo path through fips drill-down too.

  // React Query hooks — disabled when sparse sentinel routes to local
  // mock OR when no ZIP submitted yet. useAnalogs + usePathway chain
  // off the FIPS resolved by EITHER useRegion(zip) OR useRegionByFips
  // (whichever is the active source); their hooks remain no-op until
  // a region resolves, per Boolean(fips) enabled guard.
  const region = useRegion(isSparse ? null : submittedZip);
  const regionByFips = useRegionByFips(isSparse ? null : submittedFips);
  // Active region resolution priority: regionByFips wins when present
  // (user just drilled in via map), region falls back when only a ZIP
  // was submitted. Sparse sentinel always wins via the isSparse gate.
  const resolvedRegion = isSparse
    ? mockSparseRegion
    : (regionByFips.data ?? region.data);
  const chainedFips = isSparse ? null : resolvedRegion?.fips ?? null;
  const analogs = useAnalogs(chainedFips);
  const pathway = usePathway(chainedFips);

  // Derived data — sparse path uses local mocks, real path uses query
  // results once they land. AnalogList and PatternGapPanel render
  // skeletons inside ResultsSkeleton during their own loading state.
  const activeRegion = resolvedRegion;
  const activeAnalogs = isSparse ? mockAnalogs : analogs.data;
  const activePathway = isSparse ? mockPathway : pathway.data;

  // Loading: sparse never loads (instant from mock), real path waits for
  // any of the 3 queries to be actively fetching. Use isFetching (not
  // isPending) — RQ v5 reports isPending=true for disabled queries that
  // have no data yet, which would stick `loading` on TRUE on initial
  // landing-view paint and disable the entire form. regionByFips also
  // counted so the drill-down navigation surfaces a skeleton during
  // its fetch instead of leaving the previous region's data on screen.
  const loading = !isSparse &&
    (region.isFetching ||
      regionByFips.isFetching ||
      analogs.isFetching ||
      pathway.isFetching);

  const mainRef = useRef<HTMLElement>(null);
  // Skip the very first paint — only manage focus on user-driven view change.
  const isInitialMount = useRef(true);
  // Cross-component hover highlight — when a peer-county AnalogCard is
  // hovered, lift the matching FIPS so the CountyMap can emphasize the
  // matching pin (bigger r + outer ring + bolder label). Bi-directional
  // visual link between map + list. (2026-05-04 map upgrade.)
  const [hoveredAnalogFips, setHoveredAnalogFips] = useState<string | null>(null);

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
  // Both region (zip path) + regionByFips (fips drill-down path) errors
  // funnel through the same recovery — toast + unwind to hero. Stale
  // submittedFips after error cleared so a refresh doesn't re-trigger.
  useEffect(() => {
    const failed = region.error || regionByFips.error;
    if (failed && view === 'results' && !isSparse) {
      setView('hero');
      setSubmittedZip(null);
      setSubmittedFips(null);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [region.error, regionByFips.error, view, isSparse]);

  // Hash-router for the methodology page + Find Region CTA. Listens for
  // clicks on the Navbar anchors:
  //   #about → MethodologyPage
  //   #region → reset to hero view + browser scrolls to id="region"
  //     anchor on the ZipInput section. Clicking Find Region while on
  //     results view returns user to landing so they can submit a new ZIP.
  // The #region scroll is wrapped in requestAnimationFrame because the
  // browser's automatic anchor-scroll fires before React commits the view
  // swap from results → hero, so the id="region" element doesn't exist
  // yet at hash-change time. RAF defers the scroll to the next paint
  // when the hero JSX has rendered. (Codex review 2026-05-04 caught.)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      const hash = window.location.hash;
      if (hash === '#about') {
        setView('methodology');
      } else if (hash === '#region') {
        if (view !== 'hero') setView('hero');
        requestAnimationFrame(() => {
          document.getElementById('region')?.scrollIntoView({ behavior: 'smooth' });
        });
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
      // Scroll to hero top — same rationale as handleSubmit/handleSelectCounty.
      // User scrolled deep in /about; clicking back-to-home should land at
      // top of scrollytelling, not preserve methodology scroll position.
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleSubmit = (zip: string) => {
    setSubmittedZip(zip);
    setSubmittedFips(null);
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
    // Scroll to top so user lands on the region narrative, not at
    // wherever they were in the scrollytelling. Earlier iteration
    // preserved scroll position from Ch5 CTA submit (~3500px down)
    // → user landed on Pillar 5 strip at the bottom of results
    // (Stephen 2026-05-04 PM bug report).
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Once region.data resolves from backend, append fips to URL params
  // so the deep-link is shareable with the resolved FIPS too. This runs
  // independently of handleSubmit because the FIPS isn't known at
  // submit time for non-sentinel ZIPs.
  useEffect(() => {
    if (!resolvedRegion || isSparse) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('fips') === resolvedRegion.fips) return;
    params.set('fips', resolvedRegion.fips);
    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [resolvedRegion, isSparse]);

  const handleBack = () => {
    setView('hero');
    setSubmittedZip(null);
    setSubmittedFips(null);
    // Clear URL params on navigation back so the deep-link doesn't
    // re-trigger results-view hydration if the user refreshes.
    window.history.replaceState({}, '', window.location.pathname);
    // Scroll to hero top — user scrolled into results, clicking back
    // should land at top of scrollytelling not preserve results scroll.
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Map drill-down (B7) — fires when user clicks a non-highlighted
  // county AND confirms via SelectedCountyCard CTA. Hydrates a new
  // region view from the FIPS via useRegionByFips. Resets submittedZip
  // (FIPS drill-down replaces the ZIP-driven state) and updates URL
  // to ?fips=X (no zip). View stays on results so the page does not
  // unmount; React Query swaps the data underneath when fetch resolves.
  const handleSelectCounty = (fips: string) => {
    setSubmittedZip(null);
    setSubmittedFips(fips);
    setView('results');
    const params = new URLSearchParams();
    params.set('fips', fips);
    window.history.replaceState({}, '', `?${params.toString()}`);
    // Instant (not smooth) — same rationale as handleSubmit. User
    // submitting from CTA chapter (~3500px scroll) needs to land on
    // region narrative top, not Pillar 5 bottom. Smooth scroll left
    // them mid-transition with results data appearing under their
    // current viewport.
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Peer-pin drill-down — when a user clicks an analog pin on the map,
  // scroll the page to #section-analogs and briefly emphasize the
  // matching AnalogCard via the lifted hoveredAnalogFips state. The
  // emphasis flash auto-clears after 2.4s so the card returns to its
  // resting state without leaving a permanently-highlighted "phantom"
  // card after the user has read it. Mirrors the AnalogCard → CountyMap
  // hover pathway in reverse direction (map drives card emphasis
  // instead of card driving map emphasis).
  const drillDownTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (drillDownTimeoutRef.current !== null) {
        window.clearTimeout(drillDownTimeoutRef.current);
      }
    };
  }, []);
  const handleSelectAnalog = (fips: string) => {
    const target = document.getElementById('section-analogs');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHoveredAnalogFips(fips);
    if (drillDownTimeoutRef.current !== null) {
      window.clearTimeout(drillDownTimeoutRef.current);
    }
    drillDownTimeoutRef.current = window.setTimeout(() => {
      setHoveredAnalogFips((current) => (current === fips ? null : current));
      drillDownTimeoutRef.current = null;
    }, 2400);
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
          <Suspense
            fallback={
              <div
                aria-label="Loading methodology"
                className="mx-auto max-w-3xl px-6 py-16 text-center"
              >
                <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text">
                  Methodology
                </p>
                <div className="mt-8 h-12 w-3/4 mx-auto rounded bg-soft-border animate-pulse" />
                <div className="mt-6 h-4 w-2/3 mx-auto rounded bg-soft-border/60 animate-pulse" />
              </div>
            }
          >
            <MethodologyPage onBack={handleMethodologyBack} />
          </Suspense>
        ) : view === 'hero' ? (
          // overflow-hidden REMOVED 2026-05-04 PM — broke `position: sticky`
          // on the inner ScrollyMap. Ancestor with overflow:hidden between a
          // sticky element and the scroll-context body causes the sticky to
          // stick within that ancestor's bounds rather than the viewport,
          // which made Ch 2/3/4 maps scroll out of view (only Ch 1 worked
          // because sticky hadn't engaged yet at that scroll position).
          <div className="relative">
            <ScrollytellingHero
              ctaSlot={
                <div className="relative">
                  {/* Ambient globe behind the CTA chapter only. Earlier
                      iterations rendered the globe behind every chapter,
                      but ScrollyMap is now the active visual hook for
                      chapters 1-4; the globe re-emerges on the CTA
                      chapter as the ambient closing texture. */}
                  <div className="absolute inset-0 z-0 flex items-center justify-end pointer-events-none">
                    <RotatingGlobe
                      size={520}
                      className="-mr-[120px] md:-mr-[80px] lg:-mr-[40px]"
                    />
                  </div>

                  <div className="relative z-10">
                    {/* HeroStat removed from CTA chapter 2026-05-04 PM
                        — the scrollytelling Ch 2 already delivers the
                        "4 in 5" stat with full context (3,222 → 555 →
                        17.2%). Repeating below the scrolly was
                        redundant + diluted the reveal. SourceTooltip
                        provenance now lives on the methodology page
                        Atlas-wide-findings cards. */}

                    <section
                      id="region"
                      aria-labelledby="hero-heading"
                      className="mx-auto max-w-[880px] px-6 text-center scroll-mt-32"
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

                      {/* Sample-region grid — 4 ready-to-load county
                          profiles for judges who don't want to type a
                          ZIP. Cobb GA = canonical demo; the other 3
                          (Mecklenburg NC, Wake NC, Jefferson KY) sample
                          metro-county variety across regions + climate
                          zones. All 4 fire handleSelectCounty(fips)
                          which routes through useRegionByFips, the same
                          B7 drill-down pathway map-click already uses. */}
                      <div className="mt-6">
                        <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-3">
                          Or try a sample region
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {[
                            { fips: '13067', label: 'Cobb, GA' },
                            { fips: '37119', label: 'Mecklenburg, NC' },
                            { fips: '37183', label: 'Wake, NC' },
                            { fips: '21111', label: 'Jefferson, KY' },
                          ].map((s) => (
                            <button
                              key={s.fips}
                              type="button"
                              onClick={() => handleSelectCounty(s.fips)}
                              disabled={loading}
                              className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-card-white px-4 py-2 font-mono uppercase tracking-wider text-eyebrow text-navy hover:border-navy hover:bg-warm-neutral focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Load ${s.label} county profile`}
                            >
                              {s.label} →
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-8 max-w-md mx-auto">
                        <CountyNameSearch
                          onSelect={handleSelectCounty}
                          disabled={loading}
                        />
                      </div>
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
                  </div>
                </div>
              }
            />
          </div>
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
            <div id="section-region" className="mb-6 scroll-mt-32">
              <RegionHeader
                countyName={activeRegion.county_name}
                state={activeRegion.state}
                msaLabel={activeRegion.msa_label}
                population={activeRegion.population}
              />
            </div>

            {/* RegionNarrative — Gemini-generated prose framing for the
                region. Renders ABOVE the map so Beat 3 narration opens
                with Gemini's interpretation before the visual reveal.
                Empty-string narrative or banned-verb drift → component
                returns null cleanly, no layout pop-in. */}
            <RegionNarrative
              narrative={activeRegion.narrative}
              className="mb-10 max-w-3xl"
            />

            <div id="section-map" className="mb-10 scroll-mt-32">
              <Suspense fallback={<CountyMapSkeleton />}>
                <CountyMap
                  sourceFips={activeRegion.fips}
                  sourceCentroid={activeRegion.centroid}
                  sourceTooltip={{
                    countyName: activeRegion.county_name,
                    state: activeRegion.state,
                    olympicPer100k: activeRegion.metrics.olympic.per_100k,
                    paralympicPer100k: activeRegion.metrics.paralympic.per_100k,
                    olympicEvidence: activeRegion.metrics.olympic.evidence,
                    paralympicEvidence: activeRegion.metrics.paralympic.evidence,
                  }}
                  analogs={activeAnalogs?.analogs ?? []}
                  hoveredAnalogFips={hoveredAnalogFips}
                  onHoverAnalog={setHoveredAnalogFips}
                  onSelectAnalog={handleSelectAnalog}
                  onSelectCounty={handleSelectCounty}
                />
              </Suspense>
            </div>

            <div id="section-parity" className="scroll-mt-32">
              <ParityPanel
                countyName={activeRegion.county_name}
                msaLabel={activeRegion.msa_label}
                olympic={activeRegion.metrics.olympic}
                paralympic={activeRegion.metrics.paralympic}
                className="max-w-3xl mx-auto"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <SportMix sports={activeRegion.top_sports} />
              <ClimateBadge climate={activeRegion.climate} />
              <AdaptiveAccessCard access={activeRegion.adaptive_access} />
            </div>

            <div id="section-analogs" className="mt-16 scroll-mt-32">
              <AnalogList
                analogs={activeAnalogs?.analogs ?? []}
                onHoverAnalog={setHoveredAnalogFips}
                hoveredAnalogFips={hoveredAnalogFips}
              />
            </div>

            <div className="mt-12">
              <PatternGapPanel gaps={activePathway?.gaps ?? []} />
            </div>

            <div className="mt-8">
              <TradeoffPanel
                explanation={activeAnalogs?.tradeoff_explanation ?? ''}
              />
            </div>

            <div id="section-qa" className="mt-12 scroll-mt-32">
              <RegionQA region={activeRegion} />
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
            <div id="section-pillar5" className="mt-16 scroll-mt-32">
              <Pillar5Strip />
            </div>

            <div className="mt-6">
              <Pillar5Defense />
            </div>

            {isSparse && (
              <p className="font-serif italic text-caption text-muted-text text-center mt-12">
                ZIP 11111 shows a sparse-data example for Garfield
                County, MT. Real ZIPs use the live backend.
              </p>
            )}
          </section>
        )}
      </main>

      {view === 'results' && (
        <ComplianceLog
          entries={activeRegion?.compliance_log ?? []}
          // B5b decision 2026-05-04 (Option A): force demoMode={true} so
          // the panel renders the canonical pass → pass → FAIL → FIXED
          // catch+rewrite sequence Beat 4 narration depends on. Live
          // HybridAuditor (Vinh task 2.9) on a clean Gemini draft
          // produces all-pass entries — accurate, but undramatic. Since
          // the auditor IS shipped + auditable on the deployed backend
          // (judges can curl /api/region and see the real 10 entries
          // for verification), the on-screen Beat 4 sequence stays as
          // the scripted demo for narrative clarity. Tradeoff documented
          // in CLAUDE.md "Open coordination" block.
          demoMode={true}
          // Substitute the demo script's {COUNTY} placeholder with the
          // active region's county_name. Earlier iteration hardcoded
          // "Cobb County" — judges submitting Fulton/Wake/etc. saw a
          // mismatched audit panel (Stephen 2026-05-04 PM bug report).
          regionCountyName={activeRegion?.county_name}
        />
      )}
      {/* SectionNav must mount AFTER section anchors render. Its
          IntersectionObserver setup runs once on mount and reads
          document.getElementById for each section id; if anchors
          are still inside the loading-skeleton branch, the observer
          attaches to nothing and the active-section dot stays stuck
          on the first item forever. Gate on !loading + activeRegion
          to guarantee the anchors exist before the observer attaches. */}
      {view === 'results' && !loading && activeRegion && (
        <SectionNav sections={RESULTS_SECTIONS} />
      )}

      <Footer />
    </div>
  );
}

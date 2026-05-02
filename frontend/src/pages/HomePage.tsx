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

import { useState } from 'react';
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
import { mockRegion, mockAnalogs } from '../lib/mocks';

type View = 'hero' | 'results';

export default function HomePage() {
  const [view, setView] = useState<View>('hero');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (zip: string) => {
    setLoading(true);
    void zip;
    setTimeout(() => {
      setLoading(false);
      setView('results');
    }, 600);
  };

  const handleBack = () => setView('hero');

  return (
    <div className="min-h-screen bg-warm-neutral">
      <Navbar />

      <main id="main-content" className="pt-32 md:pt-40 pb-16" tabIndex={-1}>
        {view === 'hero' ? (
          <>
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

            <div className="mb-10">
              <RegionHeader
                countyName={mockRegion.county_name}
                state={mockRegion.state}
                msaLabel={mockRegion.msa_label}
                population={mockRegion.population}
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

            <div className="mt-8">
              <TradeoffPanel explanation={mockAnalogs.tradeoff_explanation} />
            </div>

            <p className="font-serif italic text-caption text-muted-text text-center mt-12">
              Showing mock data while the backend pipeline is in build (Day 4
              integrates real /api/region + /api/analogs responses).
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

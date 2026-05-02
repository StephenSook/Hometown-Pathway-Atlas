/**
 * HomePage — landing surface + Day 2 PM results stub.
 *
 * Hero (default view) submits a ZIP, transitions to a results view rendered
 * from lib/mocks.ts (mockRegion). Real backend integration + react-router-dom
 * routing replaces this state-machine pattern Day 4.
 *
 * Reference: docs/moodboard/01_hero.png + 02_parity_panel.png.
 */

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import ZipInput from '../components/ZipInput';
import RegionHeader from '../components/RegionHeader';
import ParityPanel from '../components/ParityPanel';
import { mockRegion } from '../lib/mocks';

type View = 'hero' | 'results';

export default function HomePage() {
  const [view, setView] = useState<View>('hero');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (zip: string) => {
    setLoading(true);
    // Day 4 will replace this with: api.region(zip) → route to /region/:fips.
    // For now, simulate network + display mock Cobb County region per
    // DESIGN_SYSTEM §15 build order (mocks Days 2–3, real Day 4).
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

            <div className="mb-10">
              <RegionHeader
                countyName={mockRegion.county_name}
                state={mockRegion.state}
                msaLabel={mockRegion.msa_label}
                population={mockRegion.population}
              />
            </div>

            <h2 id="results-heading" className="sr-only">
              Region representation results
            </h2>

            <ParityPanel
              countyName={mockRegion.county_name}
              msaLabel={mockRegion.msa_label}
              olympic={mockRegion.metrics.olympic}
              paralympic={mockRegion.metrics.paralympic}
              className="max-w-3xl mx-auto"
            />

            <p className="font-serif italic text-caption text-muted-text text-center mt-8">
              Showing mock data while the backend pipeline is in build (Day 4
              integrates real /api/region responses).
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

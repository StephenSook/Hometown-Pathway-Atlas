/**
 * HomePage — landing surface per DESIGN_SYSTEM.md §15 Day 2 PM build target
 *
 * Anatomy per moodboard docs/moodboard/01_hero.png:
 * - Floating pill Navbar at top
 * - Hero: eyebrow + large editorial heading with serif italic accent
 * - ZipInput pill with clay submit button
 * - (Below fold dashboard preview hint — stubbed for now, real data after ZIP submit Day 4)
 *
 * Production nav links per DESIGN_SYSTEM §14: Region · Methodology · About
 *
 * Submit handler is a stub — routing to /region/{fips} added Day 3+ when
 * react-router-dom is configured. For now logs the ZIP.
 */

import { useState } from 'react';
import Navbar from '../components/Navbar';
import ZipInput from '../components/ZipInput';

export default function HomePage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (zip: string) => {
    setLoading(true);
    // TODO Day 4: route to /region/{resolvedFips} via react-router-dom
    // For now: log + reset loading state
    console.log('[HomePage] ZIP submitted:', zip);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="min-h-screen bg-warm-neutral">
      <Navbar />

      <main id="top" className="pt-32 md:pt-40 pb-16">
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
            Per-capita parity. County-level granularity. Conditional phrasing only.
            Enter your ZIP code to see Olympic and Paralympic representation
            patterns in your region.
          </p>

          <ZipInput onSubmit={handleSubmit} loading={loading} />
        </section>

        {/* Methodology footnote — sets honest tone before any data is shown */}
        <section
          aria-label="Methodology footnote"
          className="mx-auto max-w-[640px] px-6 mt-20 text-center"
        >
          <p className="font-serif italic text-caption text-muted-text leading-relaxed">
            Hometown is the recognized hometown on the Team USA roster — not
            birthplace, not training residence. Analytical baseline window is
            2016–2024. Olympic and Paralympic data displayed side-by-side, never
            merged.
          </p>
        </section>
      </main>
    </div>
  );
}

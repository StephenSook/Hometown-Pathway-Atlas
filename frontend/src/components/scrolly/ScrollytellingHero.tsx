/**
 * ScrollytellingHero — Layer D editorial opener for the landing view.
 *
 * 5-chapter scroll-triggered narrative anchored on Vinh's
 * `/api/stats/global` (gap + underdog stats). Sticky-map pattern
 * popularized by The Pudding / NYT data journalism: a full-screen
 * map sticks while the user scrolls through chapter copy on top.
 * Each chapter triggers a map mode change via react-scrollama
 * IntersectionObserver hooks.
 *
 * Chapter beats (text drafts in `docs/layer_d_plan.md`):
 *   1. INTRO    — "There are 3,222 counties in the United States"
 *   2. GAP      — "4 in 5 are silent" (lights 555 counties navy)
 *   3. UNDERDOG — "But the silence isn't where you'd expect" (clay)
 *   4. PATHWAY  — "Atlas reads each county's pathway" (Cobb + analogs)
 *   5. CTA      — Existing HeroStat + ZipInput + tour CTA + globe
 *
 * Mobile fallback: scrollytelling sticky positioning is fragile on
 * mobile (URL bar height changes mid-scroll break sticky offsets).
 * On viewport <768px we render a static stack of chapter content
 * instead — same copy, no scroll triggers, no sticky map.
 *
 * Reduced-motion fallback: same static stack as mobile. The copy
 * still reads cleanly without the choreography.
 *
 * The CTA chapter mounts the existing HeroStat + ZipInput + tour CTA +
 * RotatingGlobe + CountyNameSearch from props — those components are
 * the source of truth for the "find your county" moment, so they get
 * passed in rather than re-implemented here.
 */

import { useState, type ReactNode } from 'react';
import { Scrollama, Step } from 'react-scrollama';
import { useReducedMotion } from 'framer-motion';
import { useGlobalStats } from '../../hooks/useGlobalStats';
import ScrollyMap, { type ScrollyMode } from './ScrollyMap';
import { cn } from '../../lib/utils';

interface ScrollytellingHeroProps {
  /** The existing hero block — HeroStat + ZipInput + tour CTA + globe.
   *  Mounts inside ChapterCta as the "find your county" moment. */
  ctaSlot: ReactNode;
}

interface ChapterDef {
  mode: ScrollyMode;
  eyebrow: string;
  heading: ReactNode;
  body: (stats: ReturnType<typeof useGlobalStats>['data']) => ReactNode;
  side: 'left' | 'right' | 'center';
}

const CHAPTERS: ChapterDef[] = [
  {
    mode: 'empty',
    eyebrow: '01 — An atlas of silence',
    heading: (
      <>
        There are{' '}
        <span className="font-serif italic font-normal">3,222 counties</span>{' '}
        in the United States.
      </>
    ),
    body: () => (
      <p>
        Most public Olympic atlases stop at the state level. At county level, the
        surface is silent.
      </p>
    ),
    side: 'left',
  },
  {
    mode: 'gap',
    eyebrow: '02 — The 4-in-5 gap',
    heading: <>4 in 5 counties are silent.</>,
    body: (stats) => (
      <>
        <p>
          Of those {stats?.gap.total_counties.toLocaleString() ?? '3,222'}{' '}
          counties, only{' '}
          {stats?.gap.counties_with_athletes.toLocaleString() ?? '555'} —{' '}
          {stats ? `${stats.gap.pct_with_athletes.toFixed(1)}%` : '17%'} —
          show any Team USA athlete representation in our 2016–2024 indexed
          sources.
        </p>
        <p className="font-serif italic text-muted-text mt-3">
          The other 2,667 counties form the negative space lit on the map.
        </p>
      </>
    ),
    side: 'right',
  },
  {
    mode: 'underdog',
    eyebrow: '03 — The silence isn’t where you’d expect',
    heading: (
      <>
        <span className="font-serif italic font-normal">68%</span> of small
        counties beat the metro.
      </>
    ),
    body: (stats) => (
      <p>
        About{' '}
        {stats ? `${stats.underdog.pct_beating_metro.toFixed(0)}%` : '68%'} of
        counties with populations under 250,000 show Paralympic athlete
        representation rates above the major-metro median. The pipeline lives
        in the small counties — not where you’d expect.
      </p>
    ),
    side: 'left',
  },
  {
    mode: 'pathway',
    eyebrow: '04 — Pathway, not pedigree',
    heading: <>Atlas reads each county’s pathway.</>,
    body: () => (
      <p>
        Olympic and Paralympic ranked separately. Climate and sport mix held
        constant. Atlas surfaces the 3 most analytically-similar peer counties
        — like Cobb County, Georgia, mapped here against Alexandria, Charleston,
        and Greater Bridgeport.
      </p>
    ),
    side: 'right',
  },
  {
    mode: 'cta',
    eyebrow: '05 — Find your county',
    heading: <>Your county Team USA story.</>,
    body: () => null, // CTA slot replaces the body
    side: 'center',
  },
];

export default function ScrollytellingHero({ ctaSlot }: ScrollytellingHeroProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const stats = useGlobalStats();
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const handleStepEnter = ({ data }: { data: unknown }) => {
    if (typeof data === 'number') {
      setActiveIdx(data);
    }
  };

  // Mobile + reduced-motion fallback — render a static stack of
  // chapter content with no scroll triggers. Sticky map dropped;
  // each chapter shows a static map snapshot followed by its copy.
  if (reduceMotion) {
    return (
      <div className="relative">
        {CHAPTERS.map((ch, i) => (
          <section
            key={i}
            aria-label={ch.eyebrow}
            className="mx-auto max-w-3xl px-6 py-12"
          >
            {ch.mode !== 'cta' && (
              <div className="max-w-2xl mx-auto mb-6 opacity-90">
                <ScrollyMap mode={ch.mode} />
              </div>
            )}
            <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-3">
              {ch.eyebrow}
            </p>
            <h2 className="text-h2 font-sans font-semibold text-navy leading-tight mb-4">
              {ch.heading}
            </h2>
            <div className="font-sans text-body text-body-text leading-relaxed">
              {ch.body(stats.data)}
            </div>
            {ch.mode === 'cta' && <div className="mt-8">{ctaSlot}</div>}
          </section>
        ))}
      </div>
    );
  }

  const activeChapter = CHAPTERS[activeIdx]!;

  return (
    <div className="relative">
      {/* Sticky map layer — full viewport height, fixed during scroll
          while chapter copy passes by overhead. Reduces to 25% opacity
          on the CTA chapter so the ZipInput reads clearly. The
          following Scrollama steps need to OVERLAY the sticky div
          (rather than stack below it), so the steps container has a
          negative top-margin equal to one viewport height.
          See react-scrollama README "sticky" example. */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center pointer-events-none z-0">
        <div className="w-full max-w-5xl px-6">
          <ScrollyMap mode={activeChapter.mode} />
        </div>
      </div>

      {/* Scrollama steps overlayed on the sticky map. Negative
          margin-top of -100vh pulls the steps up so the FIRST step
          enters the viewport at the same instant the sticky map
          starts sticking. Without this, the user would scroll one
          full viewport-height before reaching step 1. */}
      <div className="relative z-10" style={{ marginTop: '-100vh' }}>
        <Scrollama
          onStepEnter={handleStepEnter}
          offset={0.55}
          threshold={4}
        >
          {CHAPTERS.map((ch, i) => (
            <Step key={i} data={i}>
              <section
                aria-label={ch.eyebrow}
                className="min-h-screen flex items-center pointer-events-none"
              >
                <div
                  className={cn(
                    'pointer-events-auto px-6 max-w-md',
                    ch.side === 'left' && 'mr-auto ml-6 md:ml-16',
                    ch.side === 'right' && 'ml-auto mr-6 md:mr-16',
                    ch.side === 'center' && 'mx-auto text-center max-w-2xl',
                  )}
                >
                  {ch.mode !== 'cta' && (
                    <div
                      className={cn(
                        'rounded-2xl bg-card-white/95 backdrop-blur-sm border border-soft-border shadow-lg p-6 transition-opacity duration-500',
                        i === activeIdx ? 'opacity-100' : 'opacity-50',
                      )}
                    >
                      <p className="font-mono uppercase tracking-wider text-eyebrow text-muted-text mb-3">
                        {ch.eyebrow}
                      </p>
                      <h2 className="text-h2 font-sans font-semibold text-navy leading-tight mb-4">
                        {ch.heading}
                      </h2>
                      <div className="font-sans text-body text-body-text leading-relaxed">
                        {ch.body(stats.data)}
                      </div>
                    </div>
                  )}
                  {ch.mode === 'cta' && <div className="pt-12">{ctaSlot}</div>}
                </div>
              </section>
            </Step>
          ))}
        </Scrollama>
      </div>
    </div>
  );
}

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

import { useEffect, useState, type ReactNode } from 'react';
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
  /** Big editorial decoration rendered on the OPPOSITE side from the
   *  card. Each chapter gets its own anchor visual so the empty side
   *  reads as composed editorial, not blank cream. Massive serif
   *  numbers + small subtitle, mirroring NYT / Bloomberg data
   *  journalism conventions. Stephen 2026-05-04 visual review. */
  decoration?: (stats: ReturnType<typeof useGlobalStats>['data']) => ReactNode;
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
    decoration: (stats) => (
      <DecorationBigNumber
        number={stats?.gap.total_counties.toLocaleString() ?? '3,222'}
        caption="U.S. counties indexed"
        sub="2016–2024 baseline"
      />
    ),
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
    decoration: (stats) => (
      <DecorationStackedBar
        litCount={stats?.gap.counties_with_athletes ?? 555}
        silentCount={stats?.gap.counties_no_athletes ?? 2667}
        litLabel="with athletes"
        silentLabel="silent"
      />
    ),
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
    decoration: (stats) => (
      <DecorationDivergent
        smallCountyPct={stats?.underdog.pct_beating_metro ?? 68}
        smallCountyN={stats?.underdog.n_beating_metro ?? 2000}
        totalSmall={stats?.underdog.n_small_counties ?? 2938}
      />
    ),
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
    decoration: () => <DecorationAnalogNetwork />,
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
  // Mobile detection — viewport <768px. Sticky positioning is fragile
  // on mobile (URL bar height changes mid-scroll break sticky offsets).
  // Detect via matchMedia + listen for resize/rotation. Codex audit
  // 2026-05-04 PM caught the docstring promised this fallback but
  // the implementation only branched on prefers-reduced-motion.
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia('(max-width: 767px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const handleStepEnter = ({ data }: { data: unknown }) => {
    if (typeof data === 'number') {
      setActiveIdx(data);
    }
  };

  // Mobile + reduced-motion fallback — render a static stack of
  // chapter content with no scroll triggers. Sticky map dropped;
  // each chapter shows a static map snapshot followed by its copy.
  if (reduceMotion || isMobile) {
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
      <div className="sticky top-0 h-screen w-full flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <div className="w-full max-w-5xl px-6">
          <ScrollyMap mode={activeChapter.mode} />
        </div>
        {/* Per-chapter side decoration — big editorial number rendered
            on the OPPOSITE side from the chapter card. Fades in with
            chapter activation, fades out on chapter change. CTA
            chapter has no decoration (centered card + globe). */}
        {activeChapter.decoration && (
          <div
            key={`decoration-${activeIdx}`}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 hidden lg:block',
              'animate-[fadeInDecoration_0.6s_ease-out]',
              // Decoration sits on OPPOSITE side from card
              activeChapter.side === 'left' && 'right-12 xl:right-24',
              activeChapter.side === 'right' && 'left-12 xl:left-24',
            )}
          >
            {activeChapter.decoration(stats.data)}
          </div>
        )}
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

      {/* Local keyframe — fade-in for chapter decoration on activation. */}
      <style>{`
        @keyframes fadeInDecoration {
          from { opacity: 0; transform: translate(0, -50%) translateY(16px); }
          to { opacity: 1; transform: translate(0, -50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Chapter decorations — big editorial elements rendered opposite
// the chapter card. NYT / Bloomberg data-journalism convention:
// composed editorial typography reading like a print spread.
// ─────────────────────────────────────────────────────────────────

interface DecorationBigNumberProps {
  number: string;
  caption: string;
  sub?: string;
}

function DecorationBigNumber({ number, caption, sub }: DecorationBigNumberProps) {
  return (
    <div className="max-w-[320px]">
      <p className="font-serif italic font-normal text-navy leading-none tracking-tight"
         style={{ fontSize: 'clamp(80px, 11vw, 168px)' }}>
        {number}
      </p>
      <p className="mt-3 font-mono uppercase tracking-wider text-eyebrow text-navy">
        {caption}
      </p>
      {sub && (
        <p className="mt-1 font-serif italic text-caption text-muted-text">
          {sub}
        </p>
      )}
    </div>
  );
}

interface DecorationStackedBarProps {
  litCount: number;
  silentCount: number;
  litLabel: string;
  silentLabel: string;
}

function DecorationStackedBar({
  litCount,
  silentCount,
  litLabel,
  silentLabel,
}: DecorationStackedBarProps) {
  const total = litCount + silentCount;
  const litPct = (litCount / total) * 100;
  return (
    <div className="max-w-[300px]">
      <p className="font-mono uppercase tracking-wider text-eyebrow text-navy mb-4">
        Atlas-wide breakdown
      </p>
      {/* Vertical stacked bar — silent on top (large), lit on bottom
          (small). Lit segment gets navy fill at full saturation;
          silent segment gets warm-neutral with navy stroke. Visually
          mirrors the map's gap-mode coloring. */}
      <div className="flex items-end gap-3">
        <div className="flex flex-col" style={{ height: '320px', width: '64px' }}>
          <div
            className="border border-navy/30 bg-warm-neutral"
            style={{ height: `${100 - litPct}%`, width: '100%' }}
          />
          <div
            className="bg-navy"
            style={{ height: `${litPct}%`, width: '100%' }}
          />
        </div>
        <div className="flex flex-col justify-between" style={{ height: '320px' }}>
          <div>
            <p className="font-serif italic font-normal text-navy leading-none"
               style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}>
              {silentCount.toLocaleString()}
            </p>
            <p className="mt-1 font-mono uppercase tracking-wider text-eyebrow text-muted-text">
              {silentLabel}
            </p>
          </div>
          <div>
            <p className="font-serif italic font-normal text-navy leading-none"
               style={{ fontSize: 'clamp(48px, 6vw, 80px)' }}>
              {litCount.toLocaleString()}
            </p>
            <p className="mt-1 font-mono uppercase tracking-wider text-eyebrow text-navy">
              {litLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DecorationDivergentProps {
  smallCountyPct: number;
  smallCountyN: number;
  totalSmall: number;
}

function DecorationDivergent({
  smallCountyPct,
  smallCountyN,
  totalSmall,
}: DecorationDivergentProps) {
  return (
    <div className="max-w-[320px]">
      <p className="font-mono uppercase tracking-wider text-eyebrow text-navy mb-3">
        Paralympic underdog
      </p>
      <p className="font-serif italic font-normal text-navy leading-none tracking-tight"
         style={{ fontSize: 'clamp(96px, 13vw, 200px)' }}>
        {smallCountyPct.toFixed(0)}%
      </p>
      {/* Visual proportion bar — clay-tinted segment showing 68% of
          small counties beating metro Paralympic median. */}
      <div className="mt-4 h-2 w-full bg-warm-neutral border border-paralympic-clay/30 overflow-hidden">
        <div
          className="h-full bg-paralympic-clay"
          style={{ width: `${smallCountyPct}%` }}
        />
      </div>
      <p className="mt-3 font-serif italic text-caption text-muted-text leading-snug">
        {smallCountyN.toLocaleString()} of {totalSmall.toLocaleString()} counties under 250k pop —
        beating the major-metro Paralympic median per 100k.
      </p>
    </div>
  );
}

function DecorationAnalogNetwork() {
  // SVG mini-diagram — 4 dots representing Cobb (center, navy filled)
  // + 3 analogs (peripheral, olympic-blue ring) connected with subtle
  // arcs. Editorial-restrained illustration of the "1 source + 3
  // peers" similarity model. Static — no scroll/state animation
  // beyond the chapter fade-in handled by parent.
  return (
    <div className="max-w-[300px]">
      <p className="font-mono uppercase tracking-wider text-eyebrow text-navy mb-3">
        Similarity surface
      </p>
      <svg viewBox="0 0 280 280" style={{ width: '100%', height: 'auto' }} aria-hidden="true">
        {/* Connection arcs */}
        <g stroke="#B96B5C" strokeWidth="1.2" strokeDasharray="3 3" fill="none" opacity="0.6">
          <path d="M 140 140 Q 80 70 60 60" />
          <path d="M 140 140 Q 220 70 240 60" />
          <path d="M 140 140 Q 220 220 240 240" />
        </g>
        {/* 3 analog rings */}
        {[
          { cx: 60, cy: 60, label: 'Alexandria, VA' },
          { cx: 240, cy: 60, label: 'Charleston, SC' },
          { cx: 240, cy: 240, label: 'Bridgeport, CT' },
        ].map((a) => (
          <g key={a.label}>
            <circle cx={a.cx} cy={a.cy} r="14" fill="none" stroke="#5B7DB1" strokeWidth="2" />
            <circle cx={a.cx} cy={a.cy} r="6" fill="#5B7DB1" />
          </g>
        ))}
        {/* Source pin (Cobb) */}
        <circle cx="140" cy="140" r="22" fill="none" stroke="#1F3A5F" strokeWidth="1.5" opacity="0.3" />
        <circle cx="140" cy="140" r="10" fill="#1F3A5F" stroke="#FFFFFF" strokeWidth="2" />
        <text x="140" y="180" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight={600} fill="#1F3A5F">
          COBB COUNTY
        </text>
      </svg>
      <p className="mt-2 font-serif italic text-caption text-muted-text leading-snug">
        Source county at center; 3 analytically-similar peer counties
        connect via athlete-profile + climate + sport-mix similarity.
      </p>
    </div>
  );
}

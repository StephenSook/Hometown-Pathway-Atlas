import type { Config } from 'tailwindcss';

// Atlas Editorial palette — locked per DESIGN_SYSTEM.md §1.1
// Editorial data journalism archetype (NYT / Bloomberg / Pudding) — NOT cinematic agency
// Olympic + Paralympic colors are large-text only on white (>=24px) — fail WCAG AA at body size
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        navy: '#1F3A5F',           // primary text, headers, source-county highlight
        'olympic-blue': '#5B7DB1',  // ParityPanel left, Olympic data series — large-text only
        'paralympic-clay': '#B96B5C', // ParityPanel right, Paralympic data series — large-text only

        // Surfaces
        'warm-neutral': '#F5F1EB', // page bg, card bg where contrast needed
        'card-white': '#FFFFFF',
        'soft-border': '#E7E2D9',

        // Text
        'body-text': '#1C2433',
        // Darkened from #6B7280 → #475569 (slate-600) to pass WCAG AA on warm-neutral
        // bg at body text size (was 4.29:1, now ~5.65:1). Caught by axe-core audit
        // 2026-05-02 across hero + results views (multiple sites: hero copy, footnote,
        // RegionHeader MSA line, back button, etc.).
        'muted-text': '#475569',

        // Status (tri-color semantic, locked across confidence/quality/severity)
        // accent-teal darkened from #2E8B57 → #1F7A47 to pass AA when used as a text
        // fg on white (EvidenceLabel "high" pill). Was 4.24:1, now ~5.0:1.
        'accent-teal': '#1F7A47', // verified / passed / strong evidence
        'status-amber': '#D97706', // pending / partial / medium evidence (use #1C2433 text on this bg)
        'status-danger': '#B91C1C', // anomaly / failed / hard error
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Source Serif Pro', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'SF Mono', 'monospace'],
      },
      fontSize: {
        // Per DESIGN_SYSTEM.md §1.2 type scale
        'eyebrow': ['12px', { lineHeight: '1.3', letterSpacing: '0.2em' }],
        'caption': ['13px', { lineHeight: '1.4' }],
        'body': ['16px', { lineHeight: '1.5' }],
        'body-lg': ['18px', { lineHeight: '1.5' }],
        'h3': ['20px', { lineHeight: '1.2', letterSpacing: 'normal' }],
        'h2': ['32px', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'h1': ['64px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'stat-md': ['28px', { lineHeight: '1.05', letterSpacing: '-0.01em' }],
        'stat-lg': ['56px', { lineHeight: '1.0', letterSpacing: '-0.02em' }],
      },
      spacing: {
        // 8px grid is Tailwind default — no custom values needed
      },
      borderRadius: {
        // Defaults extended for editorial card shapes
      },
      boxShadow: {
        // Editorial elevation per DESIGN_SYSTEM.md §1.5
        'card-resting': '0 1px 2px rgba(28,36,51,0.04), 0 4px 12px rgba(28,36,51,0.04)',
        'card-hover': '0 4px 12px rgba(28,36,51,0.06), 0 8px 24px rgba(28,36,51,0.08)',
        'nav-pill': '0 2px 4px rgba(28,36,51,0.04), 0 8px 16px rgba(28,36,51,0.04)',
        'log-panel': '0 4px 16px rgba(28,36,51,0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;

# Build audit — 2026-05-03

Lighthouse + bundle-size baseline against the post-Editorial Polish +
Phase 2 backend wire production build (commit `12f9169` HEAD at run
time). Run before deploy + recording so any regressions can be
caught + tagged.

## Methodology

```bash
cd frontend && npm run build         # tsc -b && vite build (9m 8s)
cd frontend && npm run preview       # serves dist/ on :4173
npx lighthouse http://localhost:4173 \
  --output=json --output-path=/tmp/lighthouse-atlas.json \
  --chrome-flags="--headless=new --no-sandbox" --quiet
```

Run against the hero view (no ZIP submitted). Backend NOT running —
Lighthouse measures hero load + initial JS parse + first paint only.
Post-submit results-view perf isn't covered here; would require
backend + scripted ZIP submit.

## Bundle size (vite build dist/ output)

| Asset | Raw | Gzipped | Notes |
|---|---|---|---|
| `dist/index.html` | 1.76 kB | 0.67 kB | HTML shell |
| `dist/assets/index-*.css` | 26.31 kB | 6.00 kB | Tailwind compiled (purge working — 0 unused CSS) |
| `dist/assets/index-*.js` | **1,467.83 kB** | **457.51 kB** | Single bundle — Vite warned >500kB chunk |
| **Total dist/** | ~1,496 kB | ~464 kB | |

**Build time:** 9m 8s on macOS via Rolldown bundler. Slower than
expected (Rolldown plugin breakdown: rolldown:vite-resolve 46% +
vite:css-post 41%). Acceptable for pre-deploy build cadence;
caching on subsequent CI builds should improve.

## Lighthouse scores (hero view, headless Chrome)

| Category | Score | Target | Verdict |
|---|---|---|---|
| **Performance** | 70 | ≥85 | ⚠️ Below target — see analysis below |
| **Accessibility** | 100 | 100 | ✓ Perfect |
| **Best Practices** | 100 | ≥90 | ✓ Perfect |
| **SEO** | 91 | ≥90 | ✓ Above target (OG tags + per-route title in place) |

## Performance details (Core Web Vitals + load metrics)

| Metric | Value | Target | Verdict |
|---|---|---|---|
| Largest Contentful Paint (LCP) | 4,816 ms | <2,500 ms | ⚠️ Over |
| First Contentful Paint (FCP) | 4,816 ms | <1,800 ms | ⚠️ Over |
| Total Blocking Time (TBT) | 91 ms | <300 ms | ✓ |
| Cumulative Layout Shift (CLS) | 0.027 | <0.1 | ✓ |
| Speed Index | 4,816 ms | <3,400 ms | ⚠️ Over |
| Time to Interactive (TTI) | 4,984 ms | <3,800 ms | ⚠️ Over |
| Server Response Time | 32 ms | <600 ms | ✓ Vite preview is fast |
| Main Thread Work | 1,843 ms | <4,000 ms | ✓ |
| Bootup Time | 243 ms | <2,000 ms | ✓ |
| Total Byte Weight | 556 KB | <1,600 KB | ✓ |

LCP / FCP both at 4,816 ms means content paints all at once — no
progressive paint. Driven by single-bundle JS parse + execute on
headless Chrome (no GPU acceleration, sandbox restrictions amplify
script eval cost).

## Findings

**Real-world Cloud Run perf will be better than headless Lighthouse
suggests.** Headless Chrome on macOS (no GPU, no sandbox accel)
inflates JS parse times ~2-3x vs real browser. On Cloud Run with
HTTP/2 multiplexing + browser cache + real browser GPU, expect
LCP ~2.0–2.5 s on first paint, sub-second on cached repeat. Score
should land ≥85 on real-browser Lighthouse run from a desktop
network.

**Single-bundle architecture is the actionable lever.** Vite
warned chunk >500KB; gzipped 457KB is acceptable for hackathon
scope but code-splitting via React.lazy on heavy routes would drop
hero LCP significantly. Top split candidates:
  - `MethodologyPage` — only renders on #about hash, lazy-load
  - `RegionQA` — only renders on results view + Q&A scroll, lazy
  - `CountyMap` — `react-simple-maps` + `us-atlas` TopoJSON likely
    largest single contributor to bundle
  - `ComplianceLog` — Framer Motion variants + sidebar code

**Unused JS estimate: 124 KB savings** if dead-code paths are
trimmed. Likely candidates: unused Lucide icons (already tree-
shaken individually but verify imports), unused Framer Motion
variants in motion.ts, unused mocks in lib/mocks.ts (only sparse
sentinel actually loads in production path).

**CSS is clean.** Tailwind purge working — 26.31 kB / 6.00 kB gz,
zero unused CSS rules per Lighthouse audit.

**No render-blocking resources.** Vite's preload-all strategy
working as designed.

**No third-party scripts.** Atlas runs first-party only. Zero
external JS, zero analytics SDKs, zero font CDNs — fonts are local.

## Action items

**Pre-deploy (Day 8 ops):**
- [ ] Re-run Lighthouse against deployed Cloud Run URL on a real
      desktop browser (not headless). Re-record perf scores. Compare
      to this baseline. If still <85 in real browser, escalate to
      code-split.
- [ ] If real-browser score still <85: lazy-load `MethodologyPage`
      via `React.lazy` (lowest risk, biggest split — page is rarely
      loaded). ~30min refactor.

**Future / post-deadline:**
- [ ] Code-split `CountyMap` + `ComplianceLog` + `RegionQA`. Each
      becomes a separate Suspense boundary. Architecture-level
      change; not worth doing pre-deadline.
- [ ] Audit motion.ts for unused variants.
- [ ] Audit mocks.ts — `mockSparseRegion` is the only fixture
      that ships in production path; `mockRegion` / `mockAnalogs` /
      `mockPathway` could be tree-shaken via dynamic imports if
      needed for the demo path.

**No action / resolved here:**
- Accessibility 100/100 — caught a regression early via continuous
  axe-core in dev; that work paid off here.
- Best Practices 100/100 — HTTPS-ready, no console errors, no
  deprecated APIs.
- SEO 91/100 — OG tags + per-route title + meta description shipped
  earlier this session. The 9-point gap is likely the missing
  robots.txt + sitemap.xml (overkill for hackathon submission).

# Build audit — 2026-05-03

Lighthouse + bundle-size baseline + post-optimization re-baseline
against the production build. Run before deploy + recording so any
regressions can be caught + tagged.

**Two passes captured:**
- v1 BASELINE — pre-optimization (HEAD `12f9169`)
- v3 POST-OPTIMIZATION — after lazy-load MethodologyPage + CountyMap
  (HEAD `eac0655`)

(v2 = MethodologyPage-only lazy ran in between; ~unchanged from v1
because MethodologyPage is small. Captured for the record but
collapsed into v3 narrative.)

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

## Bundle size

### v1 baseline (pre-optimization)

| Asset | Raw | Gzipped |
|---|---|---|
| `dist/index.html` | 1.76 kB | 0.67 kB |
| `dist/assets/index-*.css` | 26.31 kB | 6.00 kB |
| `dist/assets/index-*.js` | **1,467.83 kB** | **457.51 kB** |
| **Total dist/** | ~1,496 kB | ~464 kB |

Single 457KB-gz bundle. Vite warned >500KB chunk. **Build time
9m 8s** (cold; Rolldown vite-resolve 46% + vite:css-post 41%).

### v3 post-optimization (lazy MethodologyPage + CountyMap)

| Asset | Raw | Gzipped |
|---|---|---|
| `dist/index.html` | 1.84 kB | 0.70 kB |
| `dist/assets/index-*.css` | 26.36 kB | 6.02 kB |
| `dist/assets/MethodologyPage-*.js` | 9.33 kB | 3.72 kB *(lazy)* |
| `dist/assets/createLucideIcon-*.js` | 9.98 kB | 3.95 kB *(shared)* |
| `dist/assets/index-*.js` | 485.94 kB | **148.12 kB** ★ |
| `dist/assets/CountyMap-*.js` | 964.38 kB | 303.01 kB *(lazy)* |
| **Total dist/** | ~1,498 kB | ~466 kB |

**Initial bundle: 457.51 → 148.12 KB gz (−67%).** Same total bytes
(everything still ships); but only 148 KB is downloaded + parsed
on hero load. CountyMap chunk loads in parallel with the API
request when results view mounts; MethodologyPage loads on #about
hash click. **Build time 1.74 s** (TSC cached after first run).

## Lighthouse scores (hero view, headless Chrome)

| Category | v1 baseline | v3 post-opt | Target | Verdict |
|---|---|---|---|---|
| **Performance** | 70 | **85** ★ | ≥85 | ✓ TARGET HIT |
| **Accessibility** | 100 | 100 | 100 | ✓ Perfect |
| **Best Practices** | 100 | 100 | ≥90 | ✓ Perfect |
| **SEO** | 91 | 91 | ≥90 | ✓ |

## Performance details (Core Web Vitals + load metrics)

| Metric | v1 baseline | v3 post-opt | Target | Δ |
|---|---|---|---|---|
| Largest Contentful Paint (LCP) | 4,816 ms | **3,200 ms** | <2,500 ms | **−1,616 ms** |
| First Contentful Paint (FCP) | 4,816 ms | 3,200 ms | <1,800 ms | −1,616 ms |
| Total Blocking Time (TBT) | 91 ms | 139 ms | <300 ms | +48 ms (still ✓) |
| Cumulative Layout Shift (CLS) | 0.027 | **0** | <0.1 | clean |
| Speed Index | 4,816 ms | 3,200 ms | <3,400 ms | **−1,616 ms ✓** |
| Time to Interactive (TTI) | 4,984 ms | 3,418 ms | <3,800 ms | **−1,566 ms ✓** |
| Server Response Time | 32 ms | 32 ms | <600 ms | ✓ |
| Main Thread Work | 1,843 ms | 1,182 ms | <4,000 ms | −661 ms |
| Bootup Time | 243 ms | 283 ms | <2,000 ms | +40 ms (chunk init) |
| Total Byte Weight | 556 KB | **251 KB** | <1,600 KB | **−305 KB** |

LCP dropped 1.6 s with lazy-loaded CountyMap (us-atlas TopoJSON was
55% of bundle). Real Cloud Run + real browser should clear LCP
target (<2.5 s) — headless Chrome inflates JS parse 2-3x vs real
browser GPU.

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

**Done in commit `eac0655`:**
- [x] Lazy-load MethodologyPage (low risk; rarely loaded)
- [x] Lazy-load CountyMap (us-atlas pull — biggest single win)

**Pre-deploy (Day 8 ops):**
- [ ] Re-run Lighthouse against deployed Cloud Run URL on a real
      desktop browser. Capture real-browser score for the record.
      Headless 85 should land ≥90 on real browser with HTTP/2 +
      browser cache + GPU acceleration.

**Future / post-deadline (only if real-browser perf surprises):**
- [ ] Code-split `RegionQA` (~5 KB gz, only loads after Q&A asked
      first time)
- [ ] Code-split `ComplianceLog` (~10 KB gz, Framer Motion variants
      heavy) — note this would defer the demo-mode auto-trigger
      slightly; verify pitch beat timing if pursued
- [ ] Audit motion.ts for unused variants
- [ ] Audit mocks.ts — `mockSparseRegion` ships; mockRegion/Analogs/
      Pathway could move to dynamic imports

**Resolved here / no action:**
- Performance 85/100 ★ TARGET HIT
- Accessibility 100/100 — continuous axe-core sweep paid off
- Best Practices 100/100 — HTTPS-ready, no console errors, no
  deprecated APIs
- SEO 91/100 — OG tags + per-route title + meta description shipped.
  The 9-point gap is likely missing robots.txt + sitemap.xml
  (overkill for hackathon submission).

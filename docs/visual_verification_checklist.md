# Visual verification checklist — Editorial Polish Layer

Manual browser walkthrough for the 17 commits shipped in the
2026-05-03 PM Editorial Polish session. TypeScript + drift CI +
phrasing CI all pass; this checklist covers the things automated
checks cannot — does it FEEL right.

## Run

```bash
cd frontend && npm run dev
# open http://localhost:5173
```

Run through the sections below. Tick each box as you go. Anything
unchecked → flag back so we can fix.

---

## 1. Landing surface

### 1.1 Favicon
- [ ] Browser tab shows the Atlas parity-glyph (two parallel bars
      inside a navy rounded square, NOT the old purple Vite default)

### 1.2 HeroStat
- [ ] "1 in 2" big stat renders centered above the hero h1
- [ ] Hover the "1 in 2" number — dotted underline appears, then a
      popover card shows "Source" eyebrow + the expanded methodology
      ("Cross-references Move United 2024 Impact Report (141 of 225
      ≈ 63%)…")
- [ ] Italic visible source line below ("2016-2024 Team USA roster,
      county-FIPS aggregated") still shows as before

### 1.3 ZIP input + tour CTA
- [ ] ZipInput renders as before
- [ ] Below it: italic line "or try Cobb County, GA →" with the
      county name as a clickable button (mono-uppercase,
      navy/olympic-blue hover)
- [ ] Click the tour CTA → results view loads with mockRegion
      (Cobb County, GA)

### 1.4 Tab title
- [ ] Browser tab title reads "Hometown Pathway Atlas — Team USA
      county-level analytics" on landing

---

## 2. Results view (ZIP 30060 — Cobb County full data)

Submit ZIP `30060` OR click the tour CTA.

### 2.1 URL state
- [ ] URL becomes `localhost:5173/?zip=30060&fips=13067`
- [ ] Open the URL in a NEW tab — it hydrates STRAIGHT to results
      view (skips hero) ★ deep-link works

### 2.2 Tab title
- [ ] Browser tab title becomes "Cobb County, GA — Hometown
      Pathway Atlas"

### 2.3 SourceTooltip on every metric (★ this is the big one)

Hover (or tab-focus) each of these — verify dotted underline
appears + popover reveals source citation:

- [ ] ParityPanel — Olympic per-100k stat number → "Team USA
      Olympic roster 2016-2024 (Rio + Tokyo + Paris) aggregated
      to county FIPS, per-capita normalized…"
- [ ] ParityPanel — Paralympic per-100k stat number → "…separately
      ranked by percentile from Olympic — never merged."
- [ ] SportMix — "Top sports" eyebrow → "NFHS Athletics
      Participation 2023-24 (8,062,302 student-athletes / 19,983
      schools) cross-joined with USOPC Team USA roster…"
- [ ] ClimateBadge — "Climate" eyebrow → "NOAA nClimGrid 5km
      gridded climate dataset, county-FIPS aggregated 30-year
      normals. Köppen-Geiger zone classification…"
- [ ] AdaptiveAccessCard — chapters count "2" → "Move United 2024
      chapter directory… Display only — never load-bearing in
      similarity matching per CLAUDE.md locked decision #2."
- [ ] AnalogCard SimilarityBreakdown — "Athlete profile" label →
      "40% weight (CLAUDE.md locked decision #7). County athlete
      pipeline density…"
- [ ] AnalogCard SimilarityBreakdown — "Sport mix" label → 35% +
      NFHS cross-join methodology
- [ ] AnalogCard SimilarityBreakdown — "Climate" label → 25% +
      MSA diversity constraint per locked decision #10
- [ ] Pillar5Defense — each NGB chip name (USA Wrestling, USA
      Swimming, USA Track & Field) → "Source" + "Open ↗" link
      to the actual NGB program URL

### 2.4 ComplianceLog replay button
- [ ] Right-side audit panel renders
- [ ] Wait ~5s for the demo cycle to settle (Rules pass, Gemini
      fail → fixed)
- [ ] Header shows the live-pulse green dot
- [ ] To the LEFT of the green dot: small ↻ Replay icon button
- [ ] Click ↻ Replay → demo sequence restarts from T+0,
      Rules + Gemini columns clear and re-populate

### 2.5 Pillar 5 layout
- [ ] Pillar5Strip renders 3 columns (TAM ~50M / Zero / Revenue
      pills) — no change from before
- [ ] Pillar5Defense renders directly below at tight spacing
      (mt-6 = 24px gap, not the wider mt-16 used between unrelated
      sections)
- [ ] Pillar5Defense Zone A: $35K-$70K stat + "Per-incident harm"
      eyebrow + Beat the Streets source italic
- [ ] Pillar5Defense Zone B: 3 NGB chips in order USA Wrestling →
      USA Swimming → USA Track & Field
- [ ] NGB chip backgrounds = warm-neutral; outer card = white
      (inverted pair signal)

---

## 3. Sparse-county empty state (ZIP 11111)

Click "Back to home", then submit ZIP `11111`.

### 3.1 Tab title
- [ ] Tab title becomes "Garfield County, MT — Hometown Pathway
      Atlas"

### 3.2 URL
- [ ] URL becomes `?zip=11111&fips=30033`

### 3.3 Empty state rendering
- [ ] RegionHeader: "Garfield County, MT" + "Non-MSA — rural
      county" + pop 1,106
- [ ] ParityPanel: BOTH columns show em-dash placeholders —
      side-by-side parity preserved (locked decision #4)
- [ ] ParityPanel footer: "Limited public data for this region.
      See Pattern Gaps below…"
- [ ] SportMix: NO bar chart — instead an italic empty-state
      paragraph "No sport over-indexed in this region — county
      participation patterns may be balanced…"
- [ ] AdaptiveAccessCard: "0" stat + footer "No Move United
      chapters within 50 mi in our indexed directory…" (different
      from the 30060 footer)
- [ ] Pillar5Strip + Pillar5Defense still render unchanged
      (region-agnostic data)

---

## 4. Error sentinel (ZIP 00000)

Click "Back to home", submit ZIP `00000`.

### 4.1 Error path
- [ ] Sonner toast appears: "Could not load that region (HTTP 404).
      Try another ZIP."
- [ ] View returns to hero
- [ ] No URL deep-link state pollution (URL clean)

---

## 5. Methodology /about page

From hero view, click Navbar "About" link OR navigate directly to
`http://localhost:5173/#about`.

### 5.1 Page rendering
- [ ] Browser tab title: "Methodology — Hometown Pathway Atlas"
- [ ] Hero: "Methodology" eyebrow + "How Atlas works" h1 +
      italic byline
- [ ] 8 sections: Analytical unit / Per-capita parity / 3-dim
      similarity (with 3-card grid) / Adaptive access / Compliance
      Log / Hard rules / Data sources / Limits + open questions
- [ ] "Back to home" button at top → returns to hero AND clears
      the #about hash

### 5.2 Direct-load
- [ ] Open `localhost:5173/#about` in a fresh tab — lands directly
      on methodology (skips hero)

---

## 6. Mobile responsive (375x812 — iPhone 8 / SE viewport)

Use browser devtools "Responsive Design Mode" or resize browser
window to 375px wide.

### 6.1 Hero
- [ ] HeroStat readable, no text overflow
- [ ] Tour CTA fits in one line OR wraps gracefully
- [ ] ZipInput stacks if needed

### 6.2 Results
- [ ] Region profile cards (SportMix / ClimateBadge / Adaptive)
      stack vertically (1-col)
- [ ] AnalogCards stack vertically (1-col)
- [ ] PatternGap cards stack vertically (1-col)
- [ ] Pillar5Strip stacks 3 columns vertically
- [ ] Pillar5Defense Zone A above Zone B (stacked); 3 NGB chips
      stack vertically in Zone B
- [ ] ParityPanel: Olympic stacks above Paralympic with horizontal
      divider (vs vertical divider on desktop)

### 6.3 ComplianceLog mobile
- [ ] Right-side fixed sidebar HIDDEN on mobile
- [ ] Bottom-right floating Activity icon FAB visible
- [ ] Click FAB → bottom drawer slides up, shows Rules + Gemini
      columns (tight but readable)
- [ ] Replay button still visible in drawer header

---

## 7. SourceTooltip keyboard accessibility

- [ ] Tab key navigates through page; SourceTooltips with `href`
      (the 3 NGB chip names in Pillar5Defense) are tab-focusable
      and reveal tooltip on focus-visible
- [ ] Pressing Enter on a focused NGB chip opens the source URL
      in a new tab

---

## 8. Browser console
- [ ] DevTools console shows ZERO errors during the full
      30060 → back → 11111 → back → 00000 → back → /#about cycle
- [ ] DEV-only console.info from ComplianceLog: "[ComplianceLog]
      demo cycle settled in ~4000ms…" (informational, not a warning)

---

## Triage

If ANY box fails to tick:
- Note which box + what you saw
- Surface back in chat
- I'll diagnose + fix per the standing commit-cadence pref
  (one fix = one commit + immediate push)

If everything ticks:
- Lock visual state, move to pitch dry-run via
  `./scripts/pitch-stopwatch.sh`
- Or wait Vinh next push for backend integration work

---

## Why Claude couldn't run this himself

Playwright MCP browser session wedged on navigate during the
session-ending visual sweep. Vite confirmed running (port 5173
ready); browser/MCP layer was the failure point. Manual checklist
is the honest fallback rather than fabricating a "looks good"
verdict from process state alone.

Per CLAUDE.md UI verification rule: "If you can't test the UI,
say so explicitly rather than claiming success."

# Demo Video Storyboard

Companion to `docs/pitch_script.md`. Recording-day shot list,
recording protocol, post-production checklist, submission requirements
for the Team USA × Google Cloud Hackathon submission video.

**Submission deadline:** May 11, 2026 — 5:00 PM PT.

**Source documents:**
- `docs/pitch_script.md` — narration source of truth
- `docs/03_demo_outline.docx` — original 6-scene Day 1 storyboard,
  superseded by this doc but kept for the strong scoring-criteria
  framing
- `docs/pitch_pillar5.md` — locked Pillar 5 numbers

---

## What this video must do (3 hard requirements)

Per the original 03_demo_outline framing — preserved verbatim:

1. **Solve a fan-centric Team USA problem** (40% Impact criterion).
   Open with the Layer D 5-chapter scrollytelling walkthrough
   anchored on the live `/api/stats/global` payload — atlas of
   silence → 4-in-5 gap → 68% small-county finding → pathway
   not pedigree → find your county.
2. **Show the technology working in real time** (30% Technical Depth).
   Live URL demo, not slides. Gemini doing real reasoning. Compliance
   Log auditor catching causal language. GCP Console proving deployment.
3. **Tell a story that lands emotionally** (30% Presentation). Stat
   that opens must hit. Arc must close on resonance, not feature list.

---

## What this video must NEVER do (DQ-grade rules)

- ❌ Show any athlete name, image, or likeness (NIL)
- ❌ Use IOC/USOPC branding (rings, torch, "Olympic Games" loosely)
- ❌ Use causal language about geography ("this region produces
  athletes"). Conditional phrasing only.

**Single biggest point of failure:** A NIL slip in the demo video is
automatic disqualification.

**Pre-upload protocol:**
- Stephen watches recorded video 3× before upload
- Vinh watches at least 1× before upload
- Specifically check: text on screen, voiceover, any background audio,
  any tooltip on hover, any mock data field that could leak a name

---

## Pre-record setup checklist

Run through this list BEFORE you hit record:

### Environment
- [ ] Quiet room, door closed
- [ ] All notifications muted (macOS Do Not Disturb)
- [ ] Other apps closed (memory + audio interference)
- [ ] Browser at the deployed Cloud Run URL (Day 8 deploy URL pinned
      in CLAUDE.md)
- [ ] Backup tab: localhost dev server running at `http://localhost:5173/`
- [ ] Both backend (Vinh's Cloud Run) AND frontend (yours) verified live
      via curl 5 minutes before recording

### Browser
- [ ] Browser maximized to native screen resolution (1920×1080 ideal)
- [ ] Chrome/Safari with NO extensions visible (use clean profile or
      hide extensions toolbar)
- [ ] No bookmarks bar visible
- [ ] DevTools closed
- [ ] Browser zoom at 100%
- [ ] Hero view loaded, ZIP input focused

### Cursor + display
- [ ] System Preferences → Accessibility → Display → Pointer size at
      Large (judges may watch at smaller window — large cursor visible)
- [ ] Cursor highlight enabled (ScreenStudio auto, or macOS native:
      Accessibility → Pointer Control → Pointer)
- [ ] Display brightness consistent (don't let auto-brightness shift
      mid-record)

### Audio (if recording narration in same session)
- [ ] USB mic plugged in (preferred over MacBook built-in)
- [ ] Audio levels tested: speak normally → peak around -12 to -6 dB
- [ ] Headphones on so playback doesn't bleed into mic

---

## Shot list (single-take screen capture + separate narration)

**Approach:** record the screen capture in one continuous take. Record
narration audio in 3 takes (pick best per beat). Sync in post-prod.

**Shot index maps to pitch_script.md beats.**

### Shot 1 — Layer D scrollytelling opener (0:00 — 0:38)

**Live app, not pre-render.** Browser at deployed Cloud Run URL,
scroll position at top, motion confirmed ON (prefers-reduced-motion
disabled — falls back to static stack which collapses Beat 1 to ~12s
and breaks the recording).

5 chapters trigger via react-scrollama as the cursor scrolls down at
a deliberate pace (~7s per chapter):

- **Chapter 1 INTRO (0:00 — 0:08).** Sticky map fades in. Eyebrow
  "01 — An atlas of silence." Heading "There are 3,222 counties in
  the United States." DecorationBigNumber renders 3,222 on the
  opposite side. Counties render warm-neutral with faint navy stroke
  — looks like a blueprint.
- **Chapter 2 GAP (0:08 — 0:18).** Scroll triggers. Map shifts to
  gap mode — 555 counties tinted navy by density, 2,667 dim.
  Eyebrow "02 — The 4-in-5 gap." Heading "4 in 5 counties are silent."
  DecorationStackedBar renders the lit-vs-silent ratio.
- **Chapter 3 UNDERDOG (0:18 — 0:28).** Scroll triggers. Map shifts
  to underdog mode — small Paralympic-rep counties light up clay,
  metros dim. Eyebrow "03 — The silence isn't where you'd expect."
  Heading "68% of small counties beat the metro." DecorationDivergent
  renders the small-county-vs-metro split.
- **Chapter 4 PATHWAY (0:28 — 0:34).** Scroll triggers. Map zooms
  to Cobb (13067) navy + 3 fixed analog FIPS (51510 Alexandria, 45019
  Charleston, 09120 Greater Bridgeport) olympic-blue. Eyebrow
  "04 — Pathway, not pedigree." Heading "Atlas reads each county's
  pathway." DecorationAnalogNetwork renders the similarity edges.
- **Chapter 5 CTA (0:34 — 0:38).** Scroll triggers. Map fades to
  background opacity. Eyebrow "05 — Find your county." Heading
  "Your county Team USA story." HeroStat + ZipInput + rotating globe
  + CountyNameSearch slot in. ZipInput pulses gently.

**Recording pacing:** the scroll cadence drives the entire 38s
budget. If Stephen scrolls too fast the chapters trigger out of
sync with narration; too slow and the budget overruns. Practice
the scroll-pace 3× before live take.

### Shot 2 — ZIP submit (0:38 — 0:50)

- Single continuous take from Shot 1 (no cuts; Chapter 5 reveal
  flows directly into the ZIP input)
- Cursor moves to ZipInput (already pulsing from Chapter 5)
- Type "30060" deliberately (~2 keystrokes/sec)
- Cursor moves to "Show me" button
- Click → ResultsSkeleton flashes for ~600ms → results render
- ComplianceLog ★ in right sidebar starts its auto-demo sequence
  immediately on mount — DON'T draw attention yet, narrator covers
  it in Beat 4

### Shot 3 — Results tour (0:50 — 1:38)

- Continuation of single take
- Cursor pans across results in this order:
  1. RegionHeader (Cobb County, GA, population badge) — hover 2s
  2. CountyMap — hover over source pin (navy) → hover over each of
     3 analog pins (olympic-blue) → arcs visible — total 6s
  3. ParityPanel — pan across both Olympic + Paralympic columns,
     evidence labels visible. **Optional: hover over a stat number
     to flash the SourceTooltip popover (1s)** — the
     editorial-citation moment lands here in 1 visual beat — 8s
  4. SportMix + ClimateBadge + AdaptiveAccessCard 3-col grid — quick
     pan, don't dwell — 4s
  5. AnalogList — pan across 3 cards, hover one to show similarity
     breakdown — 6s
  6. PatternGapPanel — pan across 3 categories (observed strength /
     public access signal / opportunity hypothesis), conditional
     phrasing visible — 8s
- Pacing: continuous slow pan, no abrupt jumps, no scroll-jitter
- **Compression vs original:** trimmed from 50s → 40s to make room
  for Shot 5.5 RegionQA without breaking 3:00 total

### Shot 4 — RegionQA ★ Layer C (1:38 — 1:58)

Live `/api/region/qa` route — eyebrow flips to "Live Gemini" only on
a real Vertex call (the source-flag invariant from the F2 + /ultrareview
remediation waves).

- Continuation of single take
- Scroll past TradeoffPanel to RegionQA panel ("Ask the Atlas")
- Click the first suggested-question chip (auto-fills textarea)
- Click Send button — watch reasoning chain animate in:
  1. "Pulling region parity metrics" lights up
  2. "Cross-referencing top sports"
  3. "Reasoning over climate signature"
  4. "Drafting conditional-phrased response"
- Final answer fades in on right zone, confidence pill ("medium")
- **Hold 2s** — judges register the visible Q&A reasoning chain plus
  the "Live Gemini" eyebrow tag (proof the response came from a
  verified Vertex call, not the stub fallback)
- Cursor moves toward right sidebar (transitions to Shot 5)

**Stub-fallback risk note:** if Vertex AI returns an error
(quota / IAM / deadline) during recording, the eyebrow flips to
"Design preview" and the response is the deterministic fallback.
The visual difference is small but a sharp judge will notice.
Mitigation: warm the backend with one /api/region/qa call ~30s
before recording. If the warm-up call returns source="fallback",
abort the take and re-warm.

### Shot 5 — ComplianceLog ★ pivot (1:58 — 2:28)

- Cursor moves to right sidebar where ComplianceLog lives
- ComplianceLog has been settled since ~T+5s post-submit — Rules
  column shows "Awaiting checks…" placeholder, Gemini column shows
  the green-dotted "fixed" entry with rewrite text visible
- **Optional: click the ↻ Replay button in the panel header** to
  re-trigger the cycle on screen if the auditor moment landed before
  the cursor arrived — restarts Rules pass + Gemini fail→fixed
  sequence from T+0 (4s total) so judges see it land live
- Hover over the fixed entry to show the before/after line through
  decoration
- HOLD for 3 seconds — this is THE differentiation moment
- Camera (CSS zoom) optional: zoom to 110% on the ComplianceLog panel
  for emphasis

### Shot 6 — Tech Proof cuts (2:28 — 2:48)

- 4 quick cuts (5s each):

**Cut 7a (5s):** GCP Console → Cloud Run service detail page
- Service name visible
- Region: us-central1
- Recent revisions list
- Public URL highlighted
- Green "Serving traffic" indicator visible

**Cut 7b (5s):** Vertex AI quota/usage page
- Model: gemini-2.5-flash
- Recent calls visible (NOT zero usage)

**Cut 7c (5s):** GitHub repo — split-screen Pydantic + System Prompt
- LEFT half: `backend/schemas/region.py` showing `RegionResponse`
  Pydantic class with `narrative_source: Literal["gemini", "fallback"]`
  + `compliance_log: list[ComplianceEntry]` typed fields
- RIGHT half: `backend/services/gemini_service.py:33` showing the
  `_REGION_NARRATIVE_SCHEMA` dict — the actual JSON schema constraining
  Vertex AI's structured output (parity_check object with olympic_mentioned
  + paralympic_mentioned + deterministic_language booleans)
- Frame the cut so Pydantic class + Gemini schema are visible side-by-
  side in the same screenshot — the contract is the inference-time
  constraint, not just app-level type-hinting
- Apache 2.0 LICENSE visible in repo About sidebar
- The split-screen choice lands harder for a DevRel judge than a
  single-file scroll: it shows that the Pydantic types AND the Vertex
  AI response_schema are the SAME contract, not parallel duck-typing

**Cut 7d (5s):** Quick fade back to live app, scrolled to where
Pillar5Strip is visible

### Shot 7 — Pillar5Strip ★ (2:48 — 3:08)

- Continuation of Shot 7d, scrolled position
- Pillar5Strip visible in full: 3 columns (TAM ~50M / Cost "Zero" /
  Revenue model B2B+B2G pills)
- Cursor pans across each column slowly
- Footer callout visible: "Surfaces signals relevant to fans, parents,
  NGB recruiters, and state recreation programs."

### Shot 8 — Close + URL card (3:08 — 3:24, post-trim ~2:50)

- Final card OR pull back to full-page view
- Atlas wordmark center screen
- URL below: `https://atlas-frontend-xxxxxx-uc.a.run.app`
- Tagline: "Per-capita parity. County granularity. Audit-grade."
- Hold 2s, fade to black

---

## Recording protocol

### Tool tradeoffs

| Tool | Pros | Cons | Cost |
|------|------|------|------|
| **ScreenStudio** (Mac) | Auto-zoom on cursor, smooth movements, click highlights, built-in editor | Mac-only | $89 one-time |
| **OBS Studio** | Free, pro-grade, full control, cross-platform | Setup overhead, no auto-zoom | Free |
| **QuickTime** (macOS) | Zero setup, cmd+shift+5 | No cursor effects, no auto-zoom | Free |
| **Loom** | Easy, captions auto, share-link | Free-tier watermark, less control | Free / $10 |

**Recommendation:** ScreenStudio if budget. OBS otherwise. QuickTime
last resort.

### Capture settings

- Resolution: 1920×1080 (1080p)
- Frame rate: 30fps (60fps overkill for screen capture)
- Format: MP4 H.264 high profile
- Audio: 48kHz stereo, 192kbps AAC

### Audio recording (separate track)

- Tool: Logic Pro / GarageBand / Audacity / Voice Memos (for last-resort)
- Mic: USB condenser preferred (Yeti, Shure MV7, Audio-Technica AT2020USB)
- 3 takes per beat, pick best
- Edit out breaths + mouth clicks in post

---

## Post-production checklist

### Editing

- [ ] Sync narration audio to screen capture (use claps/timestamps as anchors)
- [ ] Cut out cursor jitter, accidental hovers, dead time
- [ ] Add lower thirds:
  - Beat 5 close: "Stephen Sookra · Frontend / Pitch / Architecture"
  - Beat 5 close: "Vinh Le · Backend / Data / AI"
- [ ] Add tech stack overlay during Beat 4.5 Tech Proof: "Vertex AI
      Gemini · FastAPI · React + Vite · Cloud Run"
- [ ] Lower-third URL during Beat 6: deployed Cloud Run URL
- [ ] No music — speak over silence per pitch_script.md doc

### Captions

- [ ] Auto-generate captions (YouTube unlisted upload OR Otter.ai OR
      Mac native dictation)
- [ ] Manual review for spelling: Cobb, FIPS, NGB, NFHS, Aspen,
      Vertex, Pillar
- [ ] Burn captions IN if hackathon platform doesn't support sidecar
      .vtt (verify Day 9 morning)

### Quality control

- [ ] Watch full video 3× yourself
- [ ] Watch with captions only (audio off) — does the story land?
- [ ] Watch with audio only (video minimized) — does the narration
      stand alone?
- [ ] Vinh watches once and signs off
- [ ] NIL/IOC/USOPC scan one final time

---

## Submission checklist

### Format requirements

Verify against the actual hackathon submission page **Day 9 morning**:

- [ ] Video format (likely MP4 H.264)
- [ ] Max length (likely 3:00)
- [ ] File size limit (likely under 500MB)
- [ ] Aspect ratio (likely 16:9)
- [ ] Hosting: direct upload OR YouTube unlisted OR Vimeo unlisted

### Required overlays

- [ ] Project name visible: "Hometown Pathway Atlas"
- [ ] Team names visible (lower third or final card)
- [ ] Tech stack mentioned (Vertex AI, Cloud Run, Apache 2.0)
- [ ] Live URL visible at end

### Submission package

- [ ] Demo video uploaded
- [ ] GitHub repo URL submitted (Apache 2.0 LICENSE present)
- [ ] Live deployed URL submitted (Cloud Run frontend)
- [ ] Backend URL submitted if separate field
- [ ] Project description matches CLAUDE.md framing
- [ ] Team member names + roles
- [ ] Cover image (use a clean screenshot of the Atlas results view)

---

## Day 9 recording timeline

**Day 9 morning:**
- Verify hackathon submission page requirements
- Verify Cloud Run live (frontend + backend)
- Read pitch_script aloud once with stopwatch — note any over/under

**Day 9 afternoon:**
- 2× full dry runs with screen capture, no narration
- Record narration audio (3 takes per beat)
- Edit + caption in post-prod tool

**Day 9 evening:**
- Final video render
- 3× watch-throughs with NIL/IOC/USOPC scan
- Vinh sign-off
- Upload to YouTube unlisted as backup
- Submit to hackathon platform

**Day 10 = buffer** for any submission-platform issues. Do NOT count
on Day 11 — submission deadline is 5pm PT and last-minute issues
have killed teams before.

---

## Backup plans

### Cloud Run cold-start delay during recording

If the live URL is sluggish (3-5s cold start on first request):

```bash
# Set min-instances to 1 the morning of recording to keep a warm container
gcloud run services update atlas-frontend --region us-central1 --min-instances 1
# Same for backend
gcloud run services update atlas-backend --region us-central1 --min-instances 1
```

Cost: ~$5-10 for the recording day. Acceptable. Set back to 0 after
submission.

### Cloud Run completely down during recording

Switch to localhost dev server in second tab. Don't apologize, don't
break the script — narration is identical. Local dev server has all
mocks + ComplianceLog demo + Pillar5Strip + sentinel ZIP.

### ComplianceLog demo cycle ends mid-Beat 4

If recording timing drifts and you arrive at Beat 4 BEFORE the demo
sequence completes:

- Pause the cursor 2-3 seconds → demo cycle finishes → resume narration
- Or re-trigger by clicking Back to home → submit again

### Audio sync issues in post

If narration drifts more than 200ms from screen capture: re-record
narration only (don't re-shoot the screen capture). Use slate
markers (cmd-shift-3 screenshot at the start of each take) to
anchor sync points.

---

## Reconciliation notes vs `03_demo_outline.docx`

### Preserved from existing storyboard

- 6-scene structure — kept and mapped to pitch_script beats
- Tech Proof scene — INTEGRATED as Beat 4.5 (was missing from
  pitch_script v1; hackathon FAQ requirement)
- DQ checklist (NIL/IOC/USOPC) — preserved verbatim
- 3-watch-throughs pre-upload protocol — preserved

### Updated from existing storyboard

- Pillar 5 numbers (Beat 5) — corrected per cold-check round 3
  (50M children not households, 20K NFHS schools not 13K, 6K
  NGB modeled). Existing storyboard's Scene 6 was a generic
  "montage" close — replaced with locked Pillar 5 numbers
  (stronger close-the-room moment per Sookra Pillar 5).
- ComplianceLog timing — leverages auto-demo cycle running in
  background during Beats 2-3, settled by Beat 4 pivot. Existing
  storyboard suggested live trigger which is riskier.
- Cost framing "Zero" — added per cold-check Pillar 5 work
- Sentinel ZIP `00000` test path — referenced as fallback if ZIP
  routing breaks during demo

### Diverged

- Scene 6 close in existing storyboard called for a "4-5 region
  profiles flicker by" montage. Replaced with Pillar 5 strip + close
  card per the cold-checked pitch arc. **If Stephen prefers the
  montage, swap Beats 5+6 for the existing montage.** Tradeoff:
  montage = emotional resonance, Pillar 5 = business closure. Both
  valid — pitch_script v1 went with Pillar 5 because that's the
  Sookra Methodology Pillar 5 close-the-room beat.

### Added 2026-05-03 (Layer C ship)

- **Shot 4 (was 5.5) — RegionQA Layer C:** demo the Gemini Q&A panel
  (suggested-question chip → reasoning chain → conditional-phrased
  answer). 20s budget. Originally OPTIONAL with hand-authored
  fixtures; promoted to a fixed beat once `/api/region/qa` route
  shipped (commit bcbc98e) and the source-flag invariant landed
  (commits 487acc8 + ef31249) — eyebrow now flips between "Live
  Gemini" and "Design preview" based on the actual Vertex response.
- **Shot 3 results tour:** SourceTooltip hover beat (1s) on a stat
  number to flash the editorial-citation popover. Single visual
  beat that signals the entire 17-tooltip system.
- **Shot 5 ComplianceLog:** optional ↻ Replay button click as
  recovery move if the auto-demo cycle landed before cursor arrived.
- **Shot 6c GitHub repo:** README API contract section +
  `backend/services/gemini_service.py` (full structured-output
  proof + the `_classify_vertex_error` observability helper).

### Added 2026-05-04 (Layer D ship + /ultrareview wave)

- **Shot 1 — Layer D scrollytelling opener:** replaced the static
  title card + map overlay + question card sequence (former Shots
  1-3) with the live 5-chapter scrollytelling walkthrough anchored
  on `/api/stats/global`. Move United 63% stat dropped from the
  pitch entirely — atlas-discovered stats (4-in-5 gap + 68% small-
  county finding) are stronger differentiators and they live ON
  SCREEN as part of the visual narrative.
- **Pre-record check:** verify `prefers-reduced-motion` is OFF
  before recording. If reduced-motion is on, scrolly chapters
  collapse to a static stack and Beat 1 budget collapses from 38s
  to ~12s — breaks the entire downstream timing.
- **Backend warm-up:** call `/api/region` AND `/api/region/qa`
  ~30s before recording to prime caches. If either returns
  `source: "fallback"`, abort the take + re-warm.

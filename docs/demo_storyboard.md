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
   Open with the Move United 63% stat + named-person scenario.
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

### Shot 1 — Hook title card (0:00 — 0:08)

- **Pre-render asset (NOT live app):** title card on warm-neutral
  background. Bold typography fades in:
  - Line 1: "63% of 2024 U.S. Paralympic athletes"
  - Line 2: "came through one network."
- Source for stat: Move United 2024 Impact Report (141 of 225 ≈ 63%)
- Tool: Keynote / Figma / browser-rendered HTML — your call
- Duration: 8s

### Shot 2 — Map overlay (0:08 — 0:15)

- Subtle US map outline appears. ~20 dots scatter representing Move
  United chapters. Visibly concentrated, large rural gaps.
- Text overlay: "In only a fraction of U.S. counties."
- Optional: pre-render this as a static image OR use the actual
  CountyMap component zoomed out

### Shot 3 — Question card → live URL transition (0:15 — 0:22)

- Map fades. Text appears: "What does Team USA look like from where
  you're from?"
- Cursor blinks below the question
- Cuts to live URL (browser hero view) at 0:22

### Shot 4 — Hero view + ZIP submit (0:22 — 0:45)

- Single take in browser
- Cursor moves to ZIP input
- Type "30060" deliberately (~2 keystrokes/sec)
- Cursor moves to "Show me" button
- Click → ResultsSkeleton flashes for ~600ms → results render
- ComplianceLog ★ in right sidebar starts its auto-demo sequence
  immediately on mount — DON'T draw attention yet, narrator covers
  it in Beat 4

### Shot 5 — Results tour (0:45 — 1:35)

- Continuation of single take
- Cursor pans across results in this order:
  1. RegionHeader (Cobb County, GA, population badge) — hover 3s
  2. CountyMap — hover over source pin (navy) → hover over each of
     3 analog pins (olympic-blue) → arcs visible — total 8s
  3. ParityPanel — pan across both Olympic + Paralympic columns,
     evidence labels visible — 8s
  4. SportMix + ClimateBadge + AdaptiveAccessCard 3-col grid — quick
     pan, don't dwell — 5s
  5. AnalogList — pan across 3 cards, hover one to show similarity
     breakdown — 8s
  6. PatternGapPanel — pan across 3 categories (observed strength /
     public access signal / opportunity hypothesis), conditional
     phrasing visible — 10s
- Pacing: continuous slow pan, no abrupt jumps, no scroll-jitter

### Shot 6 — ComplianceLog ★ pivot (1:35 — 2:05)

- Cursor moves to right sidebar where ComplianceLog lives
- ComplianceLog has been settled for ~85s — Rules column shows
  "Awaiting checks…" placeholder, Gemini column shows the green-dotted
  "fixed" entry with rewrite text visible
- Hover over the fixed entry to show the before/after line through
  decoration
- HOLD for 3 seconds — this is THE differentiation moment
- Camera (CSS zoom) optional: zoom to 110% on the ComplianceLog panel
  for emphasis

### Shot 7 — Tech Proof cuts (2:05 — 2:25)

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

**Cut 7c (5s):** GitHub repo
- README visible
- Apache 2.0 LICENSE in About sidebar
- Architecture diagram OR `gemini_service.py` showing structured
  output schema

**Cut 7d (5s):** Quick fade back to live app, scrolled to where
Pillar5Strip is visible

### Shot 8 — Pillar5Strip ★ (2:25 — 2:50)

- Continuation of Shot 7d, scrolled position
- Pillar5Strip visible in full: 3 columns (TAM ~50M / Cost "Zero" /
  Revenue model B2B+B2G pills)
- Cursor pans across each column slowly
- Footer callout visible: "Surfaces signals relevant to fans, parents,
  NGB recruiters, and state recreation programs."

### Shot 9 — Close + URL card (2:50 — 3:00)

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
- Move United 63% opener — INTEGRATED (was missing from pitch_script v1)
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

# Day 9 Demo Recording — Sound Design Plan

For the May 11 Devpost submission video. ~3 minute pitch screen-capture
with narrator voiceover. Editorial-sober NYT Upshot / Pudding /
Reuters Graphics aesthetic.

Per 2026-05-03 Sookra Council: video without sound design = ~30% weaker
submission. This doc is the recipe Stephen executes Day 9.

---

## Aesthetic frame

What we want: documentary editorial. NYT Daily / Reply All / 99% Invisible
production values. Sparse instrumentation that sets focus, ducks under
narration, swells on the Beat 4 demo moment.

What to AVOID: agency / startup-promo synth bass, EDM-style drops,
corporate-uplift acoustic guitar, generic "tech" arpeggios. None of
those match the editorial tone Atlas needs.

If music decision drifts toward "make it cool" — cut it back. Atlas
is sober precision, not flash.

---

## Music track recommendations (royalty-free, attribution permitted)

All sources verified free for Devpost submission use 2026-05-03.

### Primary candidates — YouTube Audio Library (no attribution required for YouTube use; safe for Devpost)

Search terms in YouTube Audio Library (https://studio.youtube.com →
Audio Library):
- Genre: Cinematic, Ambient, Classical
- Mood: Calm, Inspirational, Bright
- Duration: 2-3 minutes (matches pitch length)

Specific tracks to audition:
1. **"Above the Clouds"** by Aakash Gandhi — sparse piano, builds
   gently, 2:46. Good for full-pitch underscore.
2. **"Midnight in the Lands"** by Bobby Cole — ambient drone with
   light percussion, 3:00. Stronger Pillar 4 build.
3. **"Aurora Currents"** by Asher Fulero — slow synth pad, no melody
   competition with voiceover, 2:52. Safest VO underscore.

### Backup candidates — Free Music Archive (CC-BY required attribution in credits)

If YouTube Audio Library picks don't fit:
1. **Kai Engel** — "Idea" or "Snowmen" — neoclassical piano, very
   editorial. Free Music Archive: freemusicarchive.org/music/Kai_Engel
2. **Chad Crouch** — "Algorithms" or "Frameworks" — ambient
   electronic, NPR-style. freemusicarchive.org/music/Chad_Crouch
3. **Dexter Britain** — "The Time to Run (Finale)" — cinematic
   build. freemusicarchive.org/music/Dexter_Britain

If using FMA tracks: add a "Music: [Artist] — [Track] (CC-BY)" credit
line in the YouTube video description AND in SUBMISSION.md "Credits"
block.

### Hard NO list (don't waste time auditioning)

- Anything labeled "corporate", "startup", "energetic", "happy"
- Anything with vocals (competes with narrator)
- Anything with strong rhythm (competes with pitch beats)
- Anything Hans Zimmer-style trailer-music (oversells)

---

## Per-beat sound design map

Pitch script lives at `docs/pitch_script.md` (3:04 spoken). Sound
events are timestamped against pitch elapsed time.

| Time | Beat | Sound event | Source |
|------|------|-------------|--------|
| 0:00 | Pre-roll | 1.5s of room tone before narration starts | recorded silent, in-camera |
| 0:00 | Underscore in | Music fades in over 3s, settles at -22 dB under VO | track of choice |
| 0:00 | Beat 1 hook | None — let the 63% stat punch alone | — |
| 0:20 | Beat 2 ZIP submit | Soft "tap" sound when narrator types ZIP, 0.2s, low-pass filtered | recorded keyboard or ScreenStudio default UI sound |
| 0:21 | Beat 2 results render | Soft single-note chime, 0.4s, on results-skeleton replace | YouTube Audio Library "soft chime" or generated in iMovie |
| 0:45 | Beat 3 results tour | Music continues underscore; no SFX | — |
| 1:35 | Beat 4 ComplianceLog moment | **THIS IS THE ONE.** Music swells +3 dB for 2s as Stephen says "While you were looking at the data..." Then a single soft glass-tap on the moment "rewrote it conditionally" lands | tap = ScreenStudio UI sound or iMovie default |
| 1:55 | Beat 4.5 Tech Proof cuts | Music subtly modulates (no SFX); cuts are visual-only | — |
| 2:15 | Beat 5 Pillar 5 numbers | Music continues; 3 soft "page turn" or "tick" sounds aligned with the 3 numbers (~50M, Zero, ~6,000) | iMovie default tick |
| 2:40 | Beat 6 close | Music swells slightly +1 dB for the close, fades out -3 dB/sec over 3s after "Thank you" | — |
| 3:00 | End card | Music fully out by end card, then 2s of silence before video ends | — |

**Total SFX events: ~6.** Restraint is the move. Each SFX should be
just-barely-audible, signaling beat transitions to the ear without
competing with narration.

---

## Voiceover capture

### Hardware
- USB mic better than laptop mic (Shure MV7, Blue Yeti, Audio-Technica
  ATR2100x — any of these). Avoid laptop built-in.
- Quiet room. Closet with hung clothes is the cliche for a reason —
  closet = 95% of pro studio acoustics for $0.

### Software
- ScreenStudio (https://www.screen.studio/) for screen + audio capture
  in one pass. $89 one-time. Worth it for the cursor effects + auto-zoom
  alone.
- Backup: OBS Studio + system audio routing. Free but more setup.
- For pure VO re-records: Audacity (free) or Adobe Audition.

### Recording protocol per pitch_script.md task 5.4 step 4
1. Record VO and screen capture in SAME PASS where possible (lipsync-
   style discipline; reading from script avoids over-rehearsing).
2. If first take rough on a beat, ScreenStudio supports re-recording
   from the timeline — re-do the beat, splice in.
3. Three takes max per beat (per CLAUDE.md task 5.4). Pick best in
   editing.

### Audio levels
- VO: -6 dB peak, -12 dB average
- Music underscore: -22 dB average (16 dB below VO)
- SFX: -18 to -15 dB peak (subtle but audible)
- Master: -3 dB peak (Devpost / YouTube headroom)

### Ducking
- Music auto-ducks 6 dB when VO is present. ScreenStudio + iMovie both
  do this automatically with sidechain compression. Verify after every
  edit pass.

---

## Edit pass workflow

1. **Capture day (Day 9 morning)**: full pitch screen + VO in one
   take. Repeat 2x. Pick best take or splice.
2. **First edit pass (Day 9 afternoon)**: drop music underscore on a
   second timeline track. Set to -22 dB. Trim to fit pitch length.
3. **SFX pass (Day 9 afternoon)**: add the 6 SFX events per the table
   above. Audition each at full volume, then attenuate to -18 dB.
4. **Ducking verification**: scrub through every beat boundary.
   Confirm music ducks under VO without sounding pumped.
5. **Beat 4 emphasis**: pull music UP +3 dB for 2 seconds at 1:35.
   This is the demo moment — let the music carry the weight Stephen's
   voiceover can't.
6. **Captions**: ScreenStudio or YouTube auto-caption pass. Manual
   correction for "Atlas", "FIPS", "USOPC", "NFHS", "Move United",
   "Aspen", "Vertex AI" — these consistently mis-transcribe.
7. **Final master**: -3 dB peak, export H.264 MP4 at 1080p (Devpost
   requirement) at 30fps. Mono audio acceptable; stereo preferred for
   the music underscore.

---

## Backup plan (if Day 9 audio capture fails)

If something goes wrong with the VO capture (room noise, USB mic
death, Stephen voice tired):

1. **Emergency room tone**: open ScreenStudio, record 30 seconds of
   silence in current room. This is your noise-reduction reference
   sample. Apply Audacity → Effect → Noise Reduction → Get Noise
   Profile → apply.
2. **Re-record VO only** in Audacity, splice over the screen capture.
3. **Skip music entirely** if time-pressed. Naked VO + SFX is
   acceptable for the demo. Music is bonus, not requirement.
4. **Sound recordist fallback**: Vinh has a USB mic too. Stephen
   could send the script + Vinh records as backup VO take.

---

## Cost / budget

- YouTube Audio Library tracks: free, no attribution required
- Free Music Archive tracks: free, attribution required in description
- ScreenStudio: $89 one-time (Stephen choice — currently using? Verify)
- iMovie: free (ships with macOS)
- Audacity: free (https://audacityteam.org/)
- USB mic: Stephen owns? If not, MV7 = $250, Yeti = $130, ATR2100x = $99
  on Amazon

Total budget if Stephen owns mic + ScreenStudio: $0.
Total budget worst case: ~$340 (mic + ScreenStudio).

---

## What NOT to add

Per Sookra Council 2026-05-03 + per CLAUDE.md aesthetic framing:
- ❌ Animated UI sound effects throughout the pitch (would feel app-y,
  not editorial)
- ❌ Music with strong drum kit (competes with narration)
- ❌ Voice modulation / autotune / processing on Stephen's voice
- ❌ "Trailer music" Hans-Zimmer-style swells anywhere except the
  Beat 4 +3 dB push
- ❌ Sound effects for ZIP input keystrokes EXCEPT one soft tap on
  Enter (more would feel game-y)

Atlas is data journalism, not a startup demo reel. Sound design follows.

---

## Day 9 morning checklist (do this first thing)

- [ ] Charge laptop, plug in if pos
- [ ] Close all background apps (Slack, browser, etc) — eliminates
  notification sounds + frees CPU for capture
- [ ] Run `npm run preview` from `frontend/` — production-build server
  catches Vite-only bugs before recording
- [ ] Verify Cloud Run deploy URL is the latest (per Day 8 work)
- [ ] Test ScreenStudio + USB mic before pitch — record 30 seconds,
  play back, check levels
- [ ] Pre-load YouTube Audio Library track choices in browser tabs
- [ ] Review pitch_script.md once aloud, time it on stopwatch (per
  CLAUDE.md task 5.4 step 1)
- [ ] Set Do Not Disturb on macOS (Focus mode)
- [ ] Pre-record 30s of room tone before narration starts (noise
  reference if needed in edit)

---

## Related files

- `docs/pitch_script.md` — narration source of truth (3:04 spoken)
- `docs/demo_storyboard.md` — recording-day shot list
- `docs/cloud_run_deploy.md` — Day 8 deploy runbook (verify deploy
  URL fresh before Day 9)
- `docs/notebooklm_oracle_prompts.md` — pre-pitch defensibility
  review (run before Day 9 morning if not already done)
- `docs/council_2026-05-03.md` — chairman synthesis flagging sound
  design as Day 9 last-mile work

# Pitch dry-run rehearsal protocol

Per 2026-05-03 Sookra Council Day 8 follow-up flag #1: Stephen has not
yet read `pitch_script.md` aloud + timed actual delivery. This is the
cheapest diagnostic — measures real-world per-beat duration vs the
script target so beats can be re-trimmed before the May 9-10 recording
session.

## Quick start

```bash
./scripts/pitch-stopwatch.sh
```

Press Enter to start the run. Press Enter at the end of each beat to
capture a split. Press `q` + Enter to abort. At the end, the script
dumps a per-beat report (cumulative time, beat-only duration, target,
delta) and saves a timestamped log to `docs/pitch_dryrun_YYYY-MM-
DD_HH-MM.log` for trend tracking.

## Beat targets (from pitch_script.md)

| Beat | Content | Target | Cumulative |
|---|---|---|---|
| 1 | Hook + shocking stat (HeroStat "1 in 2") | 20s | 0:20 |
| 2 | Problem + ZIP submit (judge sees Cobb County resolve) | 25s | 0:45 |
| 3 | Region results walkthrough (RegionHeader → ParityPanel → SportMix → ClimateBadge → AdaptiveAccessCard → CountyMap) | 50s | 1:35 |
| 4 | Compliance Log audit moment (regex catch → Gemini rewrite, "while you were looking at data") | 35s | 2:10 |
| 5 | Pillar 5 numbers + Pillar5Defense lighthouse NGBs | 30s | 2:40 |
| 6 | Close + CTA + URL share | 20s | 3:00 |

Total target: **3:00** (Devpost video time budget).

## Recommended dry-run protocol

1. **Cold read** (no warm-up): just to baseline. Don't worry about
   overruns; the goal is to learn where natural pauses + breaths land.

2. **Run #2 with adjustments**: based on Run #1, mentally trim or
   slow down. Aim for ±5s of each beat target.

3. **Run #3 with the actual demo**: open `localhost:5173`, type 30060,
   walk through with cursor + voice. This is the realistic recording
   simulation. Time both audio cadence + cursor movement.

4. **Run #4 final**: full delivery rehearsal. If +5s or more on any
   beat, edit the script. If <2:50 total, add breath pauses on
   landing beats. Lock when in band.

## Beat-by-beat triage rules

- **Beat overrun by +5s or worse** → trim that beat in
  `docs/pitch_script.md`. Most common culprit: Beat 3 (region results
  walkthrough). The 6 cards each invite hover-tooltip-citing tangents
  that blow the 50s budget.
- **Beat undershot by -10s or worse** → consider absorbing the
  surplus into an adjacent beat that's running long. Often Beat 1
  finishes with breath room you can move to Beat 2.
- **Total over 3:05** → tighten longest-overrun beat first. Don't
  trim every beat by 1-2s — concentrated cuts read cleaner than
  scattered cuts.
- **Total under 2:50** → add explicit pause beats on landing
  moments: post-shocking-stat, post-Compliance-Log-fixed, post-
  Pillar 5 number land. Silence before recap reads as confidence,
  not stalling.

## What the script captures

For each beat:
- **cumulative split** — wallclock time from run start
- **beat-only duration** — time spent on this beat alone
- **target** — script-locked target seconds
- **delta** — beat-only minus target (positive = overrun)

Per-beat delta is the actionable number. Cumulative split is for
sanity-check against the 3:00 budget.

## Log retention

Each run writes a timestamped log to `docs/pitch_dryrun_YYYY-MM-
DD_HH-MM.log`. Don't gitignore them — the trend across rehearsals
(e.g., "Beat 4 was +8s on first 3 runs, dropped to +2s by run 6")
is itself an artifact worth keeping.

## Prerequisites

- macOS / Linux bash
- python3 (for portable millisecond timing — bash `date +%N` is
  GNU-only, doesn't work on macOS BSD date)

## Related artifacts

- `docs/pitch_script.md` — locked beat-by-beat narration
- `docs/sound_design.md` — Day 9 demo recording sound recipe
- `docs/notebooklm_oracle_prompts.md` — pre-recording sourcing audit
- `docs/council_2026-05-03.md` — Sookra Council Day 8 verdict (this
  rehearsal protocol closes follow-up flag #1)

#!/usr/bin/env bash
# Pitch dry-run stopwatch + per-beat splits.
# Per 2026-05-03 Sookra Council Day 8 follow-up: Stephen has not yet
# read pitch_script.md aloud + timed actual delivery. This is the
# cheapest diagnostic — measures real-world per-beat duration vs the
# script's target so beats can be re-trimmed before recording.
#
# Usage:
#   ./scripts/pitch-stopwatch.sh
#   → press Enter to start the run
#   → press Enter at the end of each beat to capture a split
#   → press 'q' + Enter to finish + dump report
#
# Targets (from docs/pitch_script.md as of 2026-05-03):
#   Beat 1 — Hook + shocking stat:           0:00 → 0:20  (target 20s)
#   Beat 2 — Problem + ZIP submit:           0:20 → 0:45  (target 25s)
#   Beat 3 — Region results walkthrough:     0:45 → 1:35  (target 50s)
#   Beat 4 — Compliance Log audit moment:    1:35 → 2:10  (target 35s)
#   Beat 5 — Pillar 5 numbers + analogs:     2:10 → 2:40  (target 30s)
#   Beat 6 — Close + CTA:                    2:40 → 3:00  (target 20s)
#
# Total target: 3:00 (Devpost video time budget; adjust here if the
# pitch_script target shifts).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$REPO_ROOT/docs/pitch_dryrun_$(date +%Y-%m-%d_%H-%M).log"

BEATS=(
  "1 — Hook + shocking stat (target 20s)"
  "2 — Problem + ZIP submit (target 25s)"
  "3 — Region results walkthrough (target 50s)"
  "4 — Compliance Log audit moment (target 35s)"
  "5 — Pillar 5 numbers + analogs (target 30s)"
  "6 — Close + CTA (target 20s)"
)
TARGET_SECONDS=(20 25 50 35 30 20)

now_ms() {
  # Portable millisecond timestamp (BSD date on macOS doesn't support %N).
  python3 -c 'import time; print(int(time.time() * 1000))'
}

fmt_split() {
  local ms=$1
  local s=$((ms / 1000))
  local m=$((s / 60))
  local rem=$((s % 60))
  printf "%d:%02d.%03d" "$m" "$rem" "$((ms % 1000))"
}

echo "Atlas pitch dry-run stopwatch"
echo "============================="
echo "Press Enter to start the run, then Enter again at the end of each beat."
echo "Press 'q' + Enter to stop early."
echo ""
read -r -p "Ready? "

START_MS=$(now_ms)
echo "▶ Recording. Press Enter for beat splits…"
echo ""

splits=()
beat_index=0

while [[ $beat_index -lt ${#BEATS[@]} ]]; do
  read -r -p "    Beat ${BEATS[$beat_index]} → press Enter on completion " input
  if [[ "$input" == "q" || "$input" == "Q" ]]; then
    echo "↳ Aborted by user."
    break
  fi
  now=$(now_ms)
  split_ms=$((now - START_MS))
  if [[ $beat_index -eq 0 ]]; then
    beat_ms=$split_ms
  else
    prev_ms=${splits[$((beat_index - 1))]}
    beat_ms=$((split_ms - prev_ms))
  fi
  splits+=("$split_ms")
  printf "        ✓ Beat split: %s | beat-only: %ds (target %ds)\n" \
    "$(fmt_split "$split_ms")" \
    "$((beat_ms / 1000))" \
    "${TARGET_SECONDS[$beat_index]}"
  beat_index=$((beat_index + 1))
done

END_MS=$(now_ms)
TOTAL_MS=$((END_MS - START_MS))

{
  echo "Atlas pitch dry-run — $(date)"
  echo "==========================================="
  echo ""
  echo "Total elapsed: $(fmt_split "$TOTAL_MS")"
  echo "Target total:  3:00.000"
  echo ""
  echo "Beat splits:"
  prev=0
  for i in "${!splits[@]}"; do
    s=${splits[$i]}
    beat_ms=$((s - prev))
    target_s=${TARGET_SECONDS[$i]}
    delta=$(( (beat_ms / 1000) - target_s ))
    sign=""
    [[ $delta -gt 0 ]] && sign="+"
    printf "  Beat %s | cumulative %s | beat %ds | target %ds | delta %s%ds\n" \
      "${BEATS[$i]}" \
      "$(fmt_split "$s")" \
      "$((beat_ms / 1000))" \
      "$target_s" \
      "$sign" \
      "$delta"
    prev=$s
  done
} | tee "$LOG"

echo ""
echo "Log saved → $LOG"
echo ""
echo "Triage:"
echo "  • +5s or worse on any beat → trim that beat in pitch_script.md"
echo "  • -10s or better → consider absorbing back into adjacent beat"
echo "  • Total > 3:05 → tighten longest-overrun beat first"
echo "  • Total < 2:50 → add breath / emphasis pauses on landing beats"

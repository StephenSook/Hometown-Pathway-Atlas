# Day {N} Status Update — {Owner}

**Date:** {Mon DD, 2026} (Day {N} of 11)
**For:** {Stephen | Vinh}
**From:** {Vinh | Stephen}

> Mirror of the Trace `STATUS_DAY4_VINH.md` pattern. Drop one of these in the repo root any time you finish a heavy session and want the other person to be able to start cold tomorrow without a verbal sync.

---

## What got done today

### Task X.X — {short title}

{What you built. Two-three sentences. What it does end-to-end.}

{If applicable: what tests cover it, what dependencies were satisfied, what invariants you proved.}

### Code-review fixes applied (N total)

| Fix | What changed |
|-----|-------------|
| `path/to/file.py` | One-sentence description of the fix and why. |
| `frontend/src/components/Foo.tsx` | … |

### Test coverage

**N tests total, all green:**

| Test file | Count |
|-----------|-------|
| test_X | N |
| test_Y | N |

---

## Backend ↔ frontend wire check

> Skip if today's work didn't touch the contract surface. Otherwise: confirm zero drift.

Verified field-by-field that {API endpoint} output → `schemas/{x}.py` → `frontend/src/lib/api.ts` → `frontend/src/components/{x}.tsx` is aligned. Specifically:

- `field_one`, `field_two` — confirmed
- `compliance_log[]` — confirmed shape

---

## What's left for {tomorrow / the next session}

### Task X.X — {what's next}

{2-3 lines on what the next task is, who owns it, what unblocks it.}

### Demo-readiness checkpoint

Once Task X.X ships, the next demo-able milestone is: {description}.

```bash
# Verbatim commands to reproduce the demo state on a fresh clone:
docker compose up -d --wait
cd backend && uvicorn main:app --reload --port 8000
# In another terminal:
cd frontend && npm run dev
# Open http://localhost:5173 — type ZIP {hero-zip}.
```

---

## Things for {Stephen | Vinh} to know

1. **{Heading}** — {key callout that the other person needs to know before starting tomorrow's work — schema change, banned phrase added to auditor regex, demo ZIP pinned, etc.}

2. **{Heading}** — {if any contract changed today, flag it here AND verify you used `⚠️ CONTRACT` in the commit message.}

3. **Commit on main** — `{sha}` has everything. {N} files changed, {M} insertions.

---

## Remaining tasks (full picture)

| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| X.X | {Owner} | {emoji} | {short note} |

---

## Risk flags

> Anything that surfaced today that PLAN.md's risk register didn't anticipate.

- {risk}: {one-line description + mitigation in flight}

# Pillar 5 Lock — Business Numbers

Per CLAUDE.md task 3.16. Locked **2026-05-02**, audited and corrected
**2026-05-03** (cold-check round 3).

NotebookLM-flagged the weakest pillar across the project. This doc makes the
numbers defensible and pitch-ready.

**Code surface of truth:** `frontend/src/lib/pillar5.ts` exports
`PILLAR5_TAM`, `PILLAR5_COST`, `PILLAR5_REVENUE_PILLS`, `PILLAR5_FOOTER`.
`Pillar5Strip.tsx` imports from there. If this doc and `pillar5.ts` drift,
update both — there is no automated sync.

---

## The 3 numbers

### TAM — ~50M US children ages 6-17

- **Number:** ~50,000,000 US children ages 6-17 in the addressable youth-sports market
- **Source:** Aspen Institute Project Play, *State of Play 2024* annual trends report (Census-derived denominator); ~27.3M of those (54.6%) play organized sports per NSCH + SFIA
- **Why:** Defines the broad consumer-facing TAM. Even capturing 1% as engaged users = 500K monthly actives. Anchors Atlas as a mass-market product, not a niche tool.
- **Audit note (2026-05-03):** Earlier draft cited "~50M households" — the Aspen number is *children*, not households. Corrected to honest framing. Same magnitude, defensible to follow-up Q&A.

### Deployment surface — ~20,000 US high schools with athletics

- **Number:** ~20,000 US high schools with NFHS-affiliated athletics programs (precise: 19,983)
- **Source:** National Federation of State High School Associations (NFHS) 2023-24 *Athletics Participation Survey* — 8,062,302 total student-athletes across 19,983 NFHS member schools served by 51 state associations
- **Why:** B2G procurement target. Each district licensing Atlas at $5K-$15K/yr provides bottom-up channel revenue independent of NGB sales.
- **Audit note (2026-05-03):** Earlier draft cited "~13,000 schools" — actual NFHS figure is 50% larger. Bigger number actually *strengthens* the B2G channel claim.

### Annual signal value — modeled ~6,000 NGB recruitment positions / year

- **Modeled estimate:** ~6,000 Team USA + NGB pipeline recruitment positions annually
- **Method:** 50 NGBs (USOPC published list) × ~120 estimated active recruitment slots/year for development-pipeline athletes (combined Olympic + Paralympic + youth pathway). Cross-check: USOPC published 2024 Team USA roster = 610 Olympic + 225 Paralympic = 835 named athletes per Olympic year.
- **Why:** Per-cycle recruitment opportunity Atlas affects. NGB scouts using Atlas to identify under-indexed counties = lower talent miss rate per recruitment cycle.
- **Audit note (2026-05-03):** Explicitly labeled as a *modeled* estimate. The 50-NGB count is sourced (USOPC); the per-NGB slot count is our model. If a judge asks "where does 6,000 come from?", the answer is "50 NGBs from USOPC × ~120 slots/year, our model." The hard alternative number is "835 athletes named to Team USA Paris 2024" if a citable figure is needed.

---

## Cost framing

### "Zero" — existing public county-level Olympic + Paralympic Atlas tools

- **Number:** **0** publicly accessible products today aggregate Olympic + Paralympic representation at county-FIPS granularity with per-capita parity discipline
- **Source:** Independent gap analysis 2026 — surveyed Wikipedia, USOPC.org, USA Today Olympic atlases, NCAA athlete maps, Statista, NCAA Demographics Database. None aggregate to county FIPS with parity. State-level only.
- **Why:** Frames Atlas as filling a complete gap, not displacing an incumbent. Pitch beat: *"the cost of NOT having this is the entire gap."*

---

## Revenue model

### B2B licensing → NGBs

- **Channel:** ~6,000 modeled NGB recruitment positions/yr → annual licenses to NGB recruiting departments
- **Pricing thesis:** $25K-$50K/yr per NGB recruiting org × 50+ NGBs = $1.25M-$2.5M ARR potential at full penetration

### B2G partnerships → state recreation departments + school districts

- **Channel:** ~20,000 HS programs accessible via state recreation department RFPs
- **Pricing thesis:** $5K-$15K/yr per state license × 50 states + tiered district licensing = $250K-$750K state-level + bottom-up district pull-through

---

## Footer callout

> *"Surfaces signals relevant to fans, parents, NGB recruiters, and state recreation programs."*

Observational/positional phrasing per CLAUDE.md conditional-phrasing rule
(reframed from §4.18's declarative "Built for…" example).

---

## Pitch arc position

Per Sookra Methodology Pitch Arc — Pillar 5 lands at **Beat 4 (30s for Numbers)**.

### 30-second pitch script (trimmed 2026-05-03 to actually fit 30s)

1. *(5s)* "TAM is **~50 million US children** in the addressable youth-sports market — Aspen Institute Project Play."
2. *(5s)* "Today, **zero** public products aggregate Olympic and Paralympic representation at county granularity with parity discipline."
3. *(7s)* "Atlas reaches **~20,000 high schools** via state recreation B2G partnerships and **50 NGBs** via B2B licensing."
4. *(8s)* "Surfaces signals relevant to fans, parents, NGB recruiters, and state recreation programs — a single per-county lens nobody else has."

Total target: 25-28s spoken, leaves 2-5s buffer for breath / emphasis.
Word counts: 16 / 16 / 17 / 22 = 71 words at 2.5 wps = ~28s. Beat 3 was
trimmed from 28→17 words (was running 11-12s in stage delivery, now ~7s).

---

## Number defensibility checklist

Before pitch:
- [ ] Aspen Institute *State of Play 2024* URL in slide notes — and confirm the "children, not households" framing
- [ ] NFHS Participation Survey link (latest year — 2023-24 confirmed 19,983 schools)
- [ ] USOPC NGB list (https://www.usopc.org/NGB-IMS) — confirms 50 NGBs
- [ ] USOPC 2024 Team USA roster (610 Olympic + 225 Paralympic) as fallback hard number
- [ ] Gap analysis screenshot (showing other tools fail to reach county-FIPS parity) ready as backup slide

If a judge presses "where does ~50M come from?" — answer: *Aspen Institute
Project Play, State of Play 2024 — children ages 6-17 in addressable
youth-sports market.* If they press on 6,000 — *modeled from USOPC's 50
NGBs × ~120 slots/yr.*

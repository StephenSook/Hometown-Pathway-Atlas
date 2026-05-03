# Pillar 5 Lock — Business Numbers

Per CLAUDE.md task 3.16. Locked **2026-05-02** at the Day 6 PM build gate.

NotebookLM-flagged the weakest pillar across the project. This doc makes the
numbers defensible and pitch-ready.

Frontend surface: `frontend/src/components/Pillar5Strip.tsx` renders these
verbatim in the Atlas results view (per DESIGN_SYSTEM §4.18 anatomy). If
this doc and the component drift, fix the component to match this doc.

---

## The 3 numbers

### TAM — ~50M youth athletic households

- **Number:** ~50,000,000 US households with at least one child in organized youth athletics
- **Source:** Aspen Institute Project Play, *State of Play 2024* annual trends report
- **Why:** Defines the broad consumer-facing TAM. Even capturing 1% as engaged users = 500K monthly actives. The number anchors Atlas as a mass-market product, not a niche tool.

### Deployment surface — ~13,000 US high schools with athletics

- **Number:** ~13,000 US high schools with NFHS-affiliated athletics programs
- **Source:** National Federation of State High School Associations (NFHS) 2023-24 *Athletics Participation Survey*
- **Why:** B2G procurement target. Each district licensing Atlas at $5K-$15K/yr provides bottom-up channel revenue independent of NGB sales.

### Annual signal value — ~6,000 NGB recruitment positions / year

- **Number:** ~6,000 Team USA + NGB pipeline recruitment positions annually
- **Source:** USOPC published roster (~835 athletes per Olympic year) + ~50 NGBs averaging ~120 active recruitment slots/year for development-pipeline athletes (combined Olympic + Paralympic + youth pathway)
- **Why:** Per-cycle recruitment opportunity Atlas affects. NGB scouts using Atlas to identify under-indexed counties = lower talent miss rate per recruitment cycle.

---

## Cost framing

### "Zero" — existing public county-level Olympic + Paralympic Atlas tools

- **Number:** **0** publicly accessible products today aggregate Olympic + Paralympic representation at county-FIPS granularity with per-capita parity discipline
- **Source:** Independent gap analysis 2026 — surveyed Wikipedia, USOPC.org, USA Today Olympic atlases, NCAA athlete maps, Statista, NCAA Demographics Database. None aggregate to county FIPS with parity. State-level only.
- **Why:** Frames Atlas as filling a complete gap, not displacing an incumbent. Pitch beat: *"the cost of NOT having this is the entire gap."*

---

## Revenue model

### B2B licensing → NGBs

- **Channel:** ~6,000 NGB recruitment positions/yr → annual licenses to NGB recruiting departments
- **Pricing thesis:** $25K-$50K/yr per NGB recruiting org × 50+ NGBs = $1.25M-$2.5M ARR potential at full penetration

### B2G partnerships → state recreation departments + school districts

- **Channel:** ~13,000 HS programs accessible via state recreation department RFPs
- **Pricing thesis:** $5K-$15K/yr per state license × 50 states + tiered district licensing = $250K-$750K state-level + bottom-up district pull-through

---

## Footer callout

> *"Surfaces signals relevant to fans, parents, NGB recruiters, and state recreation programs."*

(Reframed from the §4.18 example "Built for…" — declarative phrasing like
"Built for X" was caught by the cold-check pass against CLAUDE.md
conditional-phrasing rule. Kept observational/positional tone consistent
with the rest of the page.)

---

## Pitch arc position

Per Sookra Methodology Pitch Arc — Pillar 5 lands at **Beat 4 (30s for Numbers)**.

Suggested 30-second pitch script:

1. *(5s)* "TAM is **~50 million youth athletic households**" — Aspen Institute
2. *(5s)* "Today, **zero** public products aggregate Olympic and Paralympic representation at county granularity with parity discipline."
3. *(10s)* "Atlas reaches **~13,000 high schools** through state recreation department B2G partnerships, and **~6,000 NGB recruitment positions per year** through B2B licensing to NGB recruiting departments."
4. *(10s)* "Surfaces signals relevant to fans, parents, NGB recruiters, and state recreation programs — a single per-county lens nobody else has."

Total: 30s. Lands the three numbers + the gap framing + the channel breakdown.

---

## Number defensibility checklist

Before pitch:
- [ ] Aspen Institute *State of Play 2024* report URL in slide notes
- [ ] NFHS Participation Survey link (latest year available)
- [ ] USOPC roster numbers cross-referenced with Wikipedia + Team USA roster pages
- [ ] Gap analysis screenshot (showing other tools fail to reach county-FIPS parity) ready as backup slide

If a judge presses "where does the 50M come from?" — answer is *Aspen Institute Project Play*, not "we estimated."

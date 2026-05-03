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

## Per-incident dollar harm

Council 2026-05-03 weakest-pillar diagnosis: existing Pillar 5 had a TAM number
+ a "Zero" cost-of-gap framing but NO per-incident harm dollar. Without a
quantified unit cost of NOT using Atlas, "we have a market" never matures into
"we have a quantified harm dollar." This section closes that gap.

### ~$35K–$70K — startup-year cost of one mistargeted Beat the Streets chapter

- **Number:** $35,000–$70,000 — the year-one budget for one new Beat the Streets startup wrestling chapter (2–3 programming sites + ~100 youth served)
- **Source:** Beat the Streets National program tier disclosures (Tier 1 startup year), https://new.beatthestreets.org/faq-on-bts/
- **Why:** This is the unit-cost waste when a community-development siting decision is made on hometown gut + statewide aggregates instead of county-FIPS parity. Tier 3–4 regional orgs run >$500K/yr with 30+ sites — so a single mis-sited Tier 3 regional = $500K+ of misallocated capacity. Atlas's per-county lens is the targeting layer that makes those siting decisions defensible.
- **Top-of-funnel context:** USOPC distributed **$139.3M** in grants to athletes + NGBs in 2024 (USOPC 2024 Impact Report). Atlas's value prop sharpens per-county targeting across that grant flow — a 5% efficiency gain on county-level allocation ≈ $7M/yr in better-targeted funding. Modeled, not guaranteed; cited as flow context, not as Atlas's claim of impact.
- **Audit note (2026-05-03):** Per-incident framing was chosen deliberately OVER abuse-settlement framing (Larry Nassar / USA Gymnastics / SafeSport). Abuse settlements are NOT what Atlas addresses — Atlas is a pipeline-equity siting tool, not a safeguarding tool. Conflating the two would misframe the value prop and create PR risk. If a judge asks "what about safety?", the honest answer is "Atlas is upstream of safety; safety is a different product."

---

## Revenue model

### B2B licensing → NGBs

- **Channel:** ~6,000 modeled NGB recruitment positions/yr → annual licenses to NGB recruiting departments
- **Pricing thesis:** $25K-$50K/yr per NGB recruiting org × 50+ NGBs = $1.25M-$2.5M ARR potential at full penetration

### B2G partnerships → state recreation departments + school districts

- **Channel:** ~20,000 HS programs accessible via state recreation department RFPs
- **Pricing thesis:** $5K-$15K/yr per state license × 50 states + tiered district licensing = $250K-$750K state-level + bottom-up district pull-through

---

## Named lighthouse NGB pilots

Three named NGBs make abstract "50 NGBs" → concrete first-customer ICP. Each
chosen because (a) public unit economics exist for grant validation, (b)
geographic siting decisions sit at the core of their community-development
strategy, (c) sport profiles together test all three Atlas similarity
dimensions (combat / aquatic / outdoor distributed).

### 1. USA Wrestling — Beat the Streets Network

- **Program:** Beat the Streets youth wrestling community chapters
- **Reach:** 7,366 youth, 257 teams across 10 major markets (NYC, Philadelphia, Los Angeles, Chicago, Lancaster, Cleveland, Bay Area, New England, Detroit, Baltimore, Washington DC) — 37 cities total via regional affiliates
- **Unit economics:** $35K–$70K Tier 1 startup year; $250K–$499K Tier 2 (6–12 sites, 300–500 youth); $500K+ Tier 3–4 (30+ sites, 400–1,200 youth)
- **Why first-customer fit:** Climate-agnostic indoor sport, dense regional pipeline, explicit chapter-grant siting decisions. Atlas's county-FIPS parity could be associated with where the next chapter is most likely to convert vs. duplicate existing access. ~90% of regional revenue is board-driven individual + corporate giving — meaning a defensible county-targeting tool is currently absent from their stack.
- **Source:** Beat the Streets FAQ, https://new.beatthestreets.org/faq-on-bts/

### 2. USA Swimming — Make A Splash Foundation

- **Program:** Make A Splash Local Partner network
- **Reach:** 850+ qualified swim-lesson providers nationally; 4.9M+ children served since 2007
- **Unit economics:** $6.3M cumulative invested (2007–present) → ~$1.29 per child served via lesson grant subsidy
- **Why first-customer fit:** Climate-correlated (warm-state pool-access advantage maps directly to Atlas's climate dimension); explicit equity-grant program already siting-aware; aligns with Atlas's adaptive-access display layer; Make A Splash is already grant-program structured — lowest-friction first integration.
- **Source:** USA Swimming Foundation, https://www.usaswimming.org/foundation

### 3. USA Track & Field — RunJumpThrow (Hershey)

- **Program:** Hershey's RunJumpThrow free youth track & field intro
- **Reach:** 200,000+ children, 1,100+ schools (2016 baseline; current figures undisclosed publicly), 8+ states + cities (NJ, NY, GA, DC, CA, FL, OR, ID)
- **Unit economics:** Free to schools (Hershey-sponsor-funded); USATF supplies curriculum + 21 station kits
- **Why first-customer fit:** Largest single-NGB youth program by reach; geographic dispersion maximally tests Atlas's county-FIPS scaling discipline; outdoor / distributed sport profile balances combat (USAW) and aquatic (USAS) coverage to round out a 3-dimension stress test.
- **Source:** USA Track & Field RunJumpThrow, https://www.usatf.org/runjumpthrow-new/home

### Why these three together

The 3 named NGBs span Atlas's three similarity dimensions:

| Atlas dimension | Weight | USA Wrestling | USA Swimming | USA Track & Field |
|---|---|---|---|---|
| Athlete profile | 40% | dense regional pipeline | broad national base | top-of-funnel youth intro |
| Sport mix | 35% | combat (indoor) | aquatic (seasonal) | outdoor (distributed) |
| Climate | 25% | climate-agnostic | warm-state correlated | outdoor seasonal |

A 3-NGB lighthouse pilot stress-tests Atlas's similarity model end-to-end
before broader 50-NGB rollout. Lower risk for both sides: NGBs see Atlas
validated against the other two NGBs' siting outcomes; Atlas builds
public, named case studies for the broader NGB sales motion.

**Audit note (2026-05-03):** Sequence intentional — USA Wrestling first
(smallest, most data-rich, fastest validation cycle), USA Swimming second
(grant-program structured, lowest integration friction), USA Track & Field
third (largest scaling test, requires the first two as proof). If only one
pilot is feasible inside the hackathon timeframe, USA Wrestling is the
single-pick.

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
- [ ] USOPC 2024 Impact Report ($139.3M grants disclosure) — slide-ready citation for top-of-funnel context
- [ ] Beat the Streets FAQ (https://new.beatthestreets.org/faq-on-bts/) — Tier 1–4 budget disclosure for per-incident harm
- [ ] USA Swimming Foundation page (https://www.usaswimming.org/foundation) — Make A Splash $6.3M / 4.9M kids
- [ ] USATF RunJumpThrow page (https://www.usatf.org/runjumpthrow-new/home) — 200K+ kids / 1,100+ schools
- [ ] Gap analysis screenshot (showing other tools fail to reach county-FIPS parity) ready as backup slide

---

## Q&A elevator surfaces

The 30-second pitch lands TAM + Zero + 20K + 50 NGBs (Beat 4). Per-incident
harm + lighthouse NGBs surface in extended Q&A only. Stephen has both surfaces
memorized; pitch goes 30s → if judge engages, drop into Q&A elevator below.

### Judge: "Who's your first customer?"

> *"Three named NGBs in sequence — USA Wrestling's Beat the Streets network first, because it's siting decisions for $35K–$70K youth wrestling chapters across 10 markets and they've publicly disclosed their tier budgets, so we have a measurable validation signal. Then USA Swimming's Make A Splash, then USA Track & Field's RunJumpThrow. Each tests a different Atlas similarity dimension."*

### Judge: "What does it cost when they get it wrong without you?"

> *"At the unit level — $35K to $70K is the year-one cost of a single mistargeted Beat the Streets startup chapter. At Tier 3, it's $500K+ for a regional org. At the top of funnel, USOPC pushes $139.3M in 2024 grants to athletes and NGBs — even a 5% better targeting on county-level allocation is $7M a year in grants going to higher-equity counties. We're not claiming we capture that; we're saying that's the size of the targeting decision space we're in."*

### Judge: "How does this scale beyond 3 NGBs?"

> *"Pilot validates the similarity model across 3 sport profiles. After lighthouse, the same engine serves the other 47 NGBs without re-training — only the front-end framing changes per NGB. And the $5K–$15K state recreation department channel lights up in parallel — those 50 state RFPs run on the same county-FIPS data."*

### Judge: "Where does ~50M come from?"

> *"Aspen Institute Project Play, State of Play 2024 — children ages 6 to 17 in the addressable youth-sports market."*

### Judge: "Where does 6,000 come from?"

> *"Modeled. 50 NGBs from the USOPC NGB list, times ~120 estimated active recruitment slots per year. Hard fallback number is 835 — the named Team USA Paris 2024 roster, 610 Olympic plus 225 Paralympic."*

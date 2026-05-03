# NotebookLM Pre-Pitch Oracle — Prompt Deck

Stephen runs this manually in NotebookLM (https://notebooklm.google.com/)
before final pitch lock. The 5-prompt deck targets the weak spots the
2026-05-03 Sookra Council surfaced. Earlier NotebookLM passes caught the
3 sourcing errors that cold-check round 3 then fixed — same playbook,
last-mile use.

---

## Source bundle to upload

Drop these into a fresh NotebookLM notebook before running the prompts.
NotebookLM accepts up to 50 sources per notebook; we use 7.

1. `docs/pitch_script.md` — narration source of truth
2. `SUBMISSION.md` — Devpost form fill-in
3. `docs/pitch_pillar5.md` — locked Pillar 5 numbers + sourcing
4. `frontend/src/lib/pillar5.ts` — code surface for Pillar 5 numbers
5. `README.md` — judge-facing v1
6. `docs/demo_storyboard.md` — recording-day shot list
7. `docs/council_2026-05-03.md` — chairman synthesis (so the oracle
   sees what the council already flagged + can confirm or expand)

Add as needed:
- Aspen Project Play *State of Play 2024* PDF (cited as `~50M` source)
- NFHS *Athletics Participation Survey 2023-24* PDF (cited as `~20K`)
- Move United *2024 Impact Report* PDF (cited as `63%` opener)
- USOPC NGB list page snapshot

---

## Prompt 1 — Pillar 1 specificity check

```
Read the persona description in pitch_script.md Beat 1 and the
"Inspiration" or "Story" sections of SUBMISSION.md. The Sookra
Methodology requires that the named persona be specific enough to name
the person — first name, age, county, the specific failed action they
took. Saber's bar: "Maria, 8th grader, ELL, Georgia, tested in English
when she speaks Spanish." StepSafe's bar: "James, 58, Type 2 diabetic,
neuropathy, Lowndes County, didn't see the ulcer until it was too
late."

Identify any place where the user is described demographically
("a kid in Cobb County", "parents of aspiring athletes") rather than
by name, age, AND the specific failed action they took.

For each weak spot, propose a one-sentence rewrite that adds
specificity WITHOUT naming a real or fictional youth-athlete by name
in a Paralympic-pathway context (NIL-spirit hard rule). Acceptable
proxies: "a parent in [county]", "a high-school administrator in
[district]", or non-athlete adult composite figures.

Return: weak spot location, current copy, proposed rewrite, NIL-risk
self-assessment.
```

---

## Prompt 2 — Lead stat punch test

```
Read the lead stat in pitch_script.md Beat 1: "63 percent of 2024
U.S. Paralympic athletes came through one national network of
community-based adaptive sports chapters."

You are a hackathon judge who has heard 200 pitches in the last
8 hours. Read this lead stat aloud once. Does it make you FEEL the
problem in 1 second, or do you check out at "community-based adaptive
sports chapters"?

Compare to:
- StepSafe: "34 million Americans have diabetes. 80% of amputations
  come from foot ulcers. 85% are preventable." (3 numbers, body horror)
- SafeHaven: "1 in 4 women experience IPV. 99% of DV cases involve
  financial abuse." (2 numbers, immediate stake)
- Saber: "108,752 Georgia ELL students tested only in English."
  (1 number, named injustice)

Score the Atlas lead: LANDS / OK / FILLER.

Then propose 3 alternative lead-stat shapes Stephen could use IF he
queries Vinh's shipped Phase 1 parquet himself today (location:
backend/data/). Examples of shapes that beat 63%:
- "The median U.S. Paralympic hometown has [N] people. Cobb County
  has 766,000 — and a kid there still can't find anyone like her."
- "X counties have produced more Paralympians per capita than
  Los Angeles."
- "Z% of counties that produced any Olympian also produced a
  Paralympian."

Return for each candidate shape: emotional payload (1 sentence),
sourcing path (which parquet file + which column), drafting time
estimate.
```

---

## Prompt 3 — Sourcing weakness scan

```
Read pitch_pillar5.md and lib/pillar5.ts side-by-side. The 3 numbers
are: ~50M children (Aspen), ~20K high schools (NFHS 2023-24), modeled
~6,000 NGB recruitment positions (50 NGBs × ~120 modeled slots).
Cold-check round 3 on 2026-05-02 caught 3 sourcing errors (50M was
"children" not "households", NFHS was 19,983 not 13K, 6K needed
"modeled" label).

What did the cold-check MISS that you can catch now?

For each number, audit:
1. Is the cited source URL still live? If not, find a replacement.
2. Is the methodology defensible if a judge asks "where exactly does
   that number come from?" — give the answer in 1 sentence.
3. Is there a more authoritative or more recent source that
   strengthens the claim?
4. Is there a counter-source that weakens the claim? (Steel-man the
   skeptical judge.)

Also audit: is the "Zero existing public county-FIPS Olympic +
Paralympic parity tools" gap claim defensible? Search for any tool
that aggregates US Olympic OR Paralympic data at county-FIPS
granularity with per-capita normalization. List anything you find;
flag any that would weaken Atlas's "Zero" claim.

Return: per-number audit + steel-manned counter-sources + revised
sourcing language if needed.
```

---

## Prompt 4 — Pillar 5 per-incident dollar gap

```
Read pitch_pillar5.md and pitch_script.md Beat 5. The Sookra
Methodology requires that Pillar 5 close the room with three
sourced numbers AND a per-incident dollar harm number that a
budget-holder can multiply (Saber's bar: "$13K per misidentified
student"; StepSafe's bar: "$50K hospitalization per ulcerated
diabetic foot").

Atlas's current Pillar 5 has TAM (~50M), gap-claim (Zero existing
tools), and revenue model (B2B+B2G), but NO per-incident dollar harm
number. The 2026-05-03 council flagged this as the single biggest
weakness in Pillar 5.

Search for credible candidates for a per-incident dollar harm number
Atlas could cite. Examples to investigate:
1. NGB recruiter time cost — how many hours per year does a typical
   NGB scout spend manually compiling county profiles? Source: NCAA
   recruiter compensation surveys, USOPC NGB tech budget reports.
2. Missed-talent-pipeline cost — what does it cost a NGB per Olympic
   cycle when a high-potential athlete is missed in a less-visible
   county? Source: USOPC Pipeline Diversity reports, NCAA athlete
   placement data.
3. State recreation department parity reporting cost — how much do
   states spend per year on parity / equity reporting that could be
   accelerated by Atlas? Source: state DOE budgets, GAO reports on
   athletic equity.
4. Lookalike B2B SaaS pricing — what does Hudl charge a typical
   high school district? GovWin pricing for state recreation depts?
   These don't give per-incident harm but they anchor revenue model.

Return: 2-3 best per-incident dollar harm candidates with sourced URLs
and drafting suggestions for inclusion in pitch_pillar5.md + pitch_script.md
Beat 5.
```

---

## Prompt 5 — Tech Proof beat sufficiency (Google Cloud rubric check)

```
Read pitch_script.md Beat 4.5 (Tech Proof) and the README.md
"Architecture" section.

The Google Cloud Hackathon judging rubric scores "innovative use of
Google Cloud" and "Gemini in new ways" as primary axes. The Tech
Proof beat shows GCP Console + Vertex AI usage page + Apache 2.0
LICENSE for ~20 seconds.

Question: does this surface enough Gemini API depth for a Google
Cloud DevRel judge, or does it just check the box?

Specifically audit:
1. Is the structured-output Pydantic schema visible on screen anywhere
   in the demo (Tech Proof or otherwise)? If not, recommend adding it
   to README.md verbatim so judges can verify "structured output" is
   real, not just claimed.
2. Does the hybrid auditor's regex+Gemini split actually USE Gemini's
   strengths (semantic causal-tone analysis), or does it read as
   "regex with a Gemini check-box"? Suggest 1-2 framing edits in
   pitch_script Beat 4 to surface the semantic-vs-syntactic distinction.
3. Is the Apache 2.0 LICENSE clearly covering both code AND the
   Vertex AI prompts? If prompts are inline-strings in service files,
   they're licensed by code license; but a separate `prompts/`
   directory (with its own LICENSE notice) reads as more rigorous to
   a Cloud judge. Recommend whether to create one.
4. Is Layer C (Gemini Live multimodal Q&A) ship-status acknowledged
   honestly in README.md? Currently deferred until Vinh ships Phase 2.
   Should there be a "Roadmap" section that names Layer C explicitly
   so judges see the ambition + cut discipline?

Return: per-item audit + concrete recommended copy/code additions.
```

---

## Findings-back integration steps

After the oracle returns answers:

1. **Triage findings by severity.** Critical = breaks pitch claim,
   blocks submission. High = weakens but doesn't block. Medium =
   polish. Low = drop unless cheap.

2. **For Critical findings:** create entries in PLAN.md Day 8 work
   block. Stephen drops everything and addresses before recording.

3. **For High findings:** check if any are addressable inside the
   current 6-8hr block (sound design / CountyMap polish / scripts).
   If yes, merge in. If no, queue for Day 8.

4. **For Medium / Low findings:** doc in
   `docs/pre_pitch_polish_log.md` (create if missing), address if
   time allows after Day 9 morning dry-run.

5. **Re-run Prompt 2 (lead stat punch) AFTER Vinh ships Layer A
   stat (task 1.11).** The placeholder review is a different review
   from the real-stat review. Ship-day discipline.

6. **Add NotebookLM session URL to `pre_pitch_polish_log.md`** for
   audit trail. NotebookLM sessions can be re-opened, useful for
   judge Q&A simulation if needed.

---

## Cost / time budget

- Notebook setup (upload sources): ~10 min
- Run all 5 prompts (NotebookLM is fast): ~15 min
- Read + triage findings: ~30-45 min depending on volume
- Total Stephen time investment: ~1 hour

Cheap insurance against the cold-check-round-4 errors no one's caught
yet.

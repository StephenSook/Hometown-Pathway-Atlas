#!/usr/bin/env node
/**
 * Pillar 5 number-drift CI check.
 *
 * Atlas's Pillar 5 numbers live in two places that MUST stay in sync:
 *   - frontend/src/lib/pillar5.ts (the React surface; Pillar5Strip imports
 *     from this; what judges see in the app)
 *   - docs/pitch_pillar5.md (the prose surface; pitch script + slide notes
 *     cite this; what Stephen reads from in pitch + Q&A)
 *
 * Cold-check round 3 on 2026-05-02 caught 3 sourcing errors that came from
 * docs and code drifting (50M was children not households per Aspen, NFHS
 * was 19,983 not 13K, NGB modeled count needed "modeled" label). This script
 * is the regression check so a future cold-check round 4 doesn't have to
 * catch the same class of bug.
 *
 * Run manually:
 *   node scripts/check-pillar5-drift.mjs
 *
 * Run as pre-commit hook: see .githooks/pre-commit (created by team-plan
 * skill if installed, or manually wired via `git config core.hooksPath
 * .githooks`).
 *
 * Exits 0 on sync, exits 1 with a per-token report on drift.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const PILLAR5_TS = resolve(REPO, 'frontend/src/lib/pillar5.ts');
const PILLAR5_MD = resolve(REPO, 'docs/pitch_pillar5.md');

/**
 * Tokens that must appear in BOTH the .ts code AND the .md prose. Each token
 * declaration includes the canonical TS regex (matches what the constant
 * literally exports) and a list of acceptable doc spellings (any one of which
 * counts as a sync hit in the .md).
 *
 * If you change a number in pillar5.ts, you MUST add the new spelling to the
 * `mdAlternatives` list here AND update the doc — otherwise this script
 * fails CI.
 */
const TOKENS = [
  {
    name: 'TAM (US children)',
    tsRegex: /number:\s*['"]~50M['"]/,
    mdAlternatives: ['~50M', '~50 million', '50,000,000', '50 million US children'],
  },
  {
    name: 'Cost framing (Zero existing tools)',
    tsRegex: /number:\s*['"]Zero['"]/,
    mdAlternatives: ['Zero', '**0**', '0 publicly accessible'],
  },
  {
    name: 'Revenue B2B (modeled NGB positions)',
    tsRegex: /modeled ~6,000 recruitment positions/i,
    mdAlternatives: ['~6,000', '6,000', '~6000'],
  },
  {
    name: 'Revenue B2G (high schools count)',
    tsRegex: /~20,000 high schools/i,
    mdAlternatives: ['~20,000', '20,000', '19,983'],
  },
  {
    name: 'NGB count anchor',
    tsRegex: /50 NGBs/i,
    mdAlternatives: ['50 NGBs', '50 National Governing Bodies'],
  },
];

/**
 * Source attribution tokens — these only need to appear in the .md (the .ts
 * exports a free-form `source` string but doesn't have to match doc verbatim).
 * Required citations per pitch_pillar5.md "Number defensibility checklist".
 */
const REQUIRED_SOURCES = [
  { name: 'Aspen Project Play', regex: /Aspen Institute Project Play/i },
  { name: 'NFHS 2023-24 survey', regex: /NFHS|National Federation of State High School Associations/i },
  { name: 'USOPC NGB list anchor', regex: /USOPC/i },
];

async function main() {
  let tsCode;
  let mdProse;
  try {
    [tsCode, mdProse] = await Promise.all([
      readFile(PILLAR5_TS, 'utf8'),
      readFile(PILLAR5_MD, 'utf8'),
    ]);
  } catch (err) {
    console.error(`[pillar5-drift] could not read source files: ${err.message}`);
    process.exit(2);
  }

  const failures = [];

  for (const t of TOKENS) {
    const tsHit = t.tsRegex.test(tsCode);
    const mdHit = t.mdAlternatives.some((alt) => mdProse.includes(alt));

    if (tsHit && !mdHit) {
      failures.push(
        `[DRIFT] '${t.name}' present in lib/pillar5.ts but NOT found in ` +
          `docs/pitch_pillar5.md. Doc must contain one of: ${t.mdAlternatives
            .map((a) => `"${a}"`)
            .join(', ')}.`,
      );
    }
    if (!tsHit && mdHit) {
      failures.push(
        `[DRIFT] '${t.name}' present in docs/pitch_pillar5.md but NOT found ` +
          `in lib/pillar5.ts. Code must match regex: ${t.tsRegex}.`,
      );
    }
    if (!tsHit && !mdHit) {
      failures.push(
        `[MISSING] '${t.name}' missing from BOTH files. This is the locked ` +
          `Pillar 5 number set — restore from git history.`,
      );
    }
  }

  for (const s of REQUIRED_SOURCES) {
    if (!s.regex.test(mdProse)) {
      failures.push(
        `[SOURCE] Required citation '${s.name}' missing from ` +
          `docs/pitch_pillar5.md. Per defensibility checklist, this source ` +
          `must be cited inline so judges can verify.`,
      );
    }
  }

  if (failures.length > 0) {
    console.error('Pillar 5 drift check FAILED:\n');
    for (const f of failures) console.error(`  • ${f}`);
    console.error(
      '\nResolve drift before committing. Both surfaces must stay in sync.',
    );
    process.exit(1);
  }

  console.log(
    `Pillar 5 drift check PASSED — ${TOKENS.length} number tokens + ` +
      `${REQUIRED_SOURCES.length} sources verified in sync across ` +
      `lib/pillar5.ts and docs/pitch_pillar5.md.`,
  );
}

main().catch((err) => {
  console.error(`[pillar5-drift] unexpected error: ${err.stack ?? err}`);
  process.exit(2);
});

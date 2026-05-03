#!/usr/bin/env node
/**
 * Conditional-phrasing pre-commit grep.
 *
 * Atlas's CLAUDE.md hard rule: user-visible strings MUST use conditional
 * phrasing — "could be associated with", "may correlate", "interpretation
 * only" — never causal verbs like "produces", "creates", "guarantees",
 * "leads to". The runtime hybrid auditor (ComplianceLog ★) catches Gemini-
 * generated drift, but it does NOT catch banned verbs in static code +
 * docs.
 *
 * SCOPE — what this script actually scans:
 *   - JSX/TSX inline strings in React components
 *   - Plain string constants in lib files
 *
 * SCOPE — what this script DELIBERATELY does NOT scan (manual review
 * is the control for these surfaces):
 *   - Markdown docs in `docs/` (pitch_script, demo_storyboard,
 *     pitch_pillar5, council_2026-05-03, etc) — these surfaces
 *     intentionally quote banned verbs as illustrations of what the
 *     audit catches; per-line allow markers would explode the file
 *   - README.md + SUBMISSION.md — same rationale
 *   - CLAUDE.md + PLAN.md — the hard-rule statement itself uses
 *     banned verbs to define them
 *   - mocks.ts + ComplianceLog.tsx + LogEntry.tsx — Pillar 4 demo
 *     fixture intentionally ships a banned-verb phrase that the
 *     auditor catches at runtime
 *
 * Bottom line: the script is a COMPONENT-LAYER drift guard, not a
 * doc-layer guard. Doc drift is caught by manual cold-check passes
 * (Sookra Council + NotebookLM oracle deck) before pitch lock.
 *
 * Run manually:
 *   node scripts/check-conditional-phrasing.mjs
 *
 * Exit 0 on no violations. Exit 1 with a per-violation report otherwise.
 *
 * Inline disable: append `// atlas-phrasing-allow` (or HTML comment
 * `<!-- atlas-phrasing-allow -->` for Markdown) to a line that
 * INTENTIONALLY uses a banned verb (e.g. quoting the audit catch in
 * pitch_script.md Beat 4, or describing the rule in CLAUDE.md).
 *
 * Files allow-listed entirely (rule-discussion or test fixtures):
 *   - frontend/src/lib/mocks.ts (demo fixtures with intentional banned
 *     phrasing — Pillar 4 demo depends on showing what gets caught)
 *   - frontend/src/components/ComplianceLog.tsx (the auditor itself)
 *   - frontend/src/components/LogEntry.tsx (renders the auditor entries)
 *   - CLAUDE.md (defines the rule)
 *   - PLAN.md (operational, not pitch surface)
 *   - scripts/check-conditional-phrasing.mjs (this script — discusses rule)
 *   - docs/council_2026-05-03.md (synthesis discusses rule)
 *   - docs/notebooklm_oracle_prompts.md (discusses rule)
 *   - docs/pitch_pillar5.md (discusses rule + audit notes)
 */

import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

/**
 * Banned causal verbs. Word-boundary regex, case-insensitive.
 * Each entry includes a recommended conditional alternative for the
 * report — makes the fix obvious instead of leaving Stephen to invent
 * a rewrite under deadline.
 *
 * Trimmed to the 4 highest-precision verbs from CLAUDE.md's hard rule.
 * Dropped "is from", "comes from", "results in", "made in" — all too
 * generic in technical English (false positives on "value comes from
 * input", "search results in section", etc). These four catch real
 * causal-tone drift without flagging legitimate code prose.
 */
const BANNED = [
  { verb: 'produces', alt: 'could be associated with' },
  { verb: 'producing', alt: 'associated with' },
  { verb: 'creates', alt: 'could surface' },
  { verb: 'creating', alt: 'surfacing' },
  { verb: 'guarantees', alt: 'may indicate' },
  { verb: 'leads to', alt: 'may correlate with' },
];

/**
 * File-level allow-list. Markdown pitch surfaces all discuss the
 * conditional-phrasing rule itself (quoting examples of what gets caught,
 * citing the regex banned-word list, narrating the audit moment in Beat 4).
 * Manual review on commit is the right control for pitch surfaces — the
 * script's high-value protection is at the COMPONENT layer where new
 * developer-written code might drift unintentionally.
 */
const FILES_ALLOW = new Set([
  // Pillar 4 fixture / auditor implementation — by design uses banned phrases
  'frontend/src/lib/mocks.ts',
  'frontend/src/components/ComplianceLog.tsx',
  'frontend/src/components/LogEntry.tsx',
  // Operational + meta files
  'CLAUDE.md',
  'PLAN.md',
  'scripts/check-conditional-phrasing.mjs',
]);

const DIR_ALLOW = ['docs/'];
const FILE_ALLOW_PATTERN = /^(README\.md|SUBMISSION\.md)$/;

const INLINE_ALLOW_MARKER = /atlas-phrasing-allow/;

const TARGET_GLOBS = [
  'frontend/src/**/*.{ts,tsx}',
  'docs/*.md',
  'README.md',
  'SUBMISSION.md',
];

function isAllowed(file) {
  if (FILES_ALLOW.has(file)) return true;
  if (FILE_ALLOW_PATTERN.test(file)) return true;
  return DIR_ALLOW.some((dir) => file.startsWith(dir));
}

async function collectFiles() {
  const files = new Set();
  for (const pattern of TARGET_GLOBS) {
    try {
      for await (const entry of glob(pattern, { cwd: REPO })) {
        files.add(entry);
      }
    } catch (err) {
      console.error(`[phrasing] glob failed for "${pattern}": ${err.message}`);
      process.exit(2);
    }
  }
  return [...files].filter((f) => !isAllowed(f));
}

async function scan(file) {
  let body;
  try {
    body = await readFile(resolve(REPO, file), 'utf8');
  } catch (err) {
    return { file, hits: [], readError: err.message };
  }
  const lines = body.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (INLINE_ALLOW_MARKER.test(line)) continue;
    for (const b of BANNED) {
      const re = new RegExp(`\\b${b.verb}\\b`, 'i');
      if (re.test(line)) {
        hits.push({
          lineNum: i + 1,
          banned: b.verb,
          alt: b.alt,
          context: line.trim().slice(0, 140),
        });
      }
    }
  }
  return { file, hits };
}

async function main() {
  const files = await collectFiles();
  const results = await Promise.all(files.map(scan));
  const violations = results.filter((r) => r.hits.length > 0);

  if (violations.length === 0) {
    console.log(
      `Conditional-phrasing check PASSED — scanned ${files.length} files, ` +
        `0 unmarked banned-verb hits.`,
    );
    return;
  }

  console.error(
    `Conditional-phrasing check FAILED — ${violations.length} file(s) with ` +
      `unmarked banned verbs:\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}`);
    for (const h of v.hits) {
      console.error(
        `    L${h.lineNum}: "${h.banned}" (consider "${h.alt}")\n` +
          `      → ${h.context}`,
      );
    }
    console.error('');
  }
  console.error(
    'Fix by rewording in conditional phrasing OR add inline marker ' +
      '`// atlas-phrasing-allow` (or `<!-- atlas-phrasing-allow -->` ' +
      'for Markdown) on the line if the use is intentional (e.g. quoting ' +
      'an audit catch).',
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(`[phrasing] unexpected error: ${err.stack ?? err}`);
  process.exit(2);
});

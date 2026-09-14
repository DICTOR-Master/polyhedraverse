/**
 * Stage 2 acceptance: RvcmgState.id must be documented as independent of
 * vertices.length (spec V7 / §5) at the type level (see types.ts's own
 * comment) AND enforced by a static scan that flags any code comparing
 * two states' identity via `vertices.length` alone -- a real, easy
 * mistake ("same count => same state") the spec explicitly rules out.
 * Not a hard compiler-level guarantee (TypeScript can't express "these
 * two numbers must never be compared for this purpose"), so this is a
 * lint-style scan over the rvcmg module's own source, re-run by every
 * later stage's `npm run test:rvcmg` pass -- catches the mistake as soon
 * as it's introduced, not just at this stage.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const RVCMG_DIR = join(__dirname);

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

// Flags a line that compares TWO DIFFERENT things' `.vertices.length`
// against each other -- the actual "same count implies same state"
// mistake spec V7 rules out. Deliberately does NOT flag a single
// `.vertices.length === <number>` check (e.g. "does this state have
// exactly 6 vertices?", a legitimate, different question).
const SUSPICIOUS_PATTERN = /\.vertices\.length\s*===\s*[a-zA-Z0-9_.]*\.vertices\.length/;

const flagged: string[] = [];
for (const file of listTsFiles(RVCMG_DIR)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (SUSPICIOUS_PATTERN.test(line)) {
      flagged.push(`${file}:${i + 1}: ${line.trim()}`);
    }
  });
}

if (flagged.length > 0) {
  console.log('Flagged for review (state compared by vertex count alone, spec V7):');
  for (const f of flagged) console.log(`  ${f}`);
}
check('no code compares two RvcmgStates by vertices.length alone (spec V7 / §5)', flagged.length === 0);

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

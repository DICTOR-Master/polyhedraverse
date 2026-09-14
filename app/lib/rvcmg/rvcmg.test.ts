/**
 * RVCMG Stage 0 scaffold test. This project has no Jest/Vitest runner —
 * every other module's tests are plain `tsx`-executed assertion scripts
 * (see scripts/verify-graph.ts's own `check()`/`failures` pattern) — so
 * this file follows that same convention rather than introducing a new
 * test framework for one feature. Empty for Stage 0; grows alongside
 * later stages.
 */

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}
void check;

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

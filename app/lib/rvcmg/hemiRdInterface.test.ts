import { HEMI_RD_INTERFACE, validateHemiRdInterface } from './hemiRdInterface';
import { dist } from '../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

// --- Stage 1 acceptance (RVCMG implementation plan) ---

check('exactly 6 vertices', HEMI_RD_INTERFACE.length === 6);

const distinct = new Set(HEMI_RD_INTERFACE.map((v) => v.map((c) => c.toFixed(9)).join(',')));
check('all 6 vertices are distinct (no coincident pair)', distinct.size === 6);

const n = HEMI_RD_INTERFACE.length;
const edgeLengths = HEMI_RD_INTERFACE.map((v, i) => dist(v, HEMI_RD_INTERFACE[(i + 1) % n]));
check('every consecutive pair forms a real (nonzero-length) edge', edgeLengths.every((d) => d > 1e-9));

const report = validateHemiRdInterface();
check(`validateHemiRdInterface reports no problems: ${JSON.stringify(report.problems)}`, report.problems.length === 0);

// Not a false planarity assumption in general (the validator doesn't gate
// on it), but this SPECIFIC construction is known to be planar -- confirm
// it, don't just hope report.problems would have caught a regression.
check('this construction is genuinely planar (validator would have flagged otherwise)', report.problems.length === 0);

// Guards spec §24's own explicit requirement: this must NOT be a regular
// hexagon. A regular hexagon has all 6 edges equal; this real interface
// has 4 short + 2 long (opposite) edges -- assert the actual measured
// spread, not just "not exactly 1 edge length", so a future accidental
// simplification back toward a regular hexagon fails loudly.
const sorted = [...edgeLengths].sort((a, b) => a - b);
check('NOT a regular hexagon: at least two distinct edge lengths present', sorted[0] < sorted[5] - 1e-6);
check('exactly 4 short + 2 long edges (the real RD cross-section, not 6 equal)', Math.abs(sorted[3] - sorted[0]) < 1e-6 && Math.abs(sorted[5] - sorted[4]) < 1e-6 && sorted[4] - sorted[3] > 1e-6);

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

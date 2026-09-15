/**
 * Real verification for the graded-pyramid family (app/lib/polyhedra/
 * gradedPyramids.ts + miscellaneous.ts): per-grade shape correctness
 * (validateGradedPyramid) across all THREE currently-supported base
 * shapes (triangular/square/pentagonal, matching D4/J1/J2), grade 2
 * exactly reproducing each of those existing pieces, grade 1 landing
 * on exactly half of grade 2's own height for EVERY base (not just the
 * one it was originally derived from), and the degenerate limit
 * (360/n degrees) being real and correctly rejected.
 *
 * This script's own n=4 (square) checks are exactly what would have
 * caught a real bug this project shipped and fixed: an earlier version
 * hard-coded grade 1's triangular-base-derived angle (90°) as a fixed
 * number reused for every base, which crashed outright for a square
 * base (90° is precisely n=4's own degenerate limit).
 */
import { buildGradedPyramid, validateGradedPyramid, apexHeightForAngle, gradeApexAngleDeg, degenerateApexAngleDeg, regularPolygonCircumradius, GRADE_NUMBERS } from '../app/lib/polyhedra/gradedPyramids';
import { GRADED_PYRAMID_ADDITIONS } from '../app/lib/polyhedra/miscellaneous';
import { POLYHEDRA } from '../app/lib/polyhedra/index';
import { dist } from '../app/lib/polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const BASES = [
  { n: 3, label: 'triangular', standardId: 'D4' },
  { n: 4, label: 'square', standardId: 'J1_SQUARE_PYRAMID' },
  { n: 5, label: 'pentagonal', standardId: 'J2_PENTAGONAL_PYRAMID' },
];

for (const base of BASES) {
  for (const grade of GRADE_NUMBERS) {
    const angle = gradeApexAngleDeg(base.n, grade);
    const spec = buildGradedPyramid(base.n, angle, `TEST_${base.label}_G${grade}`, 'x');
    const problems = validateGradedPyramid(spec, base.n, angle);
    check(`${base.label} base grade ${grade} (apex angle ${angle.toFixed(4)}°) validates cleanly (${JSON.stringify(problems)})`, problems.length === 0);
  }

  const heights = GRADE_NUMBERS.map((g) => apexHeightForAngle(base.n, gradeApexAngleDeg(base.n, g)));
  check(`${base.label} base: height increases monotonically as grade increases from 1 to 4`, heights[0] < heights[1] && heights[1] < heights[2] && heights[2] < heights[3]);
  check(`${base.label} base: grade 1 (low) is exactly half of grade 2 (standard) height`, Math.abs(heights[0] - heights[1] / 2) < 1e-9);

  const grade2Angle = gradeApexAngleDeg(base.n, 2);
  const grade2Spec = buildGradedPyramid(base.n, grade2Angle, `TEST_${base.label}_G2`, 'x');
  const standard = POLYHEDRA[base.standardId];
  check(`${base.label} base grade 2 exactly reproduces the existing ${base.standardId}`, grade2Spec.vertices.every((v, i) => dist(v, standard.vertices[i]) < 1e-9));
}

// --- The real registry entries (pyramids/index.ts) build without throwing and are internally consistent ---
// Scoped to graded pyramids only -- the Miscellaneous family's OTHER
// sub-group (rvcmg-connectors) has its own completely different shape
// (a hex/target-polygon taper, not a base+apex pyramid) and its own
// dedicated verify:rvcmg-solids script.
check('GRADED_PYRAMID_ADDITIONS has all 12 entries (3 bases x 4 grades)', Object.keys(GRADED_PYRAMID_ADDITIONS).length === 12);
for (const [id, spec] of Object.entries(GRADED_PYRAMID_ADDITIONS)) {
  const baseFaceSize = spec.faces[0].length; // faces[0] is always the base, by buildGradedPyramid's own construction
  check(`registry entry ${id}: vertex count matches base size + 1 apex`, spec.vertices.length === baseFaceSize + 1);
  check(`registry entry ${id}: face count matches base + one lateral triangle per base edge`, spec.faces.length === baseFaceSize + 1 && spec.faces.length === spec.faceCount);
}

check('degenerate limit for a triangular base (n=3) is exactly 120°', degenerateApexAngleDeg(3) === 120);
check('degenerate limit for a square base (n=4) is exactly 90° -- this is the real bug: grade 1 was once hard-coded to exactly this value', degenerateApexAngleDeg(4) === 90);
check('degenerate limit for a hexagonal base (n=6) is exactly 60° -- proves a regular hexagonal pyramid with equilateral sides is geometrically impossible', degenerateApexAngleDeg(6) === 60);

let threwAtLimit = false;
try {
  apexHeightForAngle(4, 90);
} catch {
  threwAtLimit = true;
}
check('requesting exactly the square base\'s own degenerate angle (90°) throws rather than returning a fake height', threwAtLimit);

let threwBeyondLimit = false;
try {
  apexHeightForAngle(6, 60); // the "regular hexagonal pyramid" case -- must be rejected, not silently built wrong
} catch {
  threwBeyondLimit = true;
}
check('a regular-faced hexagonal pyramid (60° apex angle, n=6) is correctly rejected as impossible', threwBeyondLimit);
check('height approaches 0 as apex angle approaches the degenerate limit', apexHeightForAngle(3, 119.999) < 0.01);

check('triangular base circumradius matches the known formula edge/sqrt(3)', Math.abs(regularPolygonCircumradius(3) - 1 / Math.sqrt(3)) < 1e-9);

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

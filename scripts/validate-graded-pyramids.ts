/**
 * Real verification for the graded-pyramid prototype (app/lib/polyhedra/
 * gradedPyramids.ts): per-grade shape correctness (validateGradedPyramid)
 * PLUS the specific claims that construction's own header comment makes
 * -- grade 2 (standard) exactly reproduces the existing D4, height
 * increases monotonically as apex angle decreases across grades 1-4,
 * and the degenerate limit (360/n degrees) is real and correctly
 * rejected, not just asserted.
 */
import { buildGradedPyramid, validateGradedPyramid, apexHeightForAngle, degenerateApexAngleDeg, regularPolygonCircumradius, DEFAULT_GRADES } from '../app/lib/polyhedra/gradedPyramids';
import { POLYHEDRA } from '../app/lib/polyhedra/index';
import { dist } from '../app/lib/polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

for (const g of DEFAULT_GRADES) {
  const spec = buildGradedPyramid(3, g.apexAngleDeg, `TRI_PYR_G${g.grade}`, `triangular pyramid grade ${g.grade}`);
  const problems = validateGradedPyramid(spec, 3, g.apexAngleDeg);
  check(`grade ${g.grade} (apex angle ${g.apexAngleDeg}°) validates cleanly (${JSON.stringify(problems)})`, problems.length === 0);
}

const grade2 = buildGradedPyramid(3, 60, 'TRI_PYR_G2', 'x');
const d4 = POLYHEDRA.D4;
check('grade 2 (standard, triangular base) exactly reproduces D4 (regular tetrahedron)', grade2.vertices.every((v, i) => dist(v, d4.vertices[i]) < 1e-9));

const heights = DEFAULT_GRADES.map((g) => apexHeightForAngle(3, g.apexAngleDeg));
check('height increases monotonically as apex angle decreases (grade 1 -> 4)', heights[0] < heights[1] && heights[1] < heights[2] && heights[2] < heights[3]);
check('grade 1 (low) is exactly half of grade 2 (standard) height, as intended', Math.abs(heights[0] - heights[1] / 2) < 1e-9);

check('degenerate limit for a triangular base (n=3) is exactly 120°', degenerateApexAngleDeg(3) === 120);
check('degenerate limit for a hexagonal base (n=6) is exactly 60° -- proves a regular hexagonal pyramid with equilateral sides is geometrically impossible', degenerateApexAngleDeg(6) === 60);

let threwAtLimit = false;
try {
  apexHeightForAngle(3, 120);
} catch {
  threwAtLimit = true;
}
check('requesting exactly the degenerate angle throws rather than returning a fake height', threwAtLimit);

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

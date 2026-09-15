import { deriveGoldenRhombusToRdH, GOLDEN_RATIO_MEASURED, RHOMBIC_TRIACONTAHEDRON_EDGE_MEASURED } from './goldenRhombusToRdH';
import { separate } from '../separate';
import { statesApproximatelyEqual } from '../types';
import { dist, type Vec3 } from '../../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

check('the measured RT rhombus diagonal ratio really is phi (not assumed)', Math.abs(GOLDEN_RATIO_MEASURED - (1 + Math.sqrt(5)) / 2) < 1e-9);

const result = deriveGoldenRhombusToRdH();
check(`the whole derivation passes Stage 7 verification with zero problems (${JSON.stringify(result.problems)})`, result.problems.length === 0);
check('exactly 2 coalesce steps (6 -> 5 -> 4)', result.ops.length === 2 && result.states.length === 3);

const final = result.states[2];
check('final state has exactly 4 vertices', final.vertices.length === 4);

const edgeLens = final.vertices.map((v, i) => dist(v.pos, final.vertices[(i + 1) % 4].pos));
check(
  'all 4 edges exactly match the REAL rhombic triacontahedron face edge length (not an assumed unit edge -- a real bug this project shipped and caught)',
  edgeLens.every((l) => Math.abs(l - RHOMBIC_TRIACONTAHEDRON_EDGE_MEASURED) < 1e-9),
);

const diag1 = dist(final.vertices[0].pos, final.vertices[2].pos);
const diag2 = dist(final.vertices[1].pos, final.vertices[3].pos);
check('the two diagonals are genuinely DIFFERENT lengths (a real rhombus, not accidentally a square)', Math.abs(diag1 - diag2) > 1e-6);
check('the diagonal ratio matches the measured golden ratio exactly', Math.abs(Math.max(diag1, diag2) / Math.min(diag1, diag2) - GOLDEN_RATIO_MEASURED) < 1e-9);

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const d1v = sub(final.vertices[2].pos, final.vertices[0].pos);
const d2v = sub(final.vertices[3].pos, final.vertices[1].pos);
const cosBetween = dot(d1v, d2v) / (Math.hypot(...d1v) * Math.hypot(...d2v));
check('the two diagonals are perpendicular (a defining property of any rhombus)', Math.abs(cosBetween) < 1e-9);

// --- Derivation-reversibility through the real (non-identity) deformation (a math check on the derivation itself, not a claim about the physical piece attaching/detaching) ---
let back = final;
for (let i = result.ops.length - 1; i >= 0; i--) {
  const op = result.ops[i];
  const before = result.states[i];
  const mergedId = back.vertices.find((v) => v.sourceIds.length === 2 && v.sourceIds.includes(op.coalescedPair[0]) && v.sourceIds.includes(op.coalescedPair[1]))!.id;
  const posA = before.vertices.find((v) => v.id === op.coalescedPair[0])!.pos;
  const posB = before.vertices.find((v) => v.id === op.coalescedPair[1])!.pos;
  const TOL = 1e-6;
  const inverseDeformation = (p: Vec3): Vec3 => {
    for (const v of before.vertices) {
      if (v.id === op.coalescedPair[0] || v.id === op.coalescedPair[1]) continue;
      if (dist(op.deformation(v.pos), p) < TOL) return v.pos;
    }
    return p;
  };
  back = separate(back, mergedId, [posA, posB], inverseDeformation);
}
check('separating both steps in reverse reproduces the original hemi-RD hex interface exactly', statesApproximatelyEqual(back, result.states[0]));

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

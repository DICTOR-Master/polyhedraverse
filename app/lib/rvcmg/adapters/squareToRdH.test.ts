import { deriveSquareToRdH } from './squareToRdH';
import { separate } from '../separate';
import { statesApproximatelyEqual } from '../types';
import { dist, type Vec3 } from '../../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const result = deriveSquareToRdH();
check(`the whole derivation passes Stage 7 verification with zero problems (${JSON.stringify(result.problems)})`, result.problems.length === 0);
check('exactly 2 coalesce steps (6 -> 5 -> 4)', result.ops.length === 2 && result.states.length === 3);

const final = result.states[2];
check('final state has exactly 4 vertices', final.vertices.length === 4);
check('final state still has two untouched original vertices (v1, v4)', final.vertices.some((v) => v.id === 'v1') && final.vertices.some((v) => v.id === 'v4'));

const edgeLens = final.vertices.map((v, i) => dist(v.pos, final.vertices[(i + 1) % 4].pos));
check('all 4 edges are exactly unit length (matches a unit-edge cube face)', edgeLens.every((l) => Math.abs(l - 1) < 1e-9));

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const e1 = sub(final.vertices[1].pos, final.vertices[0].pos);
const e2 = sub(final.vertices[3].pos, final.vertices[0].pos);
const cosAngle = dot(e1, e2) / (Math.hypot(...e1) * Math.hypot(...e2));
check('corners are real 90° angles (a genuine square, not a rhombus)', Math.abs(cosAngle) < 1e-9);

// --- Derivation-reversibility, including the non-identity deformation step (a math check on the derivation itself, not a claim about the physical piece attaching/detaching) ---
let back = final;
for (let i = result.ops.length - 1; i >= 0; i--) {
  const op = result.ops[i];
  const before = result.states[i];
  const mergedId = back.vertices.find((v) => v.sourceIds.length === 2 && v.sourceIds.includes(op.coalescedPair[0]) && v.sourceIds.includes(op.coalescedPair[1]))!.id;
  const posA = before.vertices.find((v) => v.id === op.coalescedPair[0])!.pos;
  const posB = before.vertices.find((v) => v.id === op.coalescedPair[1])!.pos;
  // Real functional inverse of the forward deformation, not just
  // identity: step2's deformation moved v1/v4 for real, so undoing it
  // must move them back, matched by (approximate) position since the
  // stored op's own deformation is position-keyed, not id-keyed.
  const TOL = 1e-6;
  const inverseDeformation = (p: Vec3): Vec3 => {
    // Only ever search among vertices the REAL coalesce() call actually
    // ran the deformation over ("every other vertex," never the pair
    // being merged this step) — calling deformation on the merged pair
    // itself isn't a scenario the real forward call exercises, and this
    // specific deformation throws on an unrecognized position.
    for (const v of before.vertices) {
      if (v.id === op.coalescedPair[0] || v.id === op.coalescedPair[1]) continue;
      const forwarded = op.deformation(v.pos);
      if (dist(forwarded, p) < TOL) return v.pos;
    }
    return p; // untouched by this step's deformation
  };
  back = separate(back, mergedId, [posA, posB], inverseDeformation);
}
check('separating both steps in reverse (with the real inverse deformation) reproduces the original hemi-RD hex interface exactly', statesApproximatelyEqual(back, result.states[0]));

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

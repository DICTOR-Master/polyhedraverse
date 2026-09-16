import { derivePentagonToUHex } from './pentagonToUHex';
import { separate } from '../separate';
import { statesApproximatelyEqual } from '../types';
import { dist, type Vec3 } from '../../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const result = derivePentagonToUHex();
check(`the whole derivation passes Stage 7 verification with zero problems (${JSON.stringify(result.problems)})`, result.problems.length === 0);
check('exactly 1 coalesce step (6 -> 5)', result.ops.length === 1 && result.states.length === 2);

const final = result.states[1];
check('final state has exactly 5 vertices', final.vertices.length === 5);
check('4 of the 5 are untouched original vertices (v1, v2, v5, v6)', ['v1', 'v2', 'v5', 'v6'].every((id) => final.vertices.some((v) => v.id === id)));

const edgeLens = final.vertices.map((v, i) => dist(v.pos, final.vertices[(i + 1) % 5].pos));
check('all 5 edges are exactly unit length (matches a unit-edge dodecahedron face)', edgeLens.every((l) => Math.abs(l - 1) < 1e-9));

const centroid: Vec3 = [0, 0, 0];
for (const v of final.vertices) {
  centroid[0] += v.pos[0] / 5;
  centroid[1] += v.pos[1] / 5;
  centroid[2] += v.pos[2] / 5;
}
const radii = final.vertices.map((v) => dist(v.pos, centroid));
check('all 5 vertices are equidistant from the centroid (a real regular pentagon, not just equilateral)', Math.max(...radii) - Math.min(...radii) < 1e-9);

const op = result.ops[0];
const before = result.states[0];
const mergedId = final.vertices.find((v) => v.sourceIds.length === 2)!.id;
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
const back = separate(final, mergedId, [posA, posB], inverseDeformation);
check('separating the single step (with the real inverse deformation) reproduces the original universal hex interface exactly', statesApproximatelyEqual(back, before));

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

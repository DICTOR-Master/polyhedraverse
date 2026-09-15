import { deriveTriangleToRdH, RD_EDGE_LENGTH, hemiRdStartState } from './triangleToRdH';
import { HEMI_RD_INTERFACE } from '../hemiRdInterface';
import { POLYHEDRA } from '../../polyhedra/index';
import { separate } from '../separate';
import { statesApproximatelyEqual } from '../types';
import { dist } from '../../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

check('RD edge length measured (not hand-copied) is sqrt(3)/2', Math.abs(RD_EDGE_LENGTH - Math.sqrt(3) / 2) < 1e-12);
const [rdI, rdJ] = POLYHEDRA.RHOMBIC_DODECAHEDRON.edges[0];
const rdEdgeNative = dist(POLYHEDRA.RHOMBIC_DODECAHEDRON.vertices[rdI], POLYHEDRA.RHOMBIC_DODECAHEDRON.vertices[rdJ]);
check('a real RD edge measures exactly RD_EDGE_LENGTH (no rescaling involved)', Math.abs(rdEdgeNative - RD_EDGE_LENGTH) < 1e-12);
check(
  "hemiRdStartState()'s own vertices sit at RD's real, native scale -- HEMI_RD_INTERFACE unchanged, not rescaled (2026-09-15 correction: an earlier version rescaled this to an artificial unit-edge size, which broke RD-Hemi attaching to the real, already-registered RHOMBIC_DODECAHEDRON -- direct user report)",
  hemiRdStartState().vertices.every((v, i) => dist(v.pos, HEMI_RD_INTERFACE[i]) < 1e-12),
);

const result = deriveTriangleToRdH();
check(`the whole derivation passes Stage 7 verification with zero problems (${JSON.stringify(result.problems)})`, result.problems.length === 0);
check('exactly 3 coalesce steps (6 -> 5 -> 4 -> 3)', result.ops.length === 3 && result.states.length === 4);
check('final state has exactly 3 vertices', result.states[3].vertices.length === 3);

const finalTriangle = result.states[3];
const edgeLens = finalTriangle.vertices.map((v, i) => dist(v.pos, finalTriangle.vertices[(i + 1) % 3].pos));
check('final triangle is equilateral with edge length exactly 1 (matches a unit-edge tetrahedron/octahedron face)', edgeLens.every((l) => Math.abs(l - 1) < 1e-9));

// --- Derivation-reversibility: undoing all 3 steps in reverse returns to the real hemi-RD hex interface (a math check on the derivation itself, not a claim about the physical piece attaching/detaching) ---
let back = finalTriangle;
for (let i = result.ops.length - 1; i >= 0; i--) {
  const op = result.ops[i];
  const before = result.states[i];
  const mergedId = back.vertices.find((v) => v.sourceIds.length === 2 && v.sourceIds.includes(op.coalescedPair[0]) && v.sourceIds.includes(op.coalescedPair[1]))!.id;
  const posA = before.vertices.find((v) => v.id === op.coalescedPair[0])!.pos;
  const posB = before.vertices.find((v) => v.id === op.coalescedPair[1])!.pos;
  back = separate(back, mergedId, [posA, posB]);
}
check('separating all 3 steps in reverse reproduces the original hemi-RD hex interface exactly', statesApproximatelyEqual(back, result.states[0]));

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

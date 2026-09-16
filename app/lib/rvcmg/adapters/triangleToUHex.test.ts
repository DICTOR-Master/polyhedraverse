import { deriveTriangleToUHex, uHexStartState } from './triangleToUHex';
import { UNIVERSAL_HEX_INTERFACE, HEX_CIRCUMRADIUS } from '../universalHexInterface';
import { separate } from '../separate';
import { statesApproximatelyEqual } from '../types';
import { dist } from '../../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

check('HEX_CIRCUMRADIUS is exactly sqrt(2)/2', Math.abs(HEX_CIRCUMRADIUS - Math.SQRT2 / 2) < 1e-12);
check('uHexStartState() vertices sit exactly on UNIVERSAL_HEX_INTERFACE', uHexStartState().vertices.every((v, i) => dist(v.pos, UNIVERSAL_HEX_INTERFACE[i]) < 1e-12));
check('the universal hex really is regular: all 6 edges equal', (() => {
  const lens = UNIVERSAL_HEX_INTERFACE.map((p, i) => dist(p, UNIVERSAL_HEX_INTERFACE[(i + 1) % 6]));
  return Math.max(...lens) - Math.min(...lens) < 1e-12;
})());
check('the universal hex is regular: all 6 vertices equidistant from the origin', UNIVERSAL_HEX_INTERFACE.every((p) => Math.abs(Math.hypot(...p) - HEX_CIRCUMRADIUS) < 1e-12));

const result = deriveTriangleToUHex();
check(`the whole derivation passes Stage 7 verification with zero problems (${JSON.stringify(result.problems)})`, result.problems.length === 0);
check('exactly 3 coalesce steps (6 -> 5 -> 4 -> 3)', result.ops.length === 3 && result.states.length === 4);
check('final state has exactly 3 vertices', result.states[3].vertices.length === 3);

const finalTriangle = result.states[3];
const edgeLens = finalTriangle.vertices.map((v, i) => dist(v.pos, finalTriangle.vertices[(i + 1) % 3].pos));
check('final triangle is equilateral with edge length exactly 1 (matches a unit-edge tetrahedron/octahedron face)', edgeLens.every((l) => Math.abs(l - 1) < 1e-9));

let back = finalTriangle;
for (let i = result.ops.length - 1; i >= 0; i--) {
  const op = result.ops[i];
  const before = result.states[i];
  const mergedId = back.vertices.find((v) => v.sourceIds.length === 2 && v.sourceIds.includes(op.coalescedPair[0]) && v.sourceIds.includes(op.coalescedPair[1]))!.id;
  const posA = before.vertices.find((v) => v.id === op.coalescedPair[0])!.pos;
  const posB = before.vertices.find((v) => v.id === op.coalescedPair[1])!.pos;
  back = separate(back, mergedId, [posA, posB]);
}
check('separating all 3 steps in reverse reproduces the original universal hex interface exactly', statesApproximatelyEqual(back, result.states[0]));

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

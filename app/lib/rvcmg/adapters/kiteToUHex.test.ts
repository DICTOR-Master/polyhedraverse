import { deriveDIKiteToUHex } from './diKiteToUHex';
import { deriveDHKiteToUHex } from './dhKiteToUHex';
import { measureKiteFace } from './kiteToUHex';
import { separate } from '../separate';
import { statesApproximatelyEqual } from '../types';
import { dist, type Vec3 } from '../../polyhedra/core';
import type { AdapterPieceResult } from './triangleToUHex';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

function checkKitePiece(label: string, result: AdapterPieceResult, catalanId: string) {
  check(`${label}: the whole derivation passes Stage 7 verification with zero problems (${JSON.stringify(result.problems)})`, result.problems.length === 0);
  check(`${label}: exactly 2 coalesce steps (6 -> 5 -> 4)`, result.ops.length === 2 && result.states.length === 3);

  const final = result.states[2];
  check(`${label}: final state has exactly 4 vertices`, final.vertices.length === 4);

  const edgeLens = final.vertices.map((v, i) => dist(v.pos, final.vertices[(i + 1) % 4].pos));
  const sorted = [...edgeLens].sort((a, b) => a - b);
  check(`${label}: exactly 2 short + 2 long edges (a real kite, not a rhombus)`, Math.abs(sorted[1] - sorted[0]) < 1e-6 && Math.abs(sorted[3] - sorted[2]) < 1e-6 && sorted[2] - sorted[1] > 1e-6);

  const measured = measureKiteFace(catalanId);
  check(`${label}: short/long edge ratio matches the measured Catalan face exactly`, Math.abs(sorted[0] / sorted[2] - measured.edgeShort / measured.edgeLong) < 1e-9);
  check(`${label}: the short edge exactly matches the REAL Catalan face's own short edge (not rescaled)`, Math.abs(sorted[0] - measured.edgeShort) < 1e-9);
  check(`${label}: the long edge exactly matches the REAL Catalan face's own long edge (not rescaled)`, Math.abs(sorted[2] - measured.edgeLong) < 1e-9);

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
  check(`${label}: separating both steps in reverse (derivation-reversibility) reproduces the original universal hex interface exactly`, statesApproximatelyEqual(back, result.states[0]));
}

checkKitePiece('DI-kite', deriveDIKiteToUHex(), 'DELTOIDAL_ICOSITETRAHEDRON');
checkKitePiece('DH-kite', deriveDHKiteToUHex(), 'DELTOIDAL_HEXECONTAHEDRON');

const diMeasured = measureKiteFace('DELTOIDAL_ICOSITETRAHEDRON');
const dhMeasured = measureKiteFace('DELTOIDAL_HEXECONTAHEDRON');
check('DI and DH kites have genuinely different short/long edge ratios', Math.abs(diMeasured.edgeShort / diMeasured.edgeLong - dhMeasured.edgeShort / dhMeasured.edgeLong) > 1e-6);

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

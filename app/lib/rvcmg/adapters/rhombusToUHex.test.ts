import { deriveGoldenRhombusToUHex, GOLDEN_RATIO_MEASURED_V2, RHOMBIC_TRIACONTAHEDRON_EDGE_MEASURED_V2 } from './goldenRhombusToUHex';
import { deriveRdNativeRhombusToUHex, RD_RHOMBUS_RATIO_MEASURED, RD_RHOMBUS_EDGE_MEASURED } from './rdNativeRhombusToUHex';
import { CATALAN_ADDITIONS } from '../../polyhedra/catalan';
import { separate } from '../separate';
import { statesApproximatelyEqual } from '../types';
import { dist, facesCongruent, type Vec3 } from '../../polyhedra/core';
import type { AdapterPieceResult } from './triangleToUHex';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

function checkRhombusPiece(label: string, result: AdapterPieceResult, expectedRatio: number, expectedEdge: number) {
  check(`${label}: the whole derivation passes Stage 7 verification with zero problems (${JSON.stringify(result.problems)})`, result.problems.length === 0);
  check(`${label}: exactly 2 coalesce steps (6 -> 5 -> 4)`, result.ops.length === 2 && result.states.length === 3);

  const final = result.states[2];
  check(`${label}: final state has exactly 4 vertices`, final.vertices.length === 4);

  const edgeLens = final.vertices.map((v, i) => dist(v.pos, final.vertices[(i + 1) % 4].pos));
  check(`${label}: all 4 edges exactly match the measured face edge length`, edgeLens.every((l) => Math.abs(l - expectedEdge) < 1e-9));

  const diag1 = dist(final.vertices[0].pos, final.vertices[2].pos);
  const diag2 = dist(final.vertices[1].pos, final.vertices[3].pos);
  check(`${label}: the two diagonals are genuinely DIFFERENT lengths (a real rhombus, not accidentally a square)`, Math.abs(diag1 - diag2) > 1e-6);
  check(`${label}: the diagonal ratio matches the measured ratio exactly`, Math.abs(Math.max(diag1, diag2) / Math.min(diag1, diag2) - expectedRatio) < 1e-9);

  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const d1v = sub(final.vertices[2].pos, final.vertices[0].pos);
  const d2v = sub(final.vertices[3].pos, final.vertices[1].pos);
  const cosBetween = dot(d1v, d2v) / (Math.hypot(...d1v) * Math.hypot(...d2v));
  check(`${label}: the two diagonals are perpendicular (a defining property of any rhombus)`, Math.abs(cosBetween) < 1e-9);

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
  check(`${label}: separating both steps in reverse reproduces the original universal hex interface exactly`, statesApproximatelyEqual(back, result.states[0]));

  return final;
}

check('the measured RT rhombus diagonal ratio really is phi (not assumed)', Math.abs(GOLDEN_RATIO_MEASURED_V2 - (1 + Math.sqrt(5)) / 2) < 1e-9);

checkRhombusPiece('Golden-rhombus', deriveGoldenRhombusToUHex(), GOLDEN_RATIO_MEASURED_V2, RHOMBIC_TRIACONTAHEDRON_EDGE_MEASURED_V2);
const rdFinal = checkRhombusPiece('RD-native-rhombus', deriveRdNativeRhombusToUHex(), RD_RHOMBUS_RATIO_MEASURED, RD_RHOMBUS_EDGE_MEASURED);

// --- The actual point of this new piece: its target face must be
// genuinely congruent to a real RHOMBIC_DODECAHEDRON face, so a UHex
// adapter can mate directly onto a real RD without an RD-Hemi in
// between. ---
{
  const RD = CATALAN_ADDITIONS.RHOMBIC_DODECAHEDRON;
  const faceIdxs = [0, 1, 2, 3];
  const matchesRealRD = RD.faces.some((rdFace) => facesCongruent(rdFinal.vertices.map((v) => v.pos), faceIdxs, RD.vertices, rdFace));
  check('RD-native-rhombus target face is genuinely congruent to a real RHOMBIC_DODECAHEDRON face', matchesRealRD);
}

check('golden ratio and RD-native ratio are genuinely different (two distinct pieces, not interchangeable)', Math.abs(GOLDEN_RATIO_MEASURED_V2 - RD_RHOMBUS_RATIO_MEASURED) > 1e-6);

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

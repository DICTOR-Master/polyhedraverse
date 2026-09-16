/**
 * Verifies the actual, shipped quad-prism registry entries
 * (QUAD_PRISM_ADDITIONS, app/lib/polyhedra/miscellaneous/quad-prisms/)
 * directly -- not a parallel re-derivation. Checks: Euler's formula,
 * every lateral face planar with 4 right angles, the two caps genuinely
 * congruent to the real Catalan-solid face each piece was extruded
 * from, attachableFaceIndices names exactly the two caps, and the
 * "all-square" (rhombus bases) / "2 square + 2 rectangle" (kite bases)
 * claim measured directly rather than assumed from the construction.
 */
import { QUAD_PRISM_ADDITIONS, QUAD_PRISM_ADDITION_IDS } from '../app/lib/polyhedra/miscellaneous/quad-prisms';
import { CATALAN_ADDITIONS } from '../app/lib/polyhedra/catalan';
import { dist, facesCongruent, isRegularFace, type Vec3 } from '../app/lib/polyhedra/core';
import { measureRhombusFace } from '../app/lib/rvcmg/adapters/rhombusToUHex';
import { measureKiteFace } from '../app/lib/rvcmg/adapters/kiteToUHex';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

check('exactly 4 quad-prism pieces registered', QUAD_PRISM_ADDITION_IDS.length === 4);

const RHOMBUS_PIECES = [
  { id: 'QUAD_PRISM_RD_RHOMBUS', catalanId: 'RHOMBIC_DODECAHEDRON' },
  { id: 'QUAD_PRISM_RT_GOLDEN_RHOMBUS', catalanId: 'RHOMBIC_TRIACONTAHEDRON' },
];
const KITE_PIECES = [
  { id: 'QUAD_PRISM_DI_KITE', catalanId: 'DELTOIDAL_ICOSITETRAHEDRON' },
  { id: 'QUAD_PRISM_DH_KITE', catalanId: 'DELTOIDAL_HEXECONTAHEDRON' },
];

function checkStructure(id: string, expectedAttachable: number[]) {
  const spec = QUAD_PRISM_ADDITIONS[id];
  check(`${id}: is registered`, !!spec);
  if (!spec) return;

  const V = spec.vertices.length;
  const E = spec.edges.length;
  const F = spec.faces.length;
  check(`${id}: V=${V} E=${E} F=${F}, Euler's formula holds`, V - E + F === 2);
  check(`${id}: exactly 8 vertices, 12 edges, 6 faces (a quad prism)`, V === 8 && E === 12 && F === 6);

  // Every face is a real attach port EXCEPT a kite's own 2 non-square
  // rectangle lateral faces (direct user request for branching, 2026-
  // 09-17, minus the real placement-algorithm limitation found while
  // wiring it up -- see polygonPrismSolid.ts's own header).
  check(`${id}: attachableFaceIndices is exactly ${JSON.stringify(expectedAttachable)}`, JSON.stringify(spec.attachableFaceIndices) === JSON.stringify(expectedAttachable));
  spec.faces.forEach((f, fi) => {
    if (fi === 0 || fi === 1) return;
    const shouldBeAttachable = expectedAttachable.includes(fi);
    check(`${id}: lateral face ${fi} attachable=${shouldBeAttachable} as expected (regular=${isRegularFace(spec.vertices, f)})`, !!spec.attachableFaceIndices?.includes(fi) === shouldBeAttachable);
    check(`${id}: lateral face ${fi} is a real quad`, f.length === 4);
  });

  // Every lateral face must be planar with 4 right angles (a real
  // rectangle) -- re-measured here independently of quadPrismSolid.ts's
  // own internal check, which this script does not import.
  for (let fi = 2; fi < 6; fi++) {
    const pts = spec.faces[fi].map((i) => spec.vertices[i]);
    const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    const planarity = Math.abs(dot(sub(pts[3], pts[0]), n)) / Math.hypot(...n);
    check(`${id}: lateral face ${fi} is planar (deviation ${planarity.toExponential(3)})`, planarity < 1e-9);
    for (let k = 0; k < 4; k++) {
      const prev = pts[(k - 1 + 4) % 4];
      const curr = pts[k];
      const next = pts[(k + 1) % 4];
      const cos = dot(sub(prev, curr), sub(next, curr)) / (Math.hypot(...sub(prev, curr)) * Math.hypot(...sub(next, curr)));
      check(`${id}: lateral face ${fi} corner ${k} is a right angle (cos=${cos.toExponential(3)})`, Math.abs(cos) < 1e-9);
    }
  }
}

for (const { id, catalanId } of RHOMBUS_PIECES) {
  checkStructure(id, [0, 1, 2, 3, 4, 5]);
  const spec = QUAD_PRISM_ADDITIONS[id];
  if (!spec) continue;
  const source = CATALAN_ADDITIONS[catalanId];
  check(`${id}: cap 0 is congruent to the real ${catalanId} face`, facesCongruent(spec.vertices, spec.faces[0], source.vertices, source.faces[0]));
  check(`${id}: cap 1 is congruent to the real ${catalanId} face`, facesCongruent(spec.vertices, spec.faces[1], source.vertices, source.faces[0]));
  const { edge } = measureRhombusFace(catalanId);
  const lateralEdges = [0, 1, 2, 3].map((i) => dist(spec.vertices[i], spec.vertices[i + 4]));
  check(`${id}: all 4 lateral (vertical) edges equal the rhombus's own edge length ${edge.toFixed(9)}`, lateralEdges.every((l) => Math.abs(l - edge) < 1e-9));
  for (let fi = 2; fi < 6; fi++) {
    const pts = spec.faces[fi].map((i) => spec.vertices[i]);
    const sides = [0, 1].map((k) => dist(pts[k], pts[k + 1]));
    check(`${id}: lateral face ${fi} is a genuine SQUARE (sides ${sides.map((s) => s.toFixed(6))})`, Math.abs(sides[0] - sides[1]) < 1e-9);
  }
}

for (const { id, catalanId } of KITE_PIECES) {
  const specForMeasurement = QUAD_PRISM_ADDITIONS[id];
  const squareFaceIndices: number[] = [];
  let squareCount = 0;
  let rectangleCount = 0;
  if (specForMeasurement) {
    for (let fi = 2; fi < 6; fi++) {
      const pts = specForMeasurement.faces[fi].map((i) => specForMeasurement.vertices[i]);
      const sides = [0, 1].map((k) => dist(pts[k], pts[k + 1]));
      const isSquare = Math.abs(sides[0] - sides[1]) < 1e-9;
      check(`${id}: lateral face ${fi} sides ${sides.map((s) => s.toFixed(6))} -> ${isSquare ? 'square' : 'rectangle'}`, true);
      if (isSquare) {
        squareCount++;
        squareFaceIndices.push(fi);
      } else rectangleCount++;
    }
  }
  check(`${id}: exactly 2 square + 2 rectangle lateral faces (got ${squareCount} + ${rectangleCount})`, squareCount === 2 && rectangleCount === 2);

  // Only the caps + the 2 genuine squares are expected attachable -- the
  // 2 non-square rectangles stay out (real placement-algorithm
  // limitation, see polygonPrismSolid.ts's own header).
  checkStructure(id, [0, 1, ...squareFaceIndices].sort((a, b) => a - b));
  const spec = QUAD_PRISM_ADDITIONS[id];
  if (!spec) continue;
  const source = CATALAN_ADDITIONS[catalanId];
  check(`${id}: cap 0 is congruent to the real ${catalanId} face`, facesCongruent(spec.vertices, spec.faces[0], source.vertices, source.faces[0]));
  check(`${id}: cap 1 is congruent to the real ${catalanId} face`, facesCongruent(spec.vertices, spec.faces[1], source.vertices, source.faces[0]));
  const { edgeShort, edgeLong } = measureKiteFace(catalanId);
  check(`${id}: source kite really has 2 distinct edge lengths`, Math.abs(edgeShort - edgeLong) > 1e-6);
  const lateralEdges = [0, 1, 2, 3].map((i) => dist(spec.vertices[i], spec.vertices[i + 4]));
  check(`${id}: all 4 lateral (vertical) edges equal the kite's own SHORT edge length ${edgeShort.toFixed(9)}`, lateralEdges.every((l) => Math.abs(l - edgeShort) < 1e-9));
}

console.log(`\n${failures} failures.`);
process.exit(failures === 0 ? 0 : 1);

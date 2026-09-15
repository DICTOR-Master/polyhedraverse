/**
 * Verifies the RPC-build (radial-perspective click-to-build) bridge
 * (app/lib/polyhedra/rpcBuild.ts) directly against real closures for a
 * few seeds and a couple of shells each: every synthetic PolyhedronSpec
 * `buildSyntheticCellSpec` produces must be a genuinely valid closed
 * solid -- Euler's formula (V - E + F = 2) and every face's own
 * triangulated vertices actually planar and non-degenerate -- not just
 * "doesn't throw." Mirrors scripts/verify-rvcmg-solids.ts's own
 * precedent for a new shape-construction path needing its own dedicated
 * verify script.
 */
import { POLYHEDRA } from '../app/lib/polyhedra';
import { buildFaceConnectors, triangulateFace, type Vec3 } from '../app/lib/polyhedra/core';
import { closureClass, dihedralAngleDeg } from '../app/lib/polyhedra/fourD';
import { edgeClosingCorrection, edgeClosingCorrectionForK, siblingClosingHalfAngleRad, siblingClosingShareRad } from '../app/lib/polyhedra/fold4';
import { buildRpcComplex, buildSyntheticCellSpec, cellsAtShell, maxShell, closureRingSize } from '../app/lib/polyhedra/rpcBuild';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

// V - E + F = 2 for any genuine closed convex polyhedron -- the same
// check triangulateFace/validateShape's own Euler check elsewhere in
// this codebase relies on, re-derived here directly against the
// SYNTHETIC spec (not the registry one it was copied from), since the
// whole point is confirming projection didn't break the topology.
function eulerFormulaHolds(vertexCount: number, edgeCount: number, faceCount: number): boolean {
  return vertexCount - edgeCount + faceCount === 2;
}

// Every triangulated triangle of every face must be non-degenerate (a
// real, nonzero-area triangle -- projection could in principle collapse
// three warped vertices onto a line) and every face's own vertices must
// be planar (triangulating an n>3 face only makes combinatorial sense
// if the whole face is still one flat polygon after warping).
function facesArePlanarAndNonDegenerate(vertices: Vec3[], faces: number[][]): { planar: boolean; nonDegenerate: boolean; worstPlanarity: number } {
  let planar = true;
  let nonDegenerate = true;
  let worstPlanarity = 0;
  for (const face of faces) {
    const pts = face.map((i) => vertices[i]);
    const p0 = pts[0];
    const e1 = sub(pts[1], p0);
    const e2 = sub(pts[2], p0);
    const normal = cross(e1, e2);
    const normalLen = length(normal);
    if (normalLen < 1e-9) {
      nonDegenerate = false;
      continue;
    }
    const unitNormal: Vec3 = [normal[0] / normalLen, normal[1] / normalLen, normal[2] / normalLen];
    for (const p of pts) {
      const offPlane = Math.abs(dot(sub(p, p0), unitNormal));
      worstPlanarity = Math.max(worstPlanarity, offPlane);
      if (offPlane > 1e-6) planar = false;
    }
    for (const [i, j, k] of triangulateFace(face)) {
      const area = length(cross(sub(vertices[j], vertices[i]), sub(vertices[k], vertices[i]))) / 2;
      if (area < 1e-9) nonDegenerate = false;
    }
  }
  return { planar, nonDegenerate, worstPlanarity };
}

interface Case {
  label: string;
  seedSpecId: string;
  target: string;
  shellsToCheck: number; // check shells 0..N inclusive
}

const CASES: Case[] = [
  { label: 'CUBE -> tesseract', seedSpecId: 'CUBE', target: 'tesseract', shellsToCheck: 1 },
  { label: 'D4 -> 16-cell', seedSpecId: 'D4', target: '16-cell', shellsToCheck: 1 },
  { label: 'D4 -> 5-cell', seedSpecId: 'D4', target: '5-cell', shellsToCheck: 1 },
  { label: 'D4 -> 600-cell', seedSpecId: 'D4', target: '600-cell', shellsToCheck: 1 },
  { label: 'PYRAMID_TRI_G2 -> 16-cell (D4-congruent duplicate seed)', seedSpecId: 'PYRAMID_TRI_G2', target: '16-cell', shellsToCheck: 1 },
  { label: 'DODECAHEDRON -> 120-cell', seedSpecId: 'DODECAHEDRON', target: '120-cell', shellsToCheck: 1 },
];

for (const { label, seedSpecId, target, shellsToCheck } of CASES) {
  const complex = buildRpcComplex(seedSpecId, target);
  check(`${label}: complex has a real seedSpecId/targetName`, complex.seedSpecId.length > 0 && complex.targetName === target);
  check(`${label}: at least one cell beyond the seed exists (real shells to check)`, maxShell(complex) >= 1);

  const cellSpec = POLYHEDRA[complex.seedSpecId];
  check(`${label}: complex.seedSpecId resolves to a real registry shape`, !!cellSpec);
  if (!cellSpec) continue;

  let checkedCells = 0;
  for (let shell = 0; shell <= Math.min(shellsToCheck, maxShell(complex)); shell++) {
    for (const cell of cellsAtShell(complex, shell)) {
      const synthetic = buildSyntheticCellSpec(cellSpec, cell.id, cell.vertices3D);

      check(`${label} shell ${shell} cell ${cell.id}: synthetic spec's own vertex count matches the seed`, synthetic.vertices.length === cellSpec.vertices.length);
      check(
        `${label} shell ${shell} cell ${cell.id}: Euler's formula holds (V - E + F = 2)`,
        eulerFormulaHolds(synthetic.vertices.length, synthetic.edges.length, synthetic.faces.length),
      );

      const { planar, nonDegenerate, worstPlanarity } = facesArePlanarAndNonDegenerate(synthetic.vertices, synthetic.faces);
      check(`${label} shell ${shell} cell ${cell.id}: every face is planar (worst off-plane distance ${worstPlanarity.toExponential(2)})`, planar);
      check(`${label} shell ${shell} cell ${cell.id}: every triangulated triangle is non-degenerate`, nonDegenerate);

      // Connectors must be rebuilt against the WARPED positions, not
      // copied from the seed (Connector.pos === the vertex's own
      // position -- see rpcBuild.ts's own doc comment on why this can't
      // just be copied).
      check(
        `${label} shell ${shell} cell ${cell.id}: connectors rebuilt at the warped positions, not the seed's original ones`,
        synthetic.connectors.every((c, i) => c.pos[0] === synthetic.vertices[i][0] && c.pos[1] === synthetic.vertices[i][1] && c.pos[2] === synthetic.vertices[i][2]),
      );

      checkedCells++;
    }
  }
  check(`${label}: at least one cell was actually checked`, checkedCells > 0);
}

// Cell 0 (the seed itself) is the one UNDISTORTED case: unlike every
// other cell (a genuinely non-uniform perspective warp), cell 0's own
// seed-embedding vertices all share one constant w=depth (see
// buildCellComplex), so the shared perspective-projection formula
// divides every one of its coordinates by the exact same denominator --
// a pure uniform scale of the real registry shape, not a skew. (It's
// NOT literal coordinate equality with the raw seed -- that constant
// scale factor is real and expected, which is exactly why
// ShapeViewer.tsx's own integration never routes cell 0 through this
// synthetic/projected path at all: the root reuses the already-placed
// real node directly, at whatever scale/pose it already has, and only
// shells 1+ ever go through buildSyntheticCellSpec.) Checked here as
// "uniform scale, not distortion": one constant k with
// cell0.vertices3D[i] == seedVerts[i] * k for every i, not vertex-by-
// vertex independent skew.
{
  const complex = buildRpcComplex('CUBE', 'tesseract');
  const cellSpec = POLYHEDRA[complex.seedSpecId];
  const cell0 = complex.cells.find((c) => c.id === 0)!;
  const seedVerts = cellSpec.vertices;
  const ratios = cell0.vertices3D.map((v, i) => length(v) / length(seedVerts[i]));
  const k = ratios[0];
  const ratioSpread = Math.max(...ratios) - Math.min(...ratios);
  check(`CUBE -> tesseract cell 0 (the seed) is a uniform scale of the real registry CUBE, not a skew (scale-ratio spread across vertices ${ratioSpread.toExponential(2)})`, ratioSpread < 1e-9);
  const worstDeviation = Math.max(
    ...cell0.vertices3D.map((v, i) => Math.hypot(v[0] - seedVerts[i][0] * k, v[1] - seedVerts[i][1] * k, v[2] - seedVerts[i][2] * k)),
  );
  check(`CUBE -> tesseract cell 0 (the seed) matches the real registry CUBE exactly up to that one uniform scale k=${k.toFixed(6)} (worst deviation ${worstDeviation.toExponential(2)})`, worstDeviation < 1e-9);
}

// --- Shell-1 open/closed fan math (RPC-build UI plan, "Design decision"
// section): fold4.ts's edgeClosingCorrectionForK/siblingClosingShareRad,
// generalizing edgeClosingCorrection/siblingClosingHalfAngleRad beyond
// fold4's own hardcoded k=3. Mirrors scripts/verify-fold4.ts's own (a)/(b)
// checks exactly, parametrized by k instead of assuming 3.

// (a) siblingClosingShareRad reduces EXACTLY to siblingClosingHalfAngleRad at k=3.
for (const id of ['DODECAHEDRON', 'CUBE', 'D8', 'D4']) {
  const spec = POLYHEDRA[id];
  const half = siblingClosingHalfAngleRad(spec);
  const share3 = siblingClosingShareRad(spec, 3);
  check(`${id}: siblingClosingShareRad(spec,3) === siblingClosingHalfAngleRad(spec) exactly (${share3} vs ${half})`, half !== null && share3 !== null && Math.abs(share3 - half) < 1e-12);
}

function findAdjacentFacePair(spec: (typeof POLYHEDRA)[string]): [number, number] {
  const [i, j] = spec.edges[0];
  const sharing = spec.faces.map((f, idx) => ({ f, idx })).filter(({ f }) => f.some((_, k) => f[k] === i && f[(k + 1) % f.length] === j || f[k] === j && f[(k + 1) % f.length] === i));
  return [sharing[0].idx, sharing[1].idx];
}

const rSub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const rScale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const rDot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const rCross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const rNorm = (a: Vec3): Vec3 => rScale(a, 1 / Math.hypot(...a));
function rotateAround(v: Vec3, axis: Vec3, theta: number): Vec3 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [
    v[0] * c + rCross(axis, v)[0] * s + axis[0] * rDot(axis, v) * (1 - c),
    v[1] * c + rCross(axis, v)[1] * s + axis[1] * rDot(axis, v) * (1 - c),
    v[2] * c + rCross(axis, v)[2] * s + axis[2] * rDot(axis, v) * (1 - c),
  ];
}

// (b) For each (seed, real k): the RAW (uncorrected, "3D open") 3-cell
// far-side gap (root + 2 direct siblings, exactly the same measurement
// scripts/verify-fold4.ts's own (b) check uses) is CONSTANT across every
// target for a given seed -- it's always k=3's OWN defectDeg (three
// flush-attached cells is a fact about the SEED alone, unrelated to
// which target closure the correction is generalized for; this is
// exactly WHY shell-1's "3D open" state is target-independent, matching
// the RPC-build UI plan's own design). Applying edgeClosingCorrectionForK's
// FULL correction to both sides leaves a residual of `(k-3) *
// (share+dihedralAngle)` -- derived and cross-checked numerically before
// writing this assertion, not assumed: 0 (a real, exact flush closure,
// matching fold4's own unmodified k=3 behavior) exactly when k=3, and a
// real, correctly-scaled PARTIAL closing for k>3 (shell-1 alone can only
// ever supply 2 of the k-1 siblings a full ring needs -- see
// rpcBuild.ts's own closureRingSize doc comment and the RPC-build UI
// plan's "Design decision" section).
const K_CASES: { seedId: string; target: string }[] = [
  { seedId: 'DODECAHEDRON', target: '120-cell' },
  { seedId: 'CUBE', target: 'tesseract' },
  { seedId: 'D8', target: '24-cell' },
  { seedId: 'D4', target: '5-cell' },
  { seedId: 'D4', target: '16-cell' },
  { seedId: 'D4', target: '600-cell' },
];
for (const { seedId, target } of K_CASES) {
  const spec = POLYHEDRA[seedId];
  const k = closureRingSize(target)!;
  const [faceA, faceB] = findAdjacentFacePair(spec);
  const corrA = edgeClosingCorrectionForK(spec, faceA, faceB, k)!;
  const corrB = edgeClosingCorrectionForK(spec, faceB, faceA, k)!;
  check(`${seedId}->${target} (k=${k}): edgeClosingCorrectionForK succeeds for a real adjacent face pair`, corrA !== null && corrB !== null);
  check(`${seedId}->${target} (k=${k}): both sides agree on the same pivot`, Math.hypot(...rSub(corrA.pivot, corrB.pivot)) < 1e-9);
  check(`${seedId}->${target} (k=${k}): the two sides' corrections are equal-and-opposite`, Math.abs(corrA.angleRad + corrB.angleRad) < 1e-9);

  const fc = buildFaceConnectors(spec);
  const perpOf = (p: Vec3): Vec3 => {
    const rel = rSub(p, corrA.pivot);
    const along = rDot(rel, corrA.axis);
    return rNorm(rSub(rel, rScale(corrA.axis, along)));
  };
  const rA = perpOf(fc[faceA].pos);
  const rB = perpOf(fc[faceB].pos);
  const dihedralMeasuredDeg = (Math.acos(Math.min(1, Math.max(-1, rDot(rA, rB)))) * 180) / Math.PI;
  const thetaAB = Math.atan2(rDot(corrA.axis, rCross(rA, rB)), rDot(rA, rB));
  const dihedralRad = (dihedralMeasuredDeg * Math.PI) / 180;
  const rFarA = rotateAround(rA, corrA.axis, -Math.sign(thetaAB) * dihedralRad);
  const rFarB = rotateAround(rB, corrA.axis, Math.sign(thetaAB) * dihedralRad);
  const rawGapDeg = (Math.acos(Math.min(1, Math.max(-1, rDot(rFarA, rFarB)))) * 180) / Math.PI;
  const k3defect = closureClass(spec).find((c) => c.k === 3)!;
  check(
    `${seedId}->${target} (k=${k}): raw (open) 3-cell far-side gap matches the SEED's own k=3 defectDeg (target-independent -- ${rawGapDeg.toFixed(4)} vs ${k3defect.defectDeg.toFixed(4)})`,
    Math.abs(rawGapDeg - k3defect.defectDeg) < 1e-6,
  );

  const rFarAClosed = rotateAround(rFarA, corrA.axis, corrA.angleRad);
  const rFarBClosed = rotateAround(rFarB, corrB.axis, corrB.angleRad);
  const closedGapDeg = (Math.acos(Math.min(1, Math.max(-1, rDot(rFarAClosed, rFarBClosed)))) * 180) / Math.PI;
  const shareDeg = (siblingClosingShareRad(spec, k)! * 180) / Math.PI;
  const dihedralDeg = dihedralAngleDeg(spec)!;
  const expectedResidualDeg = (k - 3) * (shareDeg + dihedralDeg);
  check(
    `${seedId}->${target} (k=${k}): full correction leaves exactly the expected residual gap (${closedGapDeg.toFixed(4)} vs ${expectedResidualDeg.toFixed(4)}, 0 means a real exact closure)`,
    Math.abs(closedGapDeg - expectedResidualDeg) < 1e-4,
  );
}

// (c) k=3 sanity: edgeClosingCorrectionForK(...,3) agrees with the plain edgeClosingCorrection exactly (not just siblingClosingShareRad in isolation).
{
  const spec = POLYHEDRA.DODECAHEDRON;
  const [faceA, faceB] = findAdjacentFacePair(spec);
  const plain = edgeClosingCorrection(spec, faceA, faceB)!;
  const general = edgeClosingCorrectionForK(spec, faceA, faceB, 3)!;
  check('DODECAHEDRON: edgeClosingCorrectionForK(...,3) matches plain edgeClosingCorrection exactly', Math.abs(plain.angleRad - general.angleRad) < 1e-12 && Math.hypot(...rSub(plain.pivot, general.pivot)) < 1e-12);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} FAILURE(S).`);
process.exit(failures === 0 ? 0 : 1);

/**
 * Verifies composite-seed-rcp/lattice.ts and rcpMap.ts against measured
 * numbers, not the hand-derivation in their own comments — direct
 * instruction this session: "be careful of any figures derived from
 * previous different RD dimensions." Every numeric claim in either
 * file's doc comments is re-checked here from the live, registered
 * POLYHEDRA.RHOMBIC_DODECAHEDRON data, at THIS module's circumradius-1
 * scale only — nothing here assumes a prior session's RD scale
 * (Rhombiverse's `s`-parameterized lattice, the hypothesis doc's own
 * doubled (±1,±1,±1)/(±2,0,0) realization, or RVCMG's archived
 * RD-native hex interface) carries over.
 */
import { POLYHEDRA } from '../app/lib/polyhedra';
import { dist } from '../app/lib/polyhedra/core';
import {
  RD_CIRCUMRADIUS,
  RD_INRADIUS,
  RD_FACETS,
  DELTA_RD,
  isLatticePoint,
  latticePointsInBox,
} from '../app/lib/polyhedra/composite-seed-rcp/lattice';
import {
  sCube,
  sOct,
  sTet,
  CUBE_BOUNDARY_CLASSES,
  OCT_BOUNDARY_CLASSES,
  TET_BOUNDARY_CLASSES,
  buildEffectiveSeed,
} from '../app/lib/polyhedra/composite-seed-rcp/rcpMap';

let failures = 0;
function check(label: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`ok: ${label}`);
  }
}
function close(a: number, b: number, tol = 1e-9) {
  return Math.abs(a - b) < tol;
}

// -----------------------------------------------------------------
// 1. Circumradius really is 1 for the registered shape this module reuses.
// -----------------------------------------------------------------
const maxR = Math.max(...POLYHEDRA.RHOMBIC_DODECAHEDRON.vertices.map((v) => Math.hypot(v[0], v[1], v[2])));
check(`RD circumradius measured as 1 (got ${maxR})`, close(maxR, RD_CIRCUMRADIUS, 1e-9));

// -----------------------------------------------------------------
// 2. Inradius measured, not hand-derived -- confirm it equals sqrt(2)/2
//    ONLY as a check against the comment's own claim, not assumed.
// -----------------------------------------------------------------
const expectedInradius = Math.SQRT2 / 2;
check(
  `RD_INRADIUS measured as sqrt(2)/2 (got ${RD_INRADIUS}, expected ${expectedInradius})`,
  close(RD_INRADIUS, expectedInradius, 1e-9),
);

// -----------------------------------------------------------------
// 3. Every one of the 12 real centre-to-centre offsets (Delta_RD) is
//    EXACTLY an integer vector, and exactly a permutation of (+-1,+-1,0)
//    -- not merely close to one.
// -----------------------------------------------------------------
check('DELTA_RD has exactly 12 entries', DELTA_RD.length === 12);
for (const [i, d] of DELTA_RD.entries()) {
  const isIntTriple = d.every((c) => close(c, Math.round(c), 1e-9));
  check(`DELTA_RD[${i}] = [${d.map((c) => c.toFixed(6)).join(',')}] is exactly integer-valued`, isIntTriple);
  const rounded = d.map((c) => Math.round(c));
  const abs = rounded.map(Math.abs).sort();
  check(`DELTA_RD[${i}] rounds to a permutation of (+-1,+-1,0)`, abs[0] === 0 && abs[1] === 1 && abs[2] === 1);
}
// And the full 12-entry set matches Rhombiverse's own unscaled
// NEIGHBOR_OFFSETS (src/core/lattice.js:141-145) EXACTLY, as literal
// numbers, not merely "the same shape" -- the specific claim the file
// header comments make and this session's own caution requires
// checking rather than asserting.
const expectedNeighborOffsets = [
  [1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0],
  [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1],
  [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1],
];
const roundedDeltaSet = new Set(DELTA_RD.map((d) => d.map((c) => Math.round(c)).join(',')));
const matchesNeighborOffsets = expectedNeighborOffsets.every((v) => roundedDeltaSet.has(v.join(',')));
check('DELTA_RD (rounded) is the exact same 12-vector set as Rhombiverse NEIGHBOR_OFFSETS', matchesNeighborOffsets);

// -----------------------------------------------------------------
// 4. centroidOffset (real vertex-average centroid) vs centreOffset/2
//    (perpendicular-foot construction) -- checked, not assumed equal.
// -----------------------------------------------------------------
for (const [i, f] of RD_FACETS.entries()) {
  const half: [number, number, number] = [f.centreOffset[0] / 2, f.centreOffset[1] / 2, f.centreOffset[2] / 2];
  check(`RD_FACETS[${i}].centroidOffset equals centreOffset/2`, close(dist(f.centroidOffset, half), 0, 1e-9));
}

// -----------------------------------------------------------------
// 5. Strongest possible check: placing a second RD cell at a real
//    Delta_RD offset produces a genuine shared face -- 4 real coincident
//    vertices between the two cells' own vertex sets, not just an
//    inradius-arithmetic coincidence.
// -----------------------------------------------------------------
for (const [i, offset] of DELTA_RD.entries()) {
  const shiftedVerts = POLYHEDRA.RHOMBIC_DODECAHEDRON.vertices.map(
    (v) => [v[0] + offset[0], v[1] + offset[1], v[2] + offset[2]] as [number, number, number],
  );
  let coincidentCount = 0;
  for (const v of POLYHEDRA.RHOMBIC_DODECAHEDRON.vertices) {
    if (shiftedVerts.some((sv) => dist(v, sv) < 1e-9)) coincidentCount++;
  }
  check(`Cell shifted by DELTA_RD[${i}] shares exactly 4 real coincident vertices (a real face) -- got ${coincidentCount}`, coincidentCount === 4);
}

// -----------------------------------------------------------------
// 6. Lattice enumeration sanity.
// -----------------------------------------------------------------
check('isLatticePoint rejects a non-integer point', !isLatticePoint(0.5, 0, 0));
check('isLatticePoint rejects odd-parity integer point', !isLatticePoint(1, 0, 0));
check('isLatticePoint accepts the origin', isLatticePoint(0, 0, 0));
check('isLatticePoint accepts (1,1,0)', isLatticePoint(1, 1, 0));
const box2 = latticePointsInBox(2);
check('latticePointsInBox(2) contains only even-parity points', box2.every(([x, y, z]) => (x + y + z) % 2 === 0));
check('latticePointsInBox(2) contains the origin', box2.some((p) => p[0] === 0 && p[1] === 0 && p[2] === 0));

// -----------------------------------------------------------------
// 7. Boundary-selection functions: basic shape sanity.
// -----------------------------------------------------------------
const cube2 = sCube(2);
const oct2 = sOct(2);
const tet2 = sTet(2);
check('sCube(2) is a superset of sOct(2) (L1 ball sits inside L-infinity ball at same L)', oct2.every((p) => cube2.some((q) => q[0] === p[0] && q[1] === p[1] && q[2] === p[2])));
// NOT a subset relationship, checked and confirmed by hand: S_tet's 4
// vertices (at (+-L,+-L,+-L)-type odd-parity corners, solved directly
// from its own 4 half-space constraints) sit at the L-infinity BOX's own
// corners, which lie OUTSIDE the L1 ball (|L|+|L|+|-L|=3L > L) -- S_tet
// at a given L is a genuinely bigger, differently-shaped region than
// S_oct at the same L, not a subset of it. `S_tet` is still correctly
// bounded within the SAME L-infinity box (`latticePointsInBox(L)`) used
// to enumerate it -- checked below instead.
const tetVerticesReachBoxCorner = tet2.some(([x, y, z]) => Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) === 2);
check('sTet(2) reaches the L-infinity box boundary (its own vertices sit at the box corners, confirmed by hand)', tetVerticesReachBoxCorner);
check('sTet(2) stays within the L-infinity box it was enumerated from (no truncation)', tet2.every(([x, y, z]) => Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) <= 2 + 1e-9));
// The real, structural claim from hypothesis.md S13/S5.3: the
// tetrahedral selection is NOT centrally symmetric, unlike cube/oct.
const tet2HasAntipodeAsymmetry = tet2.some((p) => !tet2.some((q) => q[0] === -p[0] && q[1] === -p[1] && q[2] === -p[2]));
check('sTet(L) is genuinely NOT centrally symmetric (unlike sCube/sOct)', tet2HasAntipodeAsymmetry);
const cube2SymmetricUnderNegation = cube2.every((p) => cube2.some((q) => q[0] === -p[0] && q[1] === -p[1] && q[2] === -p[2]));
check('sCube(L) IS centrally symmetric', cube2SymmetricUnderNegation);
const oct2SymmetricUnderNegation = oct2.every((p) => oct2.some((q) => q[0] === -p[0] && q[1] === -p[1] && q[2] === -p[2]));
check('sOct(L) IS centrally symmetric', oct2SymmetricUnderNegation);

// -----------------------------------------------------------------
// 8. R(A_RD) informal preview (NOT Stage 2/3's formal residual proof --
//    just a sanity check that class assignment produces something
//    plausible, matching hypothesis.md's own "two flat lines" preview
//    numbers loosely, at ONE resolution). Formal proof is out of scope
//    for this script.
// -----------------------------------------------------------------
function angleDeg(a: [number, number, number], b: [number, number, number]): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const na = Math.hypot(...a);
  const nb = Math.hypot(...b);
  return (Math.acos(Math.min(1, Math.max(-1, dot / (na * nb)))) * 180) / Math.PI;
}

for (const L of [3, 4]) {
  const seed = buildEffectiveSeed(sCube(L), CUBE_BOUNDARY_CLASSES, L);
  for (const cls of seed.classes) {
    if (cls.centroids.length === 0) continue;
    const angles = cls.normals.map((n) => angleDeg(n, cls.direction as [number, number, number]));
    const allSame45 = angles.every((a) => close(a, 45, 0.5));
    check(`[preview only] cube class ${cls.name} at L=${L}: every exposed RD facet normal sits at ~45deg from the target <100> direction (${angles.length} facets)`, allSame45);
  }
}
for (const L of [3, 4]) {
  const seed = buildEffectiveSeed(sOct(L), OCT_BOUNDARY_CLASSES, L);
  for (const cls of seed.classes) {
    if (cls.centroids.length === 0) continue;
    const angles = cls.normals.map((n) => angleDeg(n, cls.direction as [number, number, number]));
    const expected = (Math.asin(1 / Math.sqrt(3)) * 180) / Math.PI;
    const allSame = angles.every((a) => close(a, expected, 0.5));
    check(`[preview only] oct class ${cls.name} at L=${L}: every exposed RD facet normal sits at ~${expected.toFixed(4)}deg from the target <111> direction (${angles.length} facets)`, allSame);
  }
}
for (const L of [3, 4]) {
  const seed = buildEffectiveSeed(sTet(L), TET_BOUNDARY_CLASSES, L);
  for (const cls of seed.classes) {
    if (cls.centroids.length === 0) continue;
    const angles = cls.normals.map((n) => angleDeg(n, cls.direction as [number, number, number]));
    const distinct = [...new Set(angles.map((a) => a.toFixed(2)))];
    check(`[preview only] tet class ${cls.name} at L=${L}: every exposed RD facet normal sits at ONE consistent angle from its target <111> direction (found: ${distinct.join(', ')}deg, ${angles.length} facets)`, distinct.length === 1);
  }
}

console.log(failures === 0 ? '\nAll composite-seed-rcp lattice/rcpMap checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);

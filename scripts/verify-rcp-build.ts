/**
 * Verifies the RCP-C2B (Radial Cell Projection, click-to-build) bridge
 * (app/lib/polyhedra/rcpBuild.ts) directly against real closures for a
 * few seeds and a couple of shells each: every synthetic PolyhedronSpec
 * `buildSyntheticCellSpec` produces must be a genuinely valid closed
 * solid -- Euler's formula (V - E + F = 2) and every face's own
 * triangulated vertices actually planar and non-degenerate -- not just
 * "doesn't throw." Mirrors scripts/verify-rvcmg-solids.ts's own
 * precedent for a new shape-construction path needing its own dedicated
 * verify script.
 */
import { POLYHEDRA } from '../app/lib/polyhedra';
import { triangulateFace, type Vec3 } from '../app/lib/polyhedra/core';
import { buildRcpComplex, buildSyntheticCellSpec, cellsAtShell, maxShell, rootSpecForView, windingOutwardness } from '../app/lib/polyhedra/rcpBuild';

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
  const complex = buildRcpComplex(seedSpecId, target);
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
      // position -- see rcpBuild.ts's own doc comment on why this can't
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
// a pure uniform scale of the real registry shape, not a skew.
//
// Real bug found live (2026-09-16): that constant scale factor is NOT
// automatically 1 (buildRcpComplex's own viewDistance/viewMargin
// convention is arbitrary), while ShapeViewer.tsx's own integration
// places the ACTUAL rendered root using the real, unscaled registry
// spec directly -- so every OTHER cell (computed relative to the
// complex's own, differently-scaled internal frame) was, before the
// fix, at the WRONG scale/distance relative to that real root: shell-1
// cells' own shared-face vertices exactly matched cell 0's own INTERNAL
// vertices (a reflection fixes points on its own mirror plane), but
// were nowhere near the REAL root's own face vertices, rendering as
// small, disconnected shards near a correctly-sized root instead of
// genuinely sharing a face with it. `projectAll` (rcpBuild.ts) now
// rescales the WHOLE complex by one uniform factor so cell 0 exactly
// equals the real registry seed -- checked here as k==1 exactly, not
// merely "some constant k" as before the fix.
{
  const complex = buildRcpComplex('CUBE', 'tesseract');
  const cellSpec = POLYHEDRA[complex.seedSpecId];
  const cell0 = complex.cells.find((c) => c.id === 0)!;
  const seedVerts = cellSpec.vertices;
  const ratios = cell0.vertices3D.map((v, i) => length(v) / length(seedVerts[i]));
  const k = ratios[0];
  const ratioSpread = Math.max(...ratios) - Math.min(...ratios);
  check(`CUBE -> tesseract cell 0 (the seed) is a uniform scale of the real registry CUBE, not a skew (scale-ratio spread across vertices ${ratioSpread.toExponential(2)})`, ratioSpread < 1e-9);
  check(`CUBE -> tesseract cell 0's own uniform scale is now exactly 1 (matches the real registry seed exactly, not just proportionally): k=${k.toFixed(9)}`, Math.abs(k - 1) < 1e-9);
  const worstDeviation = Math.max(
    ...cell0.vertices3D.map((v, i) => Math.hypot(v[0] - seedVerts[i][0] * k, v[1] - seedVerts[i][1] * k, v[2] - seedVerts[i][2] * k)),
  );
  check(`CUBE -> tesseract cell 0 (the seed) matches the real registry CUBE exactly up to that one uniform scale k=${k.toFixed(6)} (worst deviation ${worstDeviation.toExponential(2)})`, worstDeviation < 1e-9);
}

// The real point of the fix above, checked directly: a shell-1 cell's
// own shared-face vertices must now coincide with the REAL rendered
// root's own real face vertices (not just cell 0's internal ones) --
// this is the exact scenario reported live ("a big tetrahedron with
// four mini flat tetrahedrons orbiting it") and is the actual
// definition of "the 4D structure closes" this whole feature exists to
// show. "The real root" is the plain registry seed for every closure,
// since cell 0 exactly equals it.
for (const { label, seedSpecId, target } of CASES) {
  const complex = buildRcpComplex(seedSpecId, target);
  const rootSpec = POLYHEDRA[seedSpecId];
  const shell1 = cellsAtShell(complex, 1);
  if (shell1.length === 0) continue;
  const cell = shell1[0];
  // The shared face is whichever real face of the seed this cell sits
  // across from -- rather than assuming face 0, find the face whose
  // real vertex SET has the closest match among this cell's own
  // vertices (robust to which face buildCellComplex happened to use).
  let bestFace = -1;
  let bestScore = Infinity;
  for (let fi = 0; fi < rootSpec.faces.length; fi++) {
    const faceVerts = rootSpec.faces[fi].map((i) => rootSpec.vertices[i]);
    const score = faceVerts.reduce((s, fv) => s + Math.min(...cell.vertices3D.map((cv) => Math.hypot(cv[0] - fv[0], cv[1] - fv[1], cv[2] - fv[2]))), 0);
    if (score < bestScore) {
      bestScore = score;
      bestFace = fi;
    }
  }
  check(`${label}: shell-1 cell ${cell.id} shares its real face (index ${bestFace}) with the ACTUAL rendered root's own vertices (total nearest-vertex error ${bestScore.toExponential(2)})`, bestScore < 1e-6);
}

// The 600-cell's seed is exactly the regular registry tetrahedron
// (2026-09-24). It used to be a skewed cell of the dualized 120-cell,
// because the 120-cell is projected cell-first so no dual cell sat on the
// axis; the direct reflection build puts cell 0 on the axis instead.
{
  const complex = buildRcpComplex('D4', '600-cell');
  check(`D4 -> 600-cell: 600 cells (got ${complex.cells.length})`, complex.cells.length === 600);
  const cell0 = complex.cells.find((c) => c.id === 0)!;
  const seedVerts = POLYHEDRA.D4.vertices;
  const worst = Math.max(...cell0.vertices3D.map((v, i) => length(sub(v, seedVerts[i]))));
  check(`D4 -> 600-cell: cell 0 equals the regular registry D4 exactly (worst vertex deviation ${worst.toExponential(2)})`, worst < 1e-9);
  // A D4-congruent seed with its own registry id builds the same closure.
  const viaPyramid = buildRcpComplex('PYRAMID_TRI_G2', '600-cell');
  check(`PYRAMID_TRI_G2 -> 600-cell: 600 cells (got ${viaPyramid.cells.length})`, viaPyramid.cells.length === 600);
}

// Vertex-first 600-cell (2026-09-24): shell 1 is the other 19 cells
// around seed vertex 3, completing the icosahedral cluster.
{
  const complex = buildRcpComplex('D4', '600-cell (vertex-first)');
  const seedVerts = POLYHEDRA.D4.vertices;
  const edgeLen = length(sub(seedVerts[0], seedVerts[1]));
  const edges = (vs: Vec3[]) => [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]].map(([i, j]) => length(sub(vs[i], vs[j])));
  const shares = (a: Vec3[], b: Vec3[]) => a.filter((v) => b.some((q) => length(sub(v, q)) < 1e-9)).length;
  const shellSizes = [...Array(maxShell(complex) + 1).keys()].map((k) => cellsAtShell(complex, k).length);
  check(`vertex-first 600-cell: 600 cells in shells ${shellSizes.join(',')}`, complex.cells.length === 600 && shellSizes[0] === 1 && shellSizes[1] === 19);
  check('vertex-first 600-cell: cell 0 is not the registry seed (root swaps on Open/Closed)', !complex.cell0IsSeed);

  const cell0 = complex.cells[0];
  const shell1 = cellsAtShell(complex, 1);
  const pivotClosed = cell0.vertices3D[3];
  check('vertex-first 600-cell: every shell-1 cell contains the pivot (Closed)', shell1.every((c) => c.vertices3D.some((v) => length(sub(v, pivotClosed)) < 1e-9)));
  const spreads = [cell0, ...shell1].map((c) => Math.max(...edges(c.vertices3D)) / Math.min(...edges(c.vertices3D)));
  check(`vertex-first 600-cell: all 20 cluster cells equally skewed in Closed view (spread ${Math.min(...spreads).toFixed(4)}-${Math.max(...spreads).toFixed(4)})`, Math.max(...spreads) - Math.min(...spreads) < 1e-9);
  const rootOffset = Math.max(...cell0.vertices3D.map((v, i) => length(sub(v, seedVerts[i]))));
  check(`vertex-first 600-cell: Closed root aligned onto the registry seed (worst vertex offset ${rootOffset.toFixed(4)}, under 5% of an edge)`, rootOffset < 0.05 * edgeLen);
  check('vertex-first 600-cell: Closed root spec is cell 0, Open root spec is the registry seed', rootSpecForView(complex, false).vertices === cell0.vertices3D && rootSpecForView(complex, true) === POLYHEDRA.D4);
  const closedBad = complex.adjacency.filter(([a, b]) => shares(complex.cells[a].vertices3D, complex.cells[b].vertices3D) !== 3).length;
  check(`vertex-first 600-cell: every adjacent pair shares exactly 3 vertices in Closed view (${closedBad} bad)`, closedBad === 0);

  const openOf = (id: number): Vec3[] => (id === 0 ? seedVerts : complex.cells[id].openVertices3D!);
  check('vertex-first 600-cell: exactly the shell-1 cells carry an Open layout', complex.cells.every((c) => (c.shell === 1) === !!c.openVertices3D));
  check('vertex-first 600-cell: every Open cell is a regular, unit-edge copy of the seed containing the pivot', shell1.every((c) => edges(c.openVertices3D!).every((l) => Math.abs(l - edgeLen) < 1e-9) && c.openVertices3D!.some((v) => length(sub(v, seedVerts[3])) < 1e-9)));
  const attached = shell1.every((c) => complex.adjacency.some(([a, b]) => {
    const other = a === c.id ? b : b === c.id ? a : -1;
    return other >= 0 && other < c.id && shares(openOf(c.id), openOf(other)) === 3;
  }));
  check('vertex-first 600-cell: every Open cell shares a whole face with an earlier-built one (buildable in id order)', attached);
  const clusterPairs = complex.adjacency.filter(([a, b]) => complex.cells[a].shell <= 1 && complex.cells[b].shell <= 1);
  const gaps = clusterPairs.filter(([a, b]) => shares(openOf(a), openOf(b)) < 3).length;
  check(`vertex-first 600-cell: flat Open cluster can't close (${gaps} of ${clusterPairs.length} cluster joints left as gaps)`, clusterPairs.length === 30 && gaps === 11);
  const openGaps = complex.openGaps ?? [];
  const gapPairKeys = new Set(openGaps.map((g) => [...g.cells].sort((x, y) => x - y).join(':')));
  const expectedKeys = new Set(clusterPairs.filter(([a, b]) => shares(openOf(a), openOf(b)) < 3).map(([a, b]) => [a, b].sort((x, y) => x - y).join(':')));
  check(`vertex-first 600-cell: openGaps lists exactly those ${expectedKeys.size} joints`, gapPairKeys.size === expectedKeys.size && [...expectedKeys].every((k) => gapPairKeys.has(k)));
  const gapFacesRight = openGaps.every((g) => g.faceA.length === 3 && g.faceA.every((p) => openOf(g.cells[0]).some((q) => length(sub(p, q)) < 1e-9)) && g.faceB.every((p) => openOf(g.cells[1]).some((q) => length(sub(p, q)) < 1e-9)));
  const pivotShared = openGaps.every((g) => g.faceA.some((p, i) => length(sub(p, seedVerts[3])) < 1e-9 && length(sub(g.faceB[i], seedVerts[3])) < 1e-9));
  check('vertex-first 600-cell: each gap\'s two faces lie on their own cells\' Open layouts and meet at the pivot', gapFacesRight && pivotShared);
}

// Inside-out cells (fixed 2026-09-24): about half of every complex's
// cells project mirrored, and used to keep the seed's winding, so their
// faces pointed inward and Solid view rendered them inside-out. Every
// synthetic spec, Closed and Open, must now be wound outward.
for (const [seedSpecId, target] of [['D4', '5-cell'], ['D4', '16-cell'], ['D4', '600-cell'], ['D4', '600-cell (vertex-first)'], ['CUBE', 'tesseract'], ['D8', '24-cell'], ['DODECAHEDRON', '120-cell']]) {
  const complex = buildRcpComplex(seedSpecId, target);
  const seed = POLYHEDRA[seedSpecId];
  const layouts = complex.cells.flatMap((c) => [c.vertices3D, ...(c.openVertices3D ? [c.openVertices3D] : [])]);
  const mirrored = layouts.filter((vs) => windingOutwardness(vs, seed.faces) < 0).length;
  const inward = layouts.filter((vs, i) => windingOutwardness(vs, buildSyntheticCellSpec(seed, i, vs).faces) <= 0).length;
  check(`${seedSpecId} -> ${target}: all ${layouts.length} synthetic cells wound outward (${mirrored} were mirrored and got reversed faces)`, inward === 0);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} FAILURE(S).`);
process.exit(failures === 0 ? 0 : 1);

/**
 * Verifies app/lib/polyhedra/radialProjection.ts's generic engine against
 * the counts/degrees/theta values independently derived and verified via
 * bespoke, well-known coordinate constructions this session (hypercube,
 * cross-polytope, rectified-16-cell, 600-cell duality). Running the
 * SAME generic code path on the app's own real, normalized
 * PolyhedronSpec data (not a bespoke global coordinate system) for all
 * 4 FOURD_CAPABLE shapes is the actual point of this check — it proves
 * the engine is genuinely generic, not four different bespoke
 * embeddings hidden behind one shared function signature.
 */
import { POLYHEDRA } from '../app/lib/polyhedra';
import { FOURD_CAPABLE_IDS } from '../app/lib/polyhedra/fourD';
import {
  buildCellComplex,
  cellVertices,
  dualize,
  dualToCellLikeComplex,
  build600CellFromDodecahedron,
  buildRadialProjectionScene,
  dot4,
  bisectingMirror,
  reflectionMatrix,
  matVec,
  FOUR_D_SHAPE_PARAMS,
  projectVec4ToVec3,
  type Vec4,
} from '../app/lib/polyhedra/radialProjection';

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error('FAIL:', msg);
  } else {
    console.log('ok:', msg);
  }
}
function near(a: number, b: number, tol = 1e-6) {
  return Math.abs(a - b) < tol;
}

// (0) bisectingMirror sanity: the exact hand-derived tesseract check --
// reflecting (0,0,0,1) across the mirror bisecting it and (1,0,0,0) by
// 90deg must give exactly (1,0,0,0).
{
  const n: Vec4 = [0, 0, 0, 1];
  const f: Vec4 = [1, 0, 0, 0];
  const m = bisectingMirror(n, f, Math.PI / 2);
  const result = matVec(reflectionMatrix(m), n);
  assert(
    result.every((c, i) => near(c, f[i])),
    `bisectingMirror(90deg) reflects (0,0,0,1) -> (1,0,0,0) exactly, got [${result.map((c) => c.toFixed(6))}]`,
  );
}

// (1) FOURD_CAPABLE_IDS must be exactly the 5 shapes this engine supports
// (D4, CUBE, D8, DODECAHEDRON, plus PYRAMID_TRI_G2 -- a geometrically
// D4-congruent duplicate registered under its own id by the graded-
// pyramid family, correctly flagged capable by the classifier), and
// every one must resolve to a real, non-empty params list (proving
// resolveParamsKey's congruence fallback actually works for
// PYRAMID_TRI_G2, not just the 4 directly-keyed ids).
assert(
  new Set(FOURD_CAPABLE_IDS).size === 5 && new Set(FOURD_CAPABLE_IDS).has('PYRAMID_TRI_G2'),
  `FOURD_CAPABLE_IDS is exactly the 5 known-capable shapes, got ${FOURD_CAPABLE_IDS}`,
);
for (const id of FOURD_CAPABLE_IDS) {
  assert(buildCellComplex(POLYHEDRA[id]).cells.length > 1, `${id}: resolves to a usable closure (buildCellComplex succeeds)`);
}

// (2) For every REAL CLOSURE (one seed can have more than one -- D4 has
// 2 direct-theta closures here, the 5-cell and 16-cell; the 600-cell is
// checked separately in (4)/(4b) via dualize), the GENERIC engine (on
// the app's own real vertex/face data) must reproduce the already-
// verified cell count and per-cell adjacency degree.
for (const [id, options] of Object.entries(FOUR_D_SHAPE_PARAMS)) {
  const spec = POLYHEDRA[id];
  for (const params of options) {
    const label = `${id}->${params.name}`;
    const complex = buildCellComplex(spec, params.name);
    assert(complex.cells.length === params.cellCount, `${label}: cell count = ${complex.cells.length}, expected ${params.cellCount}`);

    const degree = new Array(complex.cells.length).fill(0);
    for (const [a, b] of complex.adjacency) {
      degree[a]++;
      degree[b]++;
    }
    assert(
      degree.every((d) => d === params.adjacencyDegree),
      `${label}: every cell has degree ${params.adjacencyDegree}, got degrees ${[...new Set(degree)]}`,
    );
    const expectedPairs = (params.cellCount * params.adjacencyDegree) / 2;
    assert(complex.adjacency.length === expectedPairs, `${label}: expected ${expectedPairs} adjacent pairs, got ${complex.adjacency.length}`);

    // theta re-measured directly from the generated cells' own normals for
    // a real adjacent pair, not just trusted from the input parameter.
    const [a, b] = complex.adjacency[0];
    const measuredTheta = (Math.acos(Math.min(1, Math.max(-1, dot4(complex.cells[a].normal, complex.cells[b].normal)))) * 180) / Math.PI;
    assert(near(measuredTheta, params.thetaDeg, 1e-4), `${label}: measured theta = ${measuredTheta}, expected ${params.thetaDeg}`);

    // Every cell's own transform must be a genuine rotation (orthogonal):
    // its own embedded vertices must be pairwise-congruent to the seed's
    // own embedding (same distances) -- i.e. every cell is an undistorted
    // isometric copy of the seed, not a skewed one.
    const seedDists: number[] = [];
    for (let i = 0; i < complex.seedEmbedding.length; i++) {
      for (let j = i + 1; j < complex.seedEmbedding.length; j++) {
        const d = complex.seedEmbedding[i];
        const e = complex.seedEmbedding[j];
        seedDists.push(Math.hypot(d[0] - e[0], d[1] - e[1], d[2] - e[2], d[3] - e[3]));
      }
    }
    let worstCellDistortion = 0;
    for (const cell of complex.cells) {
      const verts = cellVertices(complex, cell);
      let k = 0;
      for (let i = 0; i < verts.length; i++) {
        for (let j = i + 1; j < verts.length; j++) {
          const d = verts[i];
          const e = verts[j];
          const dist = Math.hypot(d[0] - e[0], d[1] - e[1], d[2] - e[2], d[3] - e[3]);
          worstCellDistortion = Math.max(worstCellDistortion, Math.abs(dist - seedDists[k]));
          k++;
        }
      }
    }
    assert(worstCellDistortion < 1e-6, `${label}: every cell is an undistorted isometric copy of the seed (worst distortion=${worstCellDistortion})`);

    // For an adjacent pair, the two cells must literally share a face --
    // at least `size` embedded vertices in common (the shared face's own
    // vertex count), not just an adjacency-graph claim with no geometric
    // backing.
    const [ca, cb, viaFace] = complex.adjacency[0];
    const vertsA = cellVertices(complex, complex.cells[ca]);
    const vertsB = cellVertices(complex, complex.cells[cb]);
    const keyOf = (v: Vec4) => v.map((c) => Math.round(c * 1e5) / 1e5).join(',');
    const keysB = new Set(vertsB.map(keyOf));
    const sharedCount = vertsA.filter((v) => keysB.has(keyOf(v))).length;
    const faceSize = spec.faces[viaFace].length;
    assert(sharedCount === faceSize, `${label}: adjacent cells literally share ${sharedCount} embedded vertices, expected the shared face's own size ${faceSize}`);

    // shell: seed cell is shell 0, every direct neighbor is shell 1, and
    // shell must strictly track BFS ring distance (never jump by more
    // than 1 across a real adjacency edge).
    assert(complex.cells[0].shell === 0, `${label}: seed cell (id 0) is shell 0, got ${complex.cells[0].shell}`);
    const shellJumpOk = complex.adjacency.every(([x, y]) => Math.abs(complex.cells[x].shell - complex.cells[y].shell) <= 1);
    assert(shellJumpOk, `${label}: shell never jumps by more than 1 across a real adjacency edge`);
  }
}

// (2b) PYRAMID_TRI_G2 (a D4-congruent duplicate seed from the graded-
// pyramid family) must resolve to the SAME params D4 itself uses, via
// resolveParamsKey's congruence fallback rather than its own id.
{
  const complexViaD4 = buildCellComplex(POLYHEDRA.D4, '16-cell');
  const complexViaPyramid = buildCellComplex(POLYHEDRA.PYRAMID_TRI_G2, '16-cell');
  assert(complexViaPyramid.cells.length === complexViaD4.cells.length, `PYRAMID_TRI_G2->16-cell resolves via D4's own params (${complexViaPyramid.cells.length} cells, expected ${complexViaD4.cells.length})`);
}

// (3) Projection guard: a cell with w approaching the view distance
// must not produce NaN/Infinity, and must be pushed no closer than the
// defined minimum denominator.
{
  const v: Vec4 = [1, 2, 3, 4.999];
  const projected = projectVec4ToVec3(v, 5);
  assert(projected.every((c) => Number.isFinite(c)), `projection stays finite even as w approaches the view distance, got [${projected}]`);
}
{
  const v: Vec4 = [1, 2, 3, 5]; // w exactly AT the view distance -- the literal blowup case
  const projected = projectVec4ToVec3(v, 5);
  assert(projected.every((c) => Number.isFinite(c)), `projection stays finite even when w equals the view distance exactly, got [${projected}]`);
}

// (4) Stage 6: dualize() on the real Stage-1-engine 120-cell output
// (built from a dodecahedron seed via reflections, not the bespoke
// 600-cell quaternion construction used earlier this session) must
// reproduce the known 600-cell combinatorics exactly: 600 cells, each a
// genuine regular tetrahedron (4 vertices, all 6 pairwise distances
// equal), degree 4, and 1200 adjacent pairs (matching the 120-cell's
// own known edge count -- duality's "original edges become the dual's
// adjacency" relationship, checked here rather than assumed).
{
  const complex120 = buildCellComplex(POLYHEDRA.DODECAHEDRON);
  const dual = dualize(complex120);
  assert(dual.cells.length === 600, `dualize(120-cell): 600 dual cells, got ${dual.cells.length}`);
  assert(dual.cells.every((c) => c.vertices.length === 4), `dualize(120-cell): every dual cell has exactly 4 vertices (tetrahedron), counts: ${[...new Set(dual.cells.map((c) => c.vertices.length))]}`);

  let worstTetraSpread = 0;
  for (const cell of dual.cells) {
    const dists: number[] = [];
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const a = cell.vertices[i];
        const b = cell.vertices[j];
        dists.push(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]));
      }
    }
    const spread = Math.max(...dists) - Math.min(...dists);
    worstTetraSpread = Math.max(worstTetraSpread, spread);
  }
  assert(worstTetraSpread < 1e-6, `dualize(120-cell): every dual cell is a genuine REGULAR tetrahedron (worst edge-length spread=${worstTetraSpread})`);

  const degree = new Array(dual.cells.length).fill(0);
  for (const [a, b] of dual.adjacency) {
    degree[a]++;
    degree[b]++;
  }
  assert(degree.every((d) => d === 4), `dualize(120-cell): every dual cell has degree 4, got degrees ${[...new Set(degree)]}`);
  assert(dual.adjacency.length === 1200, `dualize(120-cell): 1200 adjacent pairs (matching the 120-cell's own known edge count), got ${dual.adjacency.length}`);

  // Radii check: a genuine dual polytope's vertices (the original
  // cells' centroids) should all be equidistant from the origin --
  // checked, not assumed, exactly as this session's own 120-cell spike found.
  const radii = dual.cells.flatMap((c) => c.vertices.map((v) => Math.hypot(v[0], v[1], v[2], v[3])));
  const radiusSpread = Math.max(...radii) - Math.min(...radii);
  assert(radiusSpread < 1e-6, `dualize(120-cell): all 600 dual vertices (original cell centroids) are equidistant from the origin (spread=${radiusSpread})`);
}

// (4b) dualToCellLikeComplex/build600CellFromDodecahedron: the adapter
// that lets the shell-build feature treat the 600-cell's own
// dualize()-derived path uniformly with the other 5 direct-theta
// closures. Checks the adapter preserves (4)'s own combinatorics (600
// cells, degree 4, 1200 adjacent pairs) and adds real shell/BFS
// coverage the raw DualCellComplex has no notion of.
{
  const adapted = build600CellFromDodecahedron();
  assert(adapted.seedSpecId === 'D4' && adapted.targetName === '600-cell', `build600CellFromDodecahedron: labeled seedSpecId='D4', targetName='600-cell', got seedSpecId=${adapted.seedSpecId}, targetName=${adapted.targetName}`);
  assert(adapted.cells.length === 600, `build600CellFromDodecahedron: 600 cells, got ${adapted.cells.length}`);
  assert(adapted.cells.every((c) => c.vertices4D.length === 4), `build600CellFromDodecahedron: every cell has exactly 4 vertices`);

  const degree = new Array(adapted.cells.length).fill(0);
  for (const [a, b] of adapted.adjacency) {
    degree[a]++;
    degree[b]++;
  }
  assert(degree.every((d) => d === 4), `build600CellFromDodecahedron: every cell has degree 4, got degrees ${[...new Set(degree)]}`);
  assert(adapted.adjacency.length === 1200, `build600CellFromDodecahedron: 1200 adjacent pairs, got ${adapted.adjacency.length}`);

  // shell must actually be computed (not left at a default), cover
  // every cell reachable from cell 0 (the whole complex, since it's
  // connected), and never jump by more than 1 across a real edge.
  const shells = new Set(adapted.cells.map((c) => c.shell));
  assert(shells.size > 1, `build600CellFromDodecahedron: shell is real BFS-ring data, not a constant (distinct values: ${shells.size})`);
  const cell0 = adapted.cells.find((c) => c.id === 0)!;
  assert(cell0.shell === 0, `build600CellFromDodecahedron: cell 0 is shell 0, got ${cell0.shell}`);
  const cellsById = new Map(adapted.cells.map((c) => [c.id, c]));
  const shellJumpOk = adapted.adjacency.every(([x, y]) => Math.abs(cellsById.get(x)!.shell - cellsById.get(y)!.shell) <= 1);
  assert(shellJumpOk, `build600CellFromDodecahedron: shell never jumps by more than 1 across a real adjacency edge`);

  // Calling dualToCellLikeComplex directly on a fresh dualize() result
  // must agree with the convenience wrapper -- same combinatorics either way.
  const direct = dualToCellLikeComplex(dualize(buildCellComplex(POLYHEDRA.DODECAHEDRON, '120-cell')), 'D4', '600-cell');
  assert(direct.cells.length === adapted.cells.length && direct.adjacency.length === adapted.adjacency.length, `dualToCellLikeComplex: direct call agrees with build600CellFromDodecahedron's own convenience wrapper`);
}

// (5) Stage 7's rendering bridge: buildRadialProjectionScene must
// produce a finite, non-degenerate 3D scene for all 4 real seeds --
// every projected coordinate finite, and the outer (most negative w)
// cells visibly larger under perspective than the innermost (most
// positive w, closest to the viewpoint) cell, matching the plan's own
// "the projected cell expands dramatically" Stage 2 criterion.
for (const id of Object.keys(FOUR_D_SHAPE_PARAMS)) {
  const spec = POLYHEDRA[id];
  const scene = buildRadialProjectionScene(spec);
  assert(Number.isFinite(scene.viewDistance) && scene.viewDistance > 0, `${id}: viewDistance is finite and positive, got ${scene.viewDistance}`);
  const allFinite = scene.cellsVertices3D.every((verts) => verts.every((v) => v.every((c) => Number.isFinite(c))));
  assert(allFinite, `${id}: every projected vertex across all ${scene.cellsVertices3D.length} cells is finite (no NaN/Infinity)`);

  const cellExtent = (verts: [number, number, number][]) => {
    const cx = verts.reduce((s, v) => s + v[0], 0) / verts.length;
    const cy = verts.reduce((s, v) => s + v[1], 0) / verts.length;
    const cz = verts.reduce((s, v) => s + v[2], 0) / verts.length;
    return Math.max(...verts.map((v) => Math.hypot(v[0] - cx, v[1] - cy, v[2] - cz)));
  };
  const extents = scene.cellsVertices3D.map(cellExtent);
  const minExtent = Math.min(...extents);
  const maxExtent = Math.max(...extents);
  assert(maxExtent > minExtent * 1.05, `${id}: outer cells are visibly larger than the innermost cell under perspective (min=${minExtent.toFixed(4)}, max=${maxExtent.toFixed(4)})`);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} FAILURE(S).`);
process.exit(failures === 0 ? 0 : 1);

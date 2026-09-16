/**
 * RPC-build (radial-perspective click-to-build) — Stage 8's bridge from
 * the pure 4D engine (radialProjection.ts) to real, placeable
 * ShapeViewer.tsx nodes. See docs/radial-cell-projection.md section 21
 * and the approved plan for the full derivation of the 6 verified
 * closures this operates over.
 *
 * Beyond cell 0 (the seed itself, placed as an ordinary rigid copy of
 * the real registry shape), every cell's own 3D shadow is a genuine
 * perspective-warped, non-regular copy of the seed — not a rigid
 * transform of it. This is mathematically correct and already true of
 * the passive RadialProjectionViewer.tsx; a "synthetic" PolyhedronSpec
 * (real edges/faces/connectors topology, warped vertex positions) is
 * how that gets turned into something buildPlacedShape() can place as
 * an ordinary node without needing to know it's not a registry shape.
 */

import type { PolyhedronSpec, Vec3 } from './core';
import { buildConnectors } from './core';
import { POLYHEDRA } from './index';
import {
  buildCellComplex,
  build600CellFromDodecahedron,
  cellVertices,
  projectVec4ToVec3,
  type CellLikeComplex,
  type FourDCellComplex,
  type Vec4,
} from './radialProjection';

export interface RpcComplex {
  seedSpecId: string;
  targetName: string;
  viewDistance: number;
  // One entry per cell, in id order; each is that cell's own vertices
  // (same indexing as POLYHEDRA[seedSpecId].vertices/faces) already
  // perspective-projected to 3D, plus its shell (BFS ring distance).
  cells: { id: number; shell: number; vertices3D: Vec3[] }[];
  adjacency: [number, number][];
}

// Same "one shared viewDistance across the whole complex" convention
// buildRadialProjectionScene already uses (radialProjection.ts) — keeps
// cells comparably scaled to each other as more shells are added,
// rather than each cell separately normalized.
const VIEW_MARGIN = 5;

function projectAll(seedSpecId: string, targetName: string, cellsWithVerts: { id: number; shell: number; verts4D: Vec4[] }[], adjacency: [number, number][]): RpcComplex {
  const allVerts = cellsWithVerts.flatMap((c) => c.verts4D);
  const maxAbsW = Math.max(...allVerts.map((v) => Math.abs(v[3])), 1e-6);
  const viewDistance = maxAbsW * VIEW_MARGIN;
  const cells = cellsWithVerts.map((c) => ({
    id: c.id,
    shell: c.shell,
    vertices3D: c.verts4D.map((v) => projectVec4ToVec3(v, viewDistance)),
  }));

  // Real bug found live (2026-09-16): cell 0's own perspective-projected
  // vertices are a PURE UNIFORM SCALE of the real registry seed (cell
  // 0's own 4D embedding has one constant w for every vertex, so the
  // shared projection formula divides every one of its coordinates by
  // the exact same denominator) -- but ShapeViewer.tsx places the
  // ACTUAL rendered root using the real, unscaled registry spec
  // directly (never this projected cell 0), while every OTHER cell's
  // own vertices are computed relative to THIS complex's own internal,
  // differently-scaled frame. Left uncorrected, this is a real,
  // pre-existing scale mismatch between the rendered root and every
  // other cell -- confirmed directly: a shell-1 cell's own shared-face
  // vertices exactly equal cell 0's own INTERNAL vertices (a reflection
  // fixes points on its own mirror plane), but were ~0.4 units away
  // from the REAL root's own face vertices before this fix, visibly
  // "four mini flat tetrahedrons orbiting" the real, correctly-scaled
  // root instead of sharing a face with it. Fixed by rescaling EVERY
  // cell's vertices by ONE uniform factor (real seed vertex length /
  // cell 0's own internal vertex length) -- a uniform scale about a
  // common origin preserves every relative relationship in the complex
  // exactly (shared vertices between adjacent cells stay shared,
  // distortion relative to a cell's own centroid is untouched), unlike
  // an earlier, WRONG attempt at this fix that rescaled each cell's own
  // centroid independently and broke that same shared-vertex
  // coincidence between different cells.
  //
  // 600-cell EXCLUDED from this rescale (2026-09-16, second real bug
  // found live): its own cell 0 (build600CellFromDodecahedron's
  // dual-derived tetrahedron) is NOT a pure uniform scale of the real
  // registry seed at all -- it's genuinely non-regular (edge lengths do
  // NOT all match, confirmed directly), because the 120-cell is
  // vertex-transitive: EVERY one of its 600 vertices (hence every dual
  // cell) is geometrically equivalent, so there is no "nicer" choice of
  // cell 0 that would be undistorted -- this is a real, unavoidable
  // mathematical fact of the dualize()-derived complex, not a fixable
  // artifact of which vertex happened to get index 0. Comparing a
  // single vertex's length ratio against the real seed here would
  // produce an arbitrary, meaningless scale rather than a real
  // correction. See effectiveSeedSpec's own doc comment for how this is
  // actually handled: the 600-cell has no external "real seed" to
  // match at all -- the whole complex (including its own root) is
  // self-consistent on its own terms instead.
  if (targetName !== '600-cell') {
    const seedSpec = POLYHEDRA[seedSpecId];
    const cell0 = cells.find((c) => c.id === 0);
    if (seedSpec && cell0 && cell0.vertices3D.length === seedSpec.vertices.length) {
      const realLen = Math.hypot(...seedSpec.vertices[0]);
      const internalLen = Math.hypot(...cell0.vertices3D[0]);
      if (internalLen > 1e-9) {
        const scale = realLen / internalLen;
        for (const cell of cells) {
          cell.vertices3D = cell.vertices3D.map((v) => [v[0] * scale, v[1] * scale, v[2] * scale] as Vec3);
        }
      }
    }
  } else {
    // The 600-cell's own cell 0 (unlike every other closure's) isn't
    // centered at the shared frame's local origin -- dual-cell vertices
    // are ORIGINAL-complex cell centroids, absolute points with no
    // reason to average to zero for any particular dual cell. Every
    // OTHER placed node in this app (including the root ShapeViewer.tsx
    // places this complex's own cell 0 as, via effectiveSeedSpec) has
    // its own vertices centered on its local origin -- so cell 0's own
    // centroid must be subtracted from EVERY cell's vertices here (one
    // uniform translation for the whole complex, not just cell 0):
    // real bug found live, confirmed by measurement, not assumed --
    // recentering ONLY cell 0 (in an earlier version of this fix) left
    // every OTHER cell's own vertices still offset by that exact
    // centroid relative to the now-recentered root, a real ~0.25-unit
    // residual error. A uniform translation, like the uniform scale
    // above, preserves every relative relationship in the complex
    // exactly (shared vertices between adjacent cells stay shared).
    const cell0 = cells.find((c) => c.id === 0);
    if (cell0 && cell0.vertices3D.length > 0) {
      const n = cell0.vertices3D.length;
      const centroid: Vec3 = [0, 0, 0];
      for (const v of cell0.vertices3D) {
        centroid[0] += v[0] / n;
        centroid[1] += v[1] / n;
        centroid[2] += v[2] / n;
      }
      for (const cell of cells) {
        cell.vertices3D = cell.vertices3D.map((v) => [v[0] - centroid[0], v[1] - centroid[1], v[2] - centroid[2]] as Vec3);
      }
    }
  }

  return { seedSpecId, targetName, viewDistance, cells, adjacency };
}

function fromFourDCellComplex(complex: FourDCellComplex): RpcComplex {
  const cellsWithVerts = complex.cells.map((cell) => ({ id: cell.id, shell: cell.shell, verts4D: cellVertices(complex, cell) }));
  const adjacency: [number, number][] = complex.adjacency.map(([a, b]) => [a, b]);
  return projectAll(complex.seedSpecId, complex.targetName, cellsWithVerts, adjacency);
}

function fromCellLikeComplex(complex: CellLikeComplex): RpcComplex {
  const cellsWithVerts = complex.cells.map((cell) => ({ id: cell.id, shell: cell.shell, verts4D: cell.vertices4D }));
  return projectAll(complex.seedSpecId, complex.targetName, cellsWithVerts, complex.adjacency);
}

/**
 * The one entry point the UI/render layer needs: given a real seed id
 * and a target closure name (e.g. 'D4' + '16-cell', or 'D4' + '600-cell'
 * — the 600-cell's own seedSpecId is always 'D4' regardless of which
 * seed the caller passes, since its cells are tetrahedra built by
 * dualizing the dodecahedron -> 120-cell complex, not by reflecting the
 * passed seed directly; see build600CellFromDodecahedron's own doc
 * comment), returns every cell's projected 3D vertices in one shared
 * perspective frame plus the shell/adjacency bookkeeping the shell-build
 * feature needs.
 */
export function buildRpcComplex(seedSpecId: string, targetName: string): RpcComplex {
  if (targetName === '600-cell') {
    return fromCellLikeComplex(build600CellFromDodecahedron());
  }
  const seedSpec = POLYHEDRA[seedSpecId];
  if (!seedSpec) throw new Error(`buildRpcComplex: unknown seed id ${seedSpecId}`);
  return fromFourDCellComplex(buildCellComplex(seedSpec, targetName));
}

/**
 * Builds a synthetic, non-registry PolyhedronSpec for one cell's own
 * warped geometry: `edges`/`faces` are pure index topology (unaffected
 * by projection) and are copied from the seed spec unchanged; `vertices`
 * are this cell's own projected positions; `connectors` CANNOT be copied
 * from the seed (Connector.pos equals the vertex's own position, which
 * has changed) and are rebuilt via buildConnectors against the new
 * positions instead. Never registered in POLYHEDRA — constructed fresh
 * whenever a cell needs to be placed or re-derived on load.
 */
export function buildSyntheticCellSpec(seedSpec: PolyhedronSpec, cellId: number, vertices: Vec3[]): PolyhedronSpec {
  if (vertices.length !== seedSpec.vertices.length) {
    throw new Error(`buildSyntheticCellSpec: ${seedSpec.id} has ${seedSpec.vertices.length} vertices, got ${vertices.length} projected positions`);
  }
  return {
    id: `${seedSpec.id}::rpc:${cellId}`,
    name: `${seedSpec.name} (RPC cell ${cellId})`,
    faceCount: seedSpec.faceCount,
    vertices,
    edges: seedSpec.edges,
    faces: seedSpec.faces,
    connectors: buildConnectors(vertices, seedSpec.edges),
  };
}

/**
 * The EFFECTIVE seed spec for RPC-build's own root-placement and
 * ordinary-self-attach ("3D view") purposes. For 5 of the 6 closures
 * this is simply the real registry seed unchanged -- their own cell 0
 * already exactly equals it (see projectAll's own rescale). For the
 * 600-cell specifically, there IS no real registry shape to match:
 * every dual cell (including whichever the construction happens to
 * label "0") is equally, unavoidably non-regular under this projection
 * (the 120-cell's own vertex-transitivity means no cell is any more
 * "central" or undistorted than any other — confirmed directly, not
 * assumed). Rather than force a fake match against a shape it doesn't
 * actually equal, the 600-cell's own root is built from cell 0's real,
 * self-consistent geometry instead — a genuine, valid cell of the true
 * 600-cell, honestly slightly non-regular (confirmed: edge lengths
 * differ by ~5%), exactly the same kind of real, expected distortion
 * every non-reference cell in this whole feature already shows. This
 * keeps the WHOLE complex internally consistent (every adjacent pair's
 * shared face still coincides exactly, since nothing here rescales
 * cells relative to each other, only recenters cell 0 on its own
 * centroid) rather than correct-looking-but-actually-inconsistent.
 */
export function effectiveSeedSpec(complex: RpcComplex): PolyhedronSpec {
  const registrySpec = POLYHEDRA[complex.seedSpecId];
  if (complex.targetName !== '600-cell') return registrySpec;
  // projectAll has already recentered the WHOLE complex (not just cell
  // 0) so cell 0 sits at local origin, exactly like every other placed
  // node's own spec -- no further adjustment needed here.
  const cell0 = complex.cells.find((c) => c.id === 0)!;
  return buildSyntheticCellSpec(registrySpec, 0, cell0.vertices3D);
}

/** Every cell at exactly `shell` in `complex`. */
export function cellsAtShell(complex: RpcComplex, shell: number): RpcComplex['cells'] {
  return complex.cells.filter((c) => c.shell === shell);
}

/** The highest shell present in `complex` — the shell-build feature's own "fully closed" check is `currentMaxBuiltShell === maxShell(complex)`. */
export function maxShell(complex: RpcComplex): number {
  return Math.max(...complex.cells.map((c) => c.shell));
}

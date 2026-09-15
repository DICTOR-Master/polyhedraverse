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

/** Every cell at exactly `shell` in `complex`. */
export function cellsAtShell(complex: RpcComplex, shell: number): RpcComplex['cells'] {
  return complex.cells.filter((c) => c.shell === shell);
}

/** The highest shell present in `complex` — the shell-build feature's own "fully closed" check is `currentMaxBuiltShell === maxShell(complex)`. */
export function maxShell(complex: RpcComplex): number {
  return Math.max(...complex.cells.map((c) => c.shell));
}

/**
 * The real "k" -- how many cells of the true 4-polytope meet at one
 * shared EDGE (fourD.ts's own closureClass) -- for each of the 6
 * verified closures. Not derivable from FOUR_D_SHAPE_PARAMS directly
 * (`thetaDeg` there is the 4D reflection half-angle, a different
 * quantity from k); this is the standard Schläfli symbol's own last
 * entry for each regular 4-polytope, cross-checked against this
 * session's own angle-defect table (docs/radial-cell-projection.md
 * section 21.1): 5-cell {3,3,3} k=3, 16-cell {3,3,4} k=4, 600-cell
 * {3,3,5} k=5, tesseract {4,3,3} k=3, 24-cell {3,4,3} k=3, 120-cell
 * {5,3,3} k=3. Used by the shell-1 3D/4D open/closed toggle (RPC-build
 * UI plan) to pick the right generalized gap-closing correction
 * (fold4.ts's edgeClosingCorrectionForK).
 */
export function closureRingSize(target: string): number | undefined {
  switch (target) {
    case '5-cell':
    case 'tesseract':
    case '24-cell':
    case '120-cell':
      return 3;
    case '16-cell':
      return 4;
    case '600-cell':
      return 5;
    default:
      return undefined;
  }
}

/**
 * RCP-C2B (Radial Cell Projection, click-to-build) — Stage 8's bridge from
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
  cellVertices,
  projectVec4ToVec3,
  type FourDCellComplex,
  type Vec4,
} from './radialProjection';

export interface RcpComplex {
  seedSpecId: string;
  targetName: string;
  viewDistance: number;
  // One entry per cell, in id order; each is that cell's own vertices
  // (same indexing as POLYHEDRA[seedSpecId].vertices/faces) already
  // perspective-projected to 3D, plus its shell (BFS ring distance) and
  // its own "coordinate point" -- the real 4D point the generation
  // algorithm actually tracks this cell by (its own outward `normal`
  // scaled to the seed's embedding depth), projected through this
  // same shared perspective frame. Deliberately NOT the same as this
  // cell's own vertex centroid: the two are equal before projection
  // (every reflection here is a pure linear map, so centroid-of-
  // transformed = transform-of-centroid), but perspective projection
  // itself is nonlinear, so centroid-after-projecting and project-the-
  // one-true-coordinate diverge slightly -- this is the literal
  // generating coordinate, not an approximation of it. Purely a display
  // aid (the "show RCP coordinates" overlay) -- never affects placement.
  cells: { id: number; shell: number; vertices3D: Vec3[]; coordPoint3D: Vec3 }[];
  adjacency: [number, number][];
}

// Same "one shared viewDistance across the whole complex" convention
// buildRadialProjectionScene already uses (radialProjection.ts) — keeps
// cells comparably scaled to each other as more shells are added,
// rather than each cell separately normalized.
const VIEW_MARGIN = 5;

function projectAll(
  seedSpecId: string,
  targetName: string,
  cellsWithVerts: { id: number; shell: number; verts4D: Vec4[]; coordPoint4D: Vec4 }[],
  adjacency: [number, number][],
): RcpComplex {
  const allVerts = cellsWithVerts.flatMap((c) => c.verts4D);
  const maxAbsW = Math.max(...allVerts.map((v) => Math.abs(v[3])), 1e-6);
  const viewDistance = maxAbsW * VIEW_MARGIN;
  const cells = cellsWithVerts.map((c) => ({
    id: c.id,
    shell: c.shell,
    vertices3D: c.verts4D.map((v) => projectVec4ToVec3(v, viewDistance)),
    coordPoint3D: projectVec4ToVec3(c.coordPoint4D, viewDistance),
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
  const seedSpec = POLYHEDRA[seedSpecId];
  const cell0 = cells.find((c) => c.id === 0);
  if (seedSpec && cell0 && cell0.vertices3D.length === seedSpec.vertices.length) {
    const realLen = Math.hypot(...seedSpec.vertices[0]);
    const internalLen = Math.hypot(...cell0.vertices3D[0]);
    if (internalLen > 1e-9) {
      const scale = realLen / internalLen;
      for (const cell of cells) {
        cell.vertices3D = cell.vertices3D.map((v) => [v[0] * scale, v[1] * scale, v[2] * scale] as Vec3);
        cell.coordPoint3D = [cell.coordPoint3D[0] * scale, cell.coordPoint3D[1] * scale, cell.coordPoint3D[2] * scale];
      }
    }
  }

  return { seedSpecId, targetName, viewDistance, cells, adjacency };
}

function fromFourDCellComplex(complex: FourDCellComplex): RcpComplex {
  // This cell's own "coordinate point" (RcpComplex.cells[].coordPoint3D's
  // own doc comment) -- its outward `normal` scaled to the same depth
  // the seed's own embedding uses, i.e. exactly where the seed's own
  // reference point (depth * n0) lands once carried through this cell's
  // own (purely linear) transform.
  const depth = complex.seedEmbedding[0][3];
  const cellsWithVerts = complex.cells.map((cell) => ({
    id: cell.id,
    shell: cell.shell,
    verts4D: cellVertices(complex, cell),
    coordPoint4D: [cell.normal[0] * depth, cell.normal[1] * depth, cell.normal[2] * depth, cell.normal[3] * depth] as Vec4,
  }));
  const adjacency: [number, number][] = complex.adjacency.map(([a, b]) => [a, b]);
  return projectAll(complex.seedSpecId, complex.targetName, cellsWithVerts, adjacency);
}

/**
 * The one entry point the UI/render layer needs: given a real seed id
 * and a target closure name (e.g. 'D4' + '16-cell'), returns every
 * cell's projected 3D vertices in one shared
 * perspective frame plus the shell/adjacency bookkeeping the shell-build
 * feature needs.
 */
export function buildRcpComplex(seedSpecId: string, targetName: string): RcpComplex {
  const seedSpec = POLYHEDRA[seedSpecId];
  if (!seedSpec) throw new Error(`buildRcpComplex: unknown seed id ${seedSpecId}`);
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
    id: `${seedSpec.id}::rcp:${cellId}`,
    name: `${seedSpec.name} (RCP-C2B cell ${cellId})`,
    faceCount: seedSpec.faceCount,
    vertices,
    edges: seedSpec.edges,
    faces: seedSpec.faces,
    connectors: buildConnectors(vertices, seedSpec.edges),
  };
}

/** Every cell at exactly `shell` in `complex`. */
export function cellsAtShell(complex: RcpComplex, shell: number): RcpComplex['cells'] {
  return complex.cells.filter((c) => c.shell === shell);
}

/** The highest shell present in `complex` — the shell-build feature's own "fully closed" check is `currentMaxBuiltShell === maxShell(complex)`. */
export function maxShell(complex: RcpComplex): number {
  return Math.max(...complex.cells.map((c) => c.shell));
}

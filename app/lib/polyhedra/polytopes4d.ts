/**
 * The 4D Polytopes family (direct decisions 2026-09-30): the six convex
 * regular 4-polytopes themselves, each built by RCP-C2B from its seed
 * cell. Named by cell count with the common name alongside, grouped by
 * symmetry: A4 (5-cell), B4 (8-cell and 16-cell, duals), F4 (24-cell,
 * self-dual), H4 (120-cell and 600-cell, duals). They aren't 3D shapes,
 * so they are not registry entries: a card stands for a seed and target.
 */

import { type Vec3 } from './core';
import { POLYHEDRA } from './index';
import { buildRadialProjectionScene } from './radialProjection';
import { VERTEX_FIRST_SUFFIX } from './rcpBuild';

export type Symmetry4D = 'A4' | 'B4' | 'F4' | 'H4';

export interface Polytope4D {
  id: string;
  /** e.g. '8-cell' */
  name: string;
  /** e.g. 'tesseract' */
  common?: string;
  schlafli: string;
  cells: number;
  /** The seed cell's shape id: every cell of the polytope is this shape. */
  seed: string;
  /** The RCP target (a closure name of the seed). */
  target: string;
  /** A second RCP route, when there is one (the 600-cell from a vertex). */
  vertexFirstTarget?: string;
  symmetry: Symmetry4D;
  /** The dual polytope's id (itself for the self-dual ones). */
  dual: string;
}

export const POLYTOPES_4D: Polytope4D[] = [
  { id: 'POLYTOPE_5_CELL', name: '5-cell', common: 'simplex', schlafli: '{3,3,3}', cells: 5, seed: 'D4', target: '5-cell', symmetry: 'A4', dual: 'POLYTOPE_5_CELL' },
  { id: 'POLYTOPE_8_CELL', name: '8-cell', common: 'tesseract', schlafli: '{4,3,3}', cells: 8, seed: 'CUBE', target: 'tesseract', symmetry: 'B4', dual: 'POLYTOPE_16_CELL' },
  { id: 'POLYTOPE_16_CELL', name: '16-cell', common: 'orthoplex', schlafli: '{3,3,4}', cells: 16, seed: 'D4', target: '16-cell', symmetry: 'B4', dual: 'POLYTOPE_8_CELL' },
  { id: 'POLYTOPE_24_CELL', name: '24-cell', schlafli: '{3,4,3}', cells: 24, seed: 'D8', target: '24-cell', symmetry: 'F4', dual: 'POLYTOPE_24_CELL' },
  { id: 'POLYTOPE_120_CELL', name: '120-cell', schlafli: '{5,3,3}', cells: 120, seed: 'DODECAHEDRON', target: '120-cell', symmetry: 'H4', dual: 'POLYTOPE_600_CELL' },
  { id: 'POLYTOPE_600_CELL', name: '600-cell', schlafli: '{3,3,5}', cells: 600, seed: 'D4', target: '600-cell', vertexFirstTarget: `600-cell${VERTEX_FIRST_SUFFIX}`, symmetry: 'H4', dual: 'POLYTOPE_120_CELL' },
];

export const POLYTOPE_4D_IDS = POLYTOPES_4D.map((p) => p.id);
export const SYMMETRIES_4D: Symmetry4D[] = ['A4', 'B4', 'F4', 'H4'];

export function polytope4D(id: string): Polytope4D | undefined {
  return POLYTOPES_4D.find((p) => p.id === id);
}

/** The card and details title: '8-cell (tesseract)'. */
export function polytopeTitle(p: Polytope4D): string {
  return p.common ? `${p.name} (${p.common})` : p.name;
}

const wireCache = new Map<string, { vertices: Vec3[]; edges: [number, number][] }>();

/**
 * The finished polytope as a 3D wireframe: every cell's edges under the
 * same perspective projection View 4D shows, with shared corners and
 * edges merged.
 */
export function polytopeWireframe(id: string): { vertices: Vec3[]; edges: [number, number][] } {
  const cached = wireCache.get(id);
  if (cached) return cached;
  const p = polytope4D(id)!;
  const seed = POLYHEDRA[p.seed];
  const scene = buildRadialProjectionScene(seed, 5, p.target);
  // Merge by distance, not a rounded-string key: rounding splits -0 from
  // 0 and values either side of a rounding boundary.
  const vertices: Vec3[] = [];
  const vid = (v: Vec3) => {
    let i = vertices.findIndex((q) => Math.abs(q[0] - v[0]) < 1e-6 && Math.abs(q[1] - v[1]) < 1e-6 && Math.abs(q[2] - v[2]) < 1e-6);
    if (i < 0) { i = vertices.length; vertices.push(v); }
    return i;
  };
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (const cell of scene.cellsVertices3D) {
    for (const [a, b] of seed.edges) {
      const i = vid(cell[a]), j = vid(cell[b]);
      const key = i < j ? `${i},${j}` : `${j},${i}`;
      if (!seen.has(key)) { seen.add(key); edges.push([i, j]); }
    }
  }
  const out = { vertices, edges };
  wireCache.set(id, out);
  return out;
}

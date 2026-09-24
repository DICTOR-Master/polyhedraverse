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
  cells: { id: number; shell: number; vertices3D: Vec3[]; coordPoint3D: Vec3; openVertices3D?: Vec3[] }[];
  adjacency: [number, number][];
  // True when cell 0's projected vertices equal the registry seed exactly
  // (every cell-first closure), so the root is always the plain registry
  // shape. False for a vertex-first complex, whose cell 0 is skewed by the
  // projection: the root shows the registry seed when Open and cell 0's
  // own vertices3D when Closed.
  cell0IsSeed: boolean;
}

// Vertex-first mode (2026-09-24, 600-cell only by user choice): the build
// starts from one vertex of the seed instead of the seed cell as a whole.
// Shell 1 is the other 19 tetrahedra around that vertex, which together
// with the seed form a regular icosahedron (the 600-cell's vertex figure).
// Exposed as its own target name so it persists and caches like any
// other closure, e.g. '600-cell (vertex-first)'.
export const VERTEX_FIRST_SUFFIX = ' (vertex-first)';
const VERTEX_FIRST_CLOSURES = new Set(['600-cell']);
// The seed vertex the cluster is built around: D4's vertex 3, the apex
// opposite its base face 0.
const VERTEX_FIRST_PIVOT_INDEX = 3;

/** Splits an RCP target name into its closure (a FOUR_D_SHAPE_PARAMS name) and whether it's the vertex-first variant. */
export function parseRcpTarget(target: string): { closure: string; vertexFirst: boolean } {
  if (target.endsWith(VERTEX_FIRST_SUFFIX)) return { closure: target.slice(0, -VERTEX_FIRST_SUFFIX.length), vertexFirst: true };
  return { closure: target, vertexFirst: false };
}

/** Every buildable target for a seed with these closures: each closure, followed by its vertex-first variant where one exists. */
export function rcpTargetOptions(closureNames: string[]): string[] {
  return closureNames.flatMap((name) => (VERTEX_FIRST_CLOSURES.has(name) ? [name, `${name}${VERTEX_FIRST_SUFFIX}`] : [name]));
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

  return { seedSpecId, targetName, viewDistance, cells, adjacency, cell0IsSeed: true };
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
  const { closure, vertexFirst } = parseRcpTarget(targetName);
  if (vertexFirst) {
    if (!VERTEX_FIRST_CLOSURES.has(closure)) throw new Error(`buildRcpComplex: no vertex-first mode for ${closure}`);
    return buildVertexFirstComplex(seedSpecId, targetName, buildCellComplex(seedSpec, closure));
  }
  return fromFourDCellComplex(buildCellComplex(seedSpec, targetName));
}

const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale3 = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const unit3 = (a: Vec3): Vec3 => scale3(a, 1 / Math.hypot(...a));
const centroid3 = (vs: Vec3[]): Vec3 => scale3(vs.reduce((acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]] as Vec3, [0, 0, 0] as Vec3), 1 / vs.length);
/** Signed volume (x6) of a tetrahedron -- its sign is the vertex labelling's handedness. */
const tetOrientation = (v: Vec3[]): number => dot3(sub3(v[1], v[0]), cross3(sub3(v[2], v[0]), sub3(v[3], v[0])));

/**
 * The vertex-first variant of a (tetrahedral) closure. Same 4D cells as
 * the cell-first build, with three differences:
 *
 * - Projection axis: the pivot vertex (seed vertex VERTEX_FIRST_PIVOT_INDEX)
 *   is rotated onto +w, so the whole cluster of cells around it projects
 *   symmetrically (every one of the 600-cell's 20 is equally skewed,
 *   edge-length spread 1.051, the seed included).
 * - Shells: 0 = the seed; 1 = the rest of the pivot's cluster, ordered by
 *   distance from the seed within the cluster, so each is face-adjacent
 *   to an earlier one; 2+ = rings of distance from the whole cluster.
 *   Ids are renumbered in that order. (The one cell across the seed's
 *   base face therefore sits in shell 2 although it touches cell 0.)
 * - Frame: projected cell 0 is rotated, scaled and centred onto the
 *   registry seed (pivot direction first), so the Closed root lines up
 *   with the Open one and differs only by the projection's skew.
 *
 * Each shell-1 cell also gets `openVertices3D`: a flat, regular copy of
 * the seed unfolded across the face it shares with its cluster parent.
 * In flat 3D those copies can't close around the pivot (5 regular
 * tetrahedra around an edge leave a 7.36deg gap), which is the point of
 * showing them.
 */
function buildVertexFirstComplex(seedSpecId: string, targetName: string, complex: FourDCellComplex): RcpComplex {
  const seedVerts = POLYHEDRA[seedSpecId].vertices;
  if (seedVerts.length !== 4) throw new Error(`buildVertexFirstComplex: tetrahedral seeds only, ${seedSpecId} has ${seedVerts.length} vertices`);
  const same4 = (a: Vec4, b: Vec4) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]) < 1e-6;
  const n = complex.cells.length;
  const verts4D = complex.cells.map((cell) => cellVertices(complex, cell));
  const depth = complex.seedEmbedding[0][3];
  const coords4D = complex.cells.map((cell) => cell.normal.map((c) => c * depth) as Vec4);
  const neighbors: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of complex.adjacency) {
    neighbors[a].push(b);
    neighbors[b].push(a);
  }

  // Shell 1: BFS from the seed within the pivot's cluster.
  const pivot = verts4D[0][VERTEX_FIRST_PIVOT_INDEX];
  const inCluster = verts4D.map((vs) => vs.some((v) => same4(v, pivot)));
  const clusterOrder = [0];
  const clusterParent = new Map<number, number>();
  for (let i = 0; i < clusterOrder.length; i++) {
    const id = clusterOrder[i];
    for (const nb of [...neighbors[id]].sort((a, b) => a - b)) {
      if (inCluster[nb] && nb !== 0 && !clusterParent.has(nb)) {
        clusterParent.set(nb, id);
        clusterOrder.push(nb);
      }
    }
  }
  // Shell 2+: multi-source BFS out from the whole cluster.
  const dist = new Array<number>(n).fill(-1);
  const queue = clusterOrder.slice();
  for (const id of queue) dist[id] = 0;
  for (let i = 0; i < queue.length; i++) {
    for (const nb of neighbors[queue[i]]) {
      if (dist[nb] === -1) {
        dist[nb] = dist[queue[i]] + 1;
        queue.push(nb);
      }
    }
  }
  const shellOf = (old: number) => (old === 0 ? 0 : inCluster[old] ? 1 : dist[old] + 1);
  const outside = [...Array(n).keys()].filter((i) => !inCluster[i]).sort((a, b) => shellOf(a) - shellOf(b) || a - b);
  const order = [...clusterOrder, ...outside]; // order[newId] = old id
  const newIdOf = new Map(order.map((old, id) => [old, id]));

  // Rotate the pivot onto +w (a Householder reflection -- any orthogonal
  // map will do, since handedness is fixed up after projection).
  const r = Math.hypot(...pivot);
  const u: Vec4 = [pivot[0] / r, pivot[1] / r, pivot[2] / r, pivot[3] / r - 1];
  const uu = u[0] * u[0] + u[1] * u[1] + u[2] * u[2] + u[3] * u[3];
  const toAxis = (v: Vec4): Vec4 => {
    if (uu < 1e-12) return v;
    const k = (2 * (v[0] * u[0] + v[1] * u[1] + v[2] * u[2] + v[3] * u[3])) / uu;
    return [v[0] - k * u[0], v[1] - k * u[1], v[2] - k * u[2], v[3] - k * u[3]];
  };
  const rotated = verts4D.map((vs) => vs.map(toAxis));
  const maxAbsW = Math.max(...rotated.flat().map((v) => Math.abs(v[3])), 1e-6);
  const viewDistance = maxAbsW * VIEW_MARGIN;
  let projected = rotated.map((vs) => vs.map((v) => projectVec4ToVec3(v, viewDistance)));
  let coords = coords4D.map((c) => projectVec4ToVec3(toAxis(c), viewDistance));

  // Align projected cell 0 onto the registry seed: mirror if handedness
  // differs, then rotate the pivot direction (and one more vertex) onto
  // the seed's, scale to the same RMS size, and centre.
  if (Math.sign(tetOrientation(projected[0])) !== Math.sign(tetOrientation(seedVerts))) {
    const mirror = (v: Vec3): Vec3 => [-v[0], v[1], v[2]];
    projected = projected.map((vs) => vs.map(mirror));
    coords = coords.map(mirror);
  }
  const frame = (vs: Vec3[]): [Vec3, Vec3, Vec3, Vec3] => {
    const c = centroid3(vs);
    const e1 = unit3(sub3(vs[VERTEX_FIRST_PIVOT_INDEX], c));
    const other = sub3(vs[(VERTEX_FIRST_PIVOT_INDEX + 1) % 4], c);
    const e2 = unit3(sub3(other, scale3(e1, dot3(other, e1))));
    return [c, e1, e2, cross3(e1, e2)];
  };
  const rms = (vs: Vec3[], c: Vec3) => Math.sqrt(vs.reduce((acc, v) => acc + dot3(sub3(v, c), sub3(v, c)), 0) / vs.length);
  const [cP, p1, p2, p3] = frame(projected[0]);
  const [cR, r1, r2, r3] = frame(seedVerts);
  const k = rms(seedVerts, cR) / rms(projected[0], cP);
  const align = (v: Vec3): Vec3 => {
    const d = sub3(v, cP);
    const [a, b, c] = [dot3(d, p1) * k, dot3(d, p2) * k, dot3(d, p3) * k];
    return [cR[0] + a * r1[0] + b * r2[0] + c * r3[0], cR[1] + a * r1[1] + b * r2[1] + c * r3[1], cR[2] + a * r1[2] + b * r2[2] + c * r3[2]];
  };
  projected = projected.map((vs) => vs.map(align));
  coords = coords.map(align);

  // Open view: unfold the cluster flat, each cell reflected across the
  // face it shares with its parent. Positions stay indexed like the
  // cell's own 4D vertices while unfolding.
  const flat = new Map<number, Vec3[]>([[0, seedVerts.map((v) => [...v] as Vec3)]]);
  for (const id of clusterOrder.slice(1)) {
    const parentId = clusterParent.get(id)!;
    const parentFlat = flat.get(parentId)!;
    const own = verts4D[id];
    const parent4D = verts4D[parentId];
    const matchInParent = own.map((v) => parent4D.findIndex((q) => same4(v, q)));
    const loneOwn = matchInParent.indexOf(-1);
    const loneParent = parent4D.findIndex((q) => !own.some((v) => same4(v, q)));
    const shared = matchInParent.filter((j) => j !== -1).map((j) => parentFlat[j]);
    const normal = unit3(cross3(sub3(shared[1], shared[0]), sub3(shared[2], shared[0])));
    const apex = parentFlat[loneParent];
    const reflected = sub3(apex, scale3(normal, 2 * dot3(sub3(apex, shared[0]), normal)));
    flat.set(id, own.map((_, i) => (i === loneOwn ? reflected : parentFlat[matchInParent[i]])));
  }
  // A reflected copy has the opposite handedness, which would render
  // inside-out under the seed's face winding; swapping two non-pivot
  // positions restores it (a tetrahedron's faces are every vertex triple).
  const [s1, s2] = [0, 1, 2, 3].filter((i) => i !== VERTEX_FIRST_PIVOT_INDEX);
  const seedHandedness = Math.sign(tetOrientation(seedVerts));
  for (const [id, vs] of flat) {
    if (Math.sign(tetOrientation(vs)) !== seedHandedness) flat.set(id, vs.map((v, i) => (i === s1 ? vs[s2] : i === s2 ? vs[s1] : v)));
  }

  const cells = order.map((old, id) => ({
    id,
    shell: shellOf(old),
    vertices3D: projected[old],
    coordPoint3D: coords[old],
    ...(id > 0 && flat.has(old) ? { openVertices3D: flat.get(old)! } : {}),
  }));
  const adjacency = complex.adjacency.map(([a, b]) => [newIdOf.get(a)!, newIdOf.get(b)!] as [number, number]);
  return { seedSpecId, targetName, viewDistance, cells, adjacency, cell0IsSeed: false };
}

/** The root's own spec for the given view: the registry seed, except a Closed vertex-first root, which shows cell 0's projected (skewed) shape. */
export function rootSpecForView(complex: RcpComplex, view3D: boolean): PolyhedronSpec {
  const registrySpec = POLYHEDRA[complex.seedSpecId];
  if (view3D || complex.cell0IsSeed) return registrySpec;
  return buildSyntheticCellSpec(registrySpec, 0, complex.cells[0].vertices3D);
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

/**
 * Face registration (direct request 2026-10-01: "double or up to triple
 * face registration" -- the regular-hexagon elongated dodecahedron was
 * hard to build with, because the one placement that continues the tiling
 * was one of six that all sit flush on the clicked face).
 *
 * Ranks face-attach options (faceAttach.ts) against the pieces already
 * built:
 *
 *   - each option counts the faces it sits flush on: the clicked face, plus
 *     every other face of the new piece that lands exactly on a face of a
 *     built piece (same corners), so a piece slotted into a corner shows 2
 *     or 3;
 *   - options that would cut into a built piece are hidden (exact for
 *     convex pieces: a separating-plane test; a piece that isn't convex is
 *     never hidden); if every option clashes, all are kept so attach still
 *     works;
 *   - order: most flush faces first; then, for space-fillers attaching to
 *     their own kind, the copy simply slid across (the one that continues
 *     the tiling); then the original order.
 *
 * Shared by ShapeViewer and verify-face-registration.ts, so the checks test
 * exactly what the app does.
 */
import * as THREE from 'three';
import type { PolyhedronSpec } from './polyhedra/core';
import type { FaceAttachOption } from './faceAttach';

/** A built piece, in world space. */
export interface BuiltPiece {
  spec: PolyhedronSpec;
  matrixWorld: THREE.Matrix4;
}

export interface RankedOption {
  option: FaceAttachOption;
  /** Faces this placement sits flush on, the clicked face included. */
  flushFaces: number;
  /** The new piece's faces that land on a built face, with that piece and face. */
  matches: { incomingFace: number; piece: number; face: number }[];
  /** True for the slid-across copy of a space-filler (continues the tiling). */
  tiling: boolean;
}

const KEY_GRID = 1e-4;
const keyOf = (p: THREE.Vector3) => `${Math.round(p.x / KEY_GRID)},${Math.round(p.y / KEY_GRID)},${Math.round(p.z / KEY_GRID)}`;
const centroid = (pts: THREE.Vector3[]) => pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
const worldVerts = (spec: PolyhedronSpec, m: THREE.Matrix4) => spec.vertices.map((v) => new THREE.Vector3(...v).applyMatrix4(m));

/** Same polygon (same corners, any order), within tol. */
function samePolygon(a: THREE.Vector3[], b: THREE.Vector3[], tol: number): boolean {
  return a.length === b.length && a.every((p) => b.some((q) => p.distanceToSquared(q) < tol * tol));
}

/** Index of built faces by their centre, for fast flush lookups. */
export class FaceIndex {
  private byKey = new Map<string, { piece: number; face: number; corners: THREE.Vector3[] }[]>();
  readonly pieces: { verts: THREE.Vector3[]; spec: PolyhedronSpec; centre: THREE.Vector3; radius: number }[] = [];

  constructor(built: BuiltPiece[]) {
    built.forEach((b, pi) => {
      const verts = worldVerts(b.spec, b.matrixWorld);
      const centre = centroid(verts.map((v) => v.clone()));
      const radius = Math.max(...verts.map((v) => v.distanceTo(centre)));
      this.pieces.push({ verts, spec: b.spec, centre, radius });
      b.spec.faces.forEach((f, fi) => {
        const corners = f.map((i) => verts[i]);
        const c = centroid(corners.map((p) => p.clone()));
        // File each face under its own cell and the neighbouring ones, so a
        // centre on a grid boundary is still found.
        const k = keyOf(c);
        if (!this.byKey.has(k)) this.byKey.set(k, []);
        this.byKey.get(k)!.push({ piece: pi, face: fi, corners });
      });
    });
  }

  /** Built faces with exactly these corners. */
  find(corners: THREE.Vector3[], tol: number): { piece: number; face: number }[] {
    const c = centroid(corners.map((p) => p.clone()));
    const out: { piece: number; face: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const k = keyOf(new THREE.Vector3(c.x + dx * KEY_GRID, c.y + dy * KEY_GRID, c.z + dz * KEY_GRID));
      for (const e of this.byKey.get(k) ?? []) if (samePolygon(corners, e.corners, tol) && !out.some((o) => o.piece === e.piece && o.face === e.face)) out.push({ piece: e.piece, face: e.face });
    }
    return out;
  }
}

/** Whether a solid is convex: every corner on or inside every face plane. */
const convexCache = new WeakMap<PolyhedronSpec, boolean>();
export function isConvex(spec: PolyhedronSpec): boolean {
  const hit = convexCache.get(spec);
  if (hit !== undefined) return hit;
  const V = spec.vertices.map((v) => new THREE.Vector3(...v));
  const scale = Math.max(...V.map((v) => v.length()), 1e-9);
  const ok = spec.faces.every((f) => {
    const n = new THREE.Vector3().subVectors(V[f[1]], V[f[0]]).cross(new THREE.Vector3().subVectors(V[f[2]], V[f[1]])).normalize();
    const d = n.dot(V[f[0]]);
    const side = V.map((v) => n.dot(v) - d);
    return side.every((s) => s <= 1e-7 * scale) || side.every((s) => s >= -1e-7 * scale);
  });
  convexCache.set(spec, ok);
  return ok;
}

/** Axes for a separating-plane test: face normals of both and cross products of edge directions. */
function axesOf(spec: PolyhedronSpec, verts: THREE.Vector3[]): { normals: THREE.Vector3[]; edges: THREE.Vector3[] } {
  const normals = spec.faces.map((f) => new THREE.Vector3().subVectors(verts[f[1]], verts[f[0]]).cross(new THREE.Vector3().subVectors(verts[f[2]], verts[f[1]])).normalize());
  const edges: THREE.Vector3[] = [];
  for (const [i, j] of spec.edges) {
    const e = new THREE.Vector3().subVectors(verts[j], verts[i]).normalize();
    if (!edges.some((x) => Math.abs(Math.abs(x.dot(e)) - 1) < 1e-9)) edges.push(e);
  }
  return { normals, edges };
}

/** True when two convex solids share interior volume (touching faces, edges or corners don't count). */
export function convexOverlap(aSpec: PolyhedronSpec, a: THREE.Vector3[], bSpec: PolyhedronSpec, b: THREE.Vector3[], eps: number): boolean {
  const A = axesOf(aSpec, a), B = axesOf(bSpec, b);
  const axes = [...A.normals, ...B.normals];
  for (const e of A.edges) for (const f of B.edges) {
    const c = new THREE.Vector3().crossVectors(e, f);
    if (c.lengthSq() > 1e-12) axes.push(c.normalize());
  }
  for (const ax of axes) {
    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
    for (const p of a) { const d = ax.dot(p); if (d < aMin) aMin = d; if (d > aMax) aMax = d; }
    for (const p of b) { const d = ax.dot(p); if (d < bMin) bMin = d; if (d > bMax) bMax = d; }
    if (aMax <= bMin + eps || bMax <= aMin + eps) return false; // a separating plane
  }
  return true;
}

/**
 * Ranks and filters face-attach options against the built pieces (see the
 * file comment). `target` is the built piece being attached to, by index
 * into `built` (-1 if it isn't there); `tilingFirst` is whether the incoming piece is a
 * space-filler attaching to its own kind.
 */
export function rankFaceAttachOptions(
  options: FaceAttachOption[],
  spec: PolyhedronSpec,
  built: BuiltPiece[],
  target: number,
  targetFaceIndex: number,
  tilingFirst: boolean,
  index: FaceIndex = new FaceIndex(built),
): RankedOption[] {
  const scale = Math.max(...spec.vertices.map((v) => Math.hypot(...v)), 1e-9);
  const tol = 1e-5 * Math.max(1, scale);
  const t = index.pieces[target]; // undefined when the target isn't among the built pieces given
  // The slid copy: the target moved across its clicked face (twice the face centre's offset).
  const slid = tilingFirst && t
    ? (() => {
        const fc = centroid(built[target].spec.faces[targetFaceIndex].map((i) => t.verts[i].clone()));
        const shift = fc.sub(t.centre).multiplyScalar(2);
        return t.verts.map((v) => v.clone().add(shift));
      })()
    : null;
  const convex = isConvex(spec);
  const ranked: (RankedOption & { clash: boolean; order: number })[] = options.map((option, order) => {
    const m = new THREE.Matrix4().compose(option.position, option.quaternion, new THREE.Vector3(1, 1, 1));
    const verts = worldVerts(spec, m);
    const matches: RankedOption['matches'] = [];
    spec.faces.forEach((f, fi) => {
      for (const hit of index.find(f.map((i) => verts[i]), tol)) matches.push({ incomingFace: fi, piece: hit.piece, face: hit.face });
    });
    const centre = centroid(verts.map((v) => v.clone()));
    const radius = Math.max(...verts.map((v) => v.distanceTo(centre)));
    const clash = convex && index.pieces.some((p) => p.centre.distanceTo(centre) < p.radius + radius - tol && isConvex(p.spec) && convexOverlap(spec, verts, p.spec, p.verts, tol));
    const tiling = !!slid && samePolygon(verts, slid, tol);
    const faces = new Set(matches.map((x) => x.incomingFace));
    return { option, flushFaces: Math.max(1, faces.size), matches, tiling, clash, order };
  });
  const clear = ranked.filter((r) => !r.clash);
  const keep = clear.length > 0 ? clear : ranked;
  keep.sort((x, y) => y.flushFaces - x.flushFaces || Number(y.tiling) - Number(x.tiling) || x.order - y.order);
  return keep.map(({ option, flushFaces, matches, tiling }) => ({ option, flushFaces, matches, tiling }));
}

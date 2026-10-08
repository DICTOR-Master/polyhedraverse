/**
 * The Sunstar Lattice pair (direct request 2026-10-08: "add the Sunstar to Polyhedraverse with a
 * seamed dodecahedron"), from Kaleidohedra. Names by DICTO.
 *
 * Regular dodecahedra on the even cells of a cubic lattice (their densest lattice packing) leave one
 * hole in each odd cell, and the hole is exactly a Dogstar: an 8-pointed partial stellation of a
 * dodecahedron 1/phi^3 their size, with edges only 2/phi^4, 2/phi^3, 2/phi^2 and 2/phi (cube edge 2).
 * A dodecahedron with the 6 Dogstars on its faces is a Sunstar, the sun with its sun dogs.
 *
 * A dodecahedron's pentagon touches Dogstars on part of it and other dodecahedra on the rest, so a
 * plain pentagon can't face-attach to a Dogstar. Both pieces here are seamed from the packing
 * itself: every face is cut along the edges of every other piece's face lying in the same plane, so
 * any two faces that touch in the lattice are cut into the same pieces and attach exactly.
 *
 * Built at dodecahedron edge 1 (cube edge phi). scripts/verify-sunstar.ts checks them, and that the
 * Dogstar is krp-core's recorded object.
 */
import type { PolyhedronSpec, Vec3 } from './core';
import { buildConnectors } from './core';
import { request } from '../../../krp-core/src/request.js';
import { objectId } from '../../../krp-core/src/vocabulary.js';

const PHI = (1 + Math.sqrt(5)) / 2;
const K = PHI / 2; // cube edge 2 -> dodecahedron edge 1
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));
const area = (P: Vec3[]) => { let s: Vec3 = [0, 0, 0]; for (let i = 1; i + 1 < P.length; i++) s = add(s, cross(sub(P[i], P[0]), sub(P[i + 1], P[0]))); return Math.hypot(...s) / 2; };

/** Split a convex polygon by the plane n.p = d into the parts above and below (null if empty). */
function split(P: Vec3[], n: Vec3, d: number): { above: Vec3[] | null; below: Vec3[] | null } {
  const above: Vec3[] = [], below: Vec3[] = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    const da = dot(a, n) - d, db = dot(b, n) - d;
    if (da >= -1e-12) above.push(a);
    if (da <= 1e-12) below.push(a);
    if ((da > 1e-12 && db < -1e-12) || (da < -1e-12 && db > 1e-12)) { const x = add(a, scale(sub(b, a), da / (da - db))); above.push(x); below.push(x); }
  }
  const clean = (Q: Vec3[]) => Q.filter((p, i) => Math.hypot(...sub(p, Q[(i + 1) % Q.length])) > 1e-9);
  const ok = (Q: Vec3[]) => Q.length >= 3 && area(Q) > 1e-9;
  const A = clean(above), B = clean(below);
  return { above: ok(A) ? A : null, below: ok(B) ? B : null };
}

// Both pieces come from krp-core, the geometry shared with Kaleidohedra and Rhombiverse (KRP
// stage 3, DICTO's decision 2026-10-08): requested by ID, regenerated there, in its units (cube
// edge 2), the same faces this file used to build itself. Seaming and the edge-1 scale stay here.
export const DOGSTAR_REQUEST = request(objectId('ekp/dogstar'));
const DODECA = request(objectId('ekp/dodecahedron')).faces as Vec3[][];
const isEven = (s: Vec3) => (((s[0] + s[1] + s[2]) % 2) + 2) % 2 === 0;
const SITES: Vec3[] = [];
for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) SITES.push([x, y, z]);

/**
 * Every piece face of the packing near the origin, in world units (cube edge 2): dodecahedra on the
 * even sites, Dogstars on the odd sites. Used only for seaming.
 */
const DOGSTAR = DOGSTAR_REQUEST.faces as Vec3[][];
function packingFaces(): Vec3[][] {
  const out: Vec3[][] = [];
  for (const s of SITES) {
    const c = scale(s, 2);
    for (const f of isEven(s) ? DODECA : DOGSTAR) out.push(f.map((p) => add(p, c)));
  }
  return out;
}

/**
 * Seam a piece's faces (world units): cut each along the edges of every packing face lying in the
 * same plane, so touching faces of two pieces are cut into the same cells.
 */
function seam(faces: Vec3[][], all: Vec3[][]): Vec3[][] {
  const planeOf = (f: Vec3[]) => { const n = unit(cross(sub(f[1], f[0]), sub(f[2], f[0]))); return { n, d: dot(n, f[0]) }; };
  const out: Vec3[][] = [];
  for (const f of faces) {
    const { n, d } = planeOf(f);
    const coplanar = all.filter((g) => g.every((p) => Math.abs(Math.abs(dot(n, p)) - Math.abs(d)) < 1e-9 && Math.abs(dot(n, p) - d) < 1e-9));
    let cells: Vec3[][] = [f];
    for (const g of coplanar) g.forEach((a, i) => {
      const b = g[(i + 1) % g.length];
      const m = unit(cross(n, sub(b, a))); // the plane through edge ab, square to the face
      const dm = dot(m, a);
      cells = cells.flatMap((C) => { const { above, below } = split(C, m, dm); return [above, below].filter(Boolean) as Vec3[][]; });
    });
    out.push(...cells);
  }
  return out;
}

/** A spec from world-unit faces centred on `centre`: vertices merged, scaled to dodecahedron edge 1, wound outward. */
function specOf(id: string, name: string, faces: Vec3[][], centre: Vec3): PolyhedronSpec {
  const verts: Vec3[] = [];
  const at = (p: Vec3) => { let i = verts.findIndex((q) => Math.hypot(...sub(p, q)) < 1e-7); if (i < 0) { verts.push(p); i = verts.length - 1; } return i; };
  // Corners that lie on another face's edge (a T-junction where a seam meets an edge) join that face too,
  // so the surface stays closed edge for edge.
  const local = faces.map((f) => f.map((p) => sub(p, centre)));
  local.forEach((f) => f.forEach(at));
  const idx = local.map((f) => {
    const ring: number[] = [];
    f.forEach((a, i) => {
      const b = f[(i + 1) % f.length];
      ring.push(at(a));
      const ab = sub(b, a), L2 = dot(ab, ab);
      const on = verts.map((q, k) => ({ k, t: dot(sub(q, a), ab) / L2, q })).filter(({ t, q }) => t > 1e-7 && t < 1 - 1e-7 && Math.hypot(...sub(q, add(a, scale(ab, t)))) < 1e-7);
      on.sort((x, y) => x.t - y.t).forEach(({ k }) => ring.push(k));
    });
    return ring;
  });
  // Wind outward: consistent across shared edges, then all flipped if the volume came out negative.
  const done = new Array(idx.length).fill(false);
  const byEdge = new Map<string, number[]>();
  idx.forEach((f, i) => f.forEach((a, j) => { const b = f[(j + 1) % f.length]; const k = a < b ? `${a}-${b}` : `${b}-${a}`; byEdge.set(k, [...(byEdge.get(k) ?? []), i]); }));
  for (let start = 0; start < idx.length; start++) {
    if (done[start]) continue;
    done[start] = true;
    const queue = [start];
    while (queue.length) {
      const i = queue.shift()!;
      const f = idx[i];
      f.forEach((a, j) => {
        const b = f[(j + 1) % f.length];
        for (const o of byEdge.get(a < b ? `${a}-${b}` : `${b}-${a}`) ?? []) {
          if (o === i || done[o]) continue;
          if (idx[o].some((c, m) => c === a && idx[o][(m + 1) % idx[o].length] === b)) idx[o].reverse();
          done[o] = true;
          queue.push(o);
        }
      });
    }
  }
  const vol = idx.reduce((t, f) => { for (let m = 1; m + 1 < f.length; m++) t += dot(verts[f[0]], cross(verts[f[m]], verts[f[m + 1]])); return t; }, 0);
  if (vol < 0) idx.forEach((f) => f.reverse());
  const scaled = verts.map((v) => scale(v, K));
  const edgeSet = new Map<string, [number, number]>();
  idx.forEach((f) => f.forEach((a, j) => { const b = f[(j + 1) % f.length]; edgeSet.set(a < b ? `${a}-${b}` : `${b}-${a}`, a < b ? [a, b] : [b, a]); }));
  const edges = [...edgeSet.values()];
  return { id, name, faceCount: idx.length, vertices: scaled, edges, faces: idx, connectors: buildConnectors(scaled, edges), attachableFaceIndices: idx.map((_, i) => i) };
}

const ALL = packingFaces();
export const SUNSTAR_ADDITIONS: Record<string, PolyhedronSpec> = {
  SEAMED_DODECAHEDRON: specOf('SEAMED_DODECAHEDRON', 'Dodecahedron, seamed for Dogstars', seam(DODECA, ALL), [0, 0, 0]),
  DOGSTAR: specOf('DOGSTAR', 'Dogstar', seam(DOGSTAR.map((f) => f.map((p) => add(p, [2, 0, 0]))), ALL), [2, 0, 0]),
};
export const SUNSTAR_ADDITION_IDS = Object.keys(SUNSTAR_ADDITIONS);

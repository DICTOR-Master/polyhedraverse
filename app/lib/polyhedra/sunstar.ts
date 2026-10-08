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
 * Built at dodecahedron edge 1 (cube edge phi). scripts/verify-sunstar.ts checks them.
 */
import type { PolyhedronSpec, Vec3 } from './core';
import { buildConnectors } from './core';

const PHI = (1 + Math.sqrt(5)) / 2;
const K = PHI / 2; // cube edge 2 -> dodecahedron edge 1
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));
const centroid = (P: Vec3[]): Vec3 => scale(P.reduce(add, [0, 0, 0]), 1 / P.length);
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

// The regular dodecahedron of the cell, cube edge 2: the cube's corners and (0, +-1/phi, +-phi) cyclic.
function dodecahedronFaces(): Vec3[][] {
  const V: Vec3[] = [];
  for (const x of [1, -1]) for (const y of [1, -1]) for (const z of [1, -1]) V.push([x, y, z]);
  for (const a of [1, -1]) for (const b of [1, -1]) V.push([0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [b * PHI, 0, a / PHI]);
  const faces: Vec3[][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) for (let k = j + 1; k < V.length; k++) {
    const n = cross(sub(V[j], V[i]), sub(V[k], V[i]));
    if (Math.hypot(...n) < 1e-9) continue;
    const u = unit(n), d = dot(u, V[i]);
    const side = V.map((p) => dot(u, p) - d);
    if (!(side.every((s) => s <= 1e-9) || side.every((s) => s >= -1e-9))) continue;
    const on = V.map((_, q) => q).filter((q) => Math.abs(side[q]) < 1e-9);
    const key = on.join();
    if (seen.has(key)) continue;
    seen.add(key);
    const out = side.every((s) => s <= 1e-9) ? u : scale(u, -1);
    const c = centroid(on.map((q) => V[q]));
    const e1 = unit(sub(V[on[0]], c)), e2 = cross(out, e1);
    faces.push(on.map((q) => V[q]).sort((p, q) => Math.atan2(dot(sub(p, c), e2), dot(sub(p, c), e1)) - Math.atan2(dot(sub(q, c), e2), dot(sub(q, c), e1))));
  }
  return faces;
}
const DODECA = dodecahedronFaces();
const DODECA_H = DODECA.map((f) => { const n = unit(cross(sub(f[1], f[0]), sub(f[2], f[0]))); return { n, d: dot(n, f[0]) }; });
const inDodecaAt = (p: Vec3, c: Vec3) => DODECA_H.every(({ n, d }) => dot(n, sub(p, c)) < d - 1e-12);
const isEven = (s: Vec3) => (((s[0] + s[1] + s[2]) % 2) + 2) % 2 === 0;
const SITES: Vec3[] = [];
for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) SITES.push([x, y, z]);

/** The Dogstar of the odd cell at the origin, as faces in cube-edge-2 units: the hole's boundary. */
function dogstarFaces(): Vec3[][] {
  const evens = SITES.filter((s) => !isEven(s) && Math.max(...s.map(Math.abs)) <= 1).map((s) => scale(s, 2)); // even relative to an odd origin
  const inHole = (p: Vec3) => p.every((c) => Math.abs(c) <= 1 + 1e-9) && !evens.some((c) => inDodecaAt(p, c));
  const r = DODECA_H[0].d / PHI ** 3;
  const planes = DODECA_H.map(({ n }) => ({ n, d: r }));
  const faces: Vec3[][] = [];
  for (const pl of planes) {
    const u = unit(cross(pl.n, Math.abs(pl.n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0])), v = cross(pl.n, u);
    const o = scale(pl.n, pl.d);
    let Q: Vec3[] | null = [[-9, -9], [9, -9], [9, 9], [-9, 9]].map(([a, b]) => add(o, add(scale(u, a), scale(v, b))));
    for (let a = 0; a < 3 && Q; a++) for (const sg of [1, -1]) { const n: Vec3 = [0, 0, 0]; n[a] = sg; Q = Q && split(Q, n, 1).below; }
    if (!Q) continue;
    let cells: Vec3[][] = [Q];
    for (const sp of planes) if (sp !== pl) cells = cells.flatMap((C) => { const { above, below } = split(C, sp.n, sp.d); return [above, below].filter(Boolean) as Vec3[][]; });
    for (const C of cells) {
      const c = centroid(C);
      const back = inHole(sub(c, scale(pl.n, 1e-6))), front = inHole(add(c, scale(pl.n, 1e-6)));
      if (back === front) continue;
      faces.push(C);
    }
  }
  return faces;
}

/**
 * Every piece face of the packing near the origin, in world units (cube edge 2): dodecahedra on the
 * even sites, Dogstars on the odd sites. Used only for seaming.
 */
const DOGSTAR = dogstarFaces();
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

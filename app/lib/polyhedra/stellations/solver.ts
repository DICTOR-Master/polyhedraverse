/**
 * Exact face pieces of a Catalan solid's stellations (direct request
 * 2026-09-30: real-math stellation sizes, not decorative heights).
 *
 * Layer k of a solid's stellation diagram is every point that exactly k
 * face planes separate from the centre; the k-th stellation is layers
 * 0..k together. Cutting it along the cone from the centre through one
 * face F gives a piece whose base is exactly F: one on every face builds
 * the whole k-th stellation, the outer faces lying in real face planes
 * and the cone cuts being the seams between neighbouring pieces. For
 * k = 1 the piece is the pyramid whose sides lie in the neighbouring
 * face planes, with its apex over F's incircle centre.
 *
 * Method: start from the cone over F (above F's plane, inside a bounding
 * box), split it by every other face plane in turn, dropping any cell
 * already beyond more than k planes. What remains are cells of the plane
 * arrangement, so two kept cells either side of a plane share exactly
 * the same facet: a facet is on the piece's surface unless its mirror
 * cell (same sides, that one plane flipped) was also kept. Surface
 * facets on the same plane then merge into one polygon per region.
 */

import { type Vec3 } from '../core';

type Plane = { n: Vec3; d: number }; // the points with n.x <= d are inside
type Face = { plane: number; pts: Vec3[] }; // a convex polygon, index into the planes list
type Cell = { faces: Face[]; side: Int8Array; count: number }; // side[i] = +1 beyond face plane i, -1 inside

const EPS = 1e-9;
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));

/** Splits a convex polygon by a plane into its inside (n.x <= d) and outside parts, plus the points on the cut. */
function splitPolygon(pts: Vec3[], p: Plane): { inside: Vec3[]; outside: Vec3[]; cut: Vec3[] } {
  const inside: Vec3[] = [];
  const outside: Vec3[] = [];
  const cut: Vec3[] = [];
  const s = pts.map((q) => dot(p.n, q) - p.d);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const sa = s[i];
    const sb = s[(i + 1) % pts.length];
    if (sa <= EPS) inside.push(a);
    if (sa >= -EPS) outside.push(a);
    if (Math.abs(sa) <= EPS) cut.push(a);
    if ((sa < -EPS && sb > EPS) || (sa > EPS && sb < -EPS)) {
      const x = add(a, scale(sub(b, a), sa / (sa - sb)));
      inside.push(x);
      outside.push(x);
      cut.push(x);
    }
  }
  return { inside, outside, cut };
}

/** Orders coplanar points into a convex polygon around their centroid. */
function orderConvex(pts: Vec3[], normal: Vec3): Vec3[] {
  const uniq: Vec3[] = [];
  for (const q of pts) if (!uniq.some((u) => Math.hypot(...sub(u, q)) < 1e-7)) uniq.push(q);
  if (uniq.length < 3) return uniq;
  const c = scale(uniq.reduce(add, [0, 0, 0] as Vec3), 1 / uniq.length);
  const u = unit(sub(uniq[0], c));
  const v = cross(normal, u);
  return uniq.sort((a, b) => Math.atan2(dot(sub(a, c), v), dot(sub(a, c), u)) - Math.atan2(dot(sub(b, c), v), dot(sub(b, c), u)));
}

function area(pts: Vec3[]): number {
  let s: Vec3 = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) s = add(s, cross(pts[i], pts[(i + 1) % pts.length]));
  return Math.hypot(...s) / 2;
}

/** Splits a convex cell by plane `pi`, returning the inside and outside cells (either may be empty). */
function splitCell(cell: Cell, planes: Plane[], pi: number): { inside: Cell | null; outside: Cell | null } {
  const p = planes[pi];
  const inF: Face[] = [];
  const outF: Face[] = [];
  const cut: Vec3[] = [];
  for (const f of cell.faces) {
    const r = splitPolygon(f.pts, p);
    if (r.inside.length >= 3 && area(r.inside) > 1e-12) inF.push({ plane: f.plane, pts: r.inside });
    if (r.outside.length >= 3 && area(r.outside) > 1e-12) outF.push({ plane: f.plane, pts: r.outside });
    cut.push(...r.cut);
  }
  const cap = orderConvex(cut, p.n);
  const hasCap = cap.length >= 3 && area(cap) > 1e-12;
  const make = (faces: Face[], sideVal: number): Cell | null => {
    if (faces.length < 3 || !hasCap) return faces.length >= 4 ? { faces, side: cell.side, count: cell.count } : null;
    const side = cell.side.slice();
    side[pi] = sideVal;
    return { faces: [...faces, { plane: pi, pts: cap }], side, count: cell.count + (sideVal > 0 ? 1 : 0) };
  };
  if (!hasCap) {
    // The plane misses the cell's interior: the whole cell is on one side.
    const probe = cell.faces.flatMap((f) => f.pts).reduce((m, q) => Math.max(m, dot(p.n, q) - p.d), -Infinity);
    const side = cell.side.slice();
    if (probe <= EPS) { side[pi] = -1; return { inside: { ...cell, side }, outside: null }; }
    side[pi] = 1;
    return { inside: null, outside: { ...cell, side, count: cell.count + 1 } };
  }
  return { inside: make(inF, -1), outside: make(outF, 1) };
}

export interface StellationPiece {
  vertices: Vec3[];
  faces: number[][]; // outward-wound
  baseFace: number; // index of the face lying on F (the attach face)
}

/**
 * The piece of the k-th stellation over face `faceIndex` of a Catalan
 * solid (vertices centred on the origin). `faceVertices` are that
 * solid's own vertices, so the piece's base is exactly congruent to it.
 */
export function stellationPiece(solidVertices: Vec3[], solidFaces: number[][], faceIndex: number, k: number): StellationPiece {
  const planes: Plane[] = solidFaces.map((f) => {
    const n = unit(cross(sub(solidVertices[f[1]], solidVertices[f[0]]), sub(solidVertices[f[2]], solidVertices[f[0]])));
    const d = dot(n, solidVertices[f[0]]);
    return d < 0 ? { n: scale(n, -1), d: -d } : { n, d };
  });
  const F = solidFaces[faceIndex];
  const nF = planes[faceIndex].n;
  const base = F.map((i) => solidVertices[i]);
  const P = planes.length;
  // Extra planes after the face planes: the base (reversed, keeping the region above F), the cone walls, and a far cap.
  const extra: Plane[] = [{ n: scale(nF, -1), d: -planes[faceIndex].d }];
  const ctr = scale(base.reduce(add, [0, 0, 0] as Vec3), 1 / base.length);
  for (let i = 0; i < base.length; i++) {
    let n = unit(cross(base[i], base[(i + 1) % base.length]));
    if (dot(n, ctr) > 0) n = scale(n, -1);
    extra.push({ n, d: 0 });
  }
  const far = 100 * planes[faceIndex].d;
  extra.push({ n: nF, d: far });
  const all = [...planes, ...extra];
  // Starting cell: the cone above F up to the far cap, built from its own corner points.
  const top = base.map((q) => scale(q, far / dot(nF, q)));
  const faces: Face[] = [{ plane: P, pts: [...base].reverse() }, { plane: P + 1 + base.length, pts: top }];
  for (let i = 0; i < base.length; i++) {
    const j = (i + 1) % base.length;
    faces.push({ plane: P + 1 + i, pts: [base[i], base[j], top[j], top[i]] });
  }
  const side0 = new Int8Array(P);
  side0[faceIndex] = 1;
  let cells: Cell[] = [{ faces, side: side0, count: 1 }];
  for (let pi = 0; pi < P; pi++) {
    if (pi === faceIndex) continue;
    const next: Cell[] = [];
    for (const c of cells) {
      const r = splitCell(c, all, pi);
      if (r.inside) next.push(r.inside);
      if (r.outside && r.outside.count <= k) next.push(r.outside);
    }
    cells = next;
  }
  // Stellations are made of the arrangement's bounded cells only (the
  // classical rule): a cell still reaching the far cap is unbounded. On
  // the RD, for one, layer 3 includes infinite prisms along the 3-fold
  // vertex directions, where only 3 planes are ever crossed.
  const farPlane = P + 1 + base.length;
  cells = cells.filter((c) => !c.faces.some((f) => f.plane === farPlane));
  if (!cells.length) throw new Error(`stellationPiece: no bounded cells up to layer ${k} over face ${faceIndex}`);
  // Surface facets: a facet on a face plane is internal when the cell on its other side was kept too.
  const kept = new Set(cells.map((c) => c.side.join(',')));
  const surface: Face[] = [];
  for (const c of cells) {
    for (const f of c.faces) {
      if (f.plane < P && f.plane !== faceIndex) {
        const other = c.side.slice();
        other[f.plane] = -other[f.plane];
        if (kept.has(other.join(','))) continue;
      }
      surface.push(f);
    }
  }
  return mergeSurface(surface, all, P, c0Outward(cells));
}

/** Each cell facet's outward direction is away from its own cell: recorded via the cell centroid. */
function c0Outward(cells: Cell[]): Map<Face, Vec3> {
  const m = new Map<Face, Vec3>();
  for (const c of cells) {
    const pts = c.faces.flatMap((f) => f.pts);
    const cen = scale(pts.reduce(add, [0, 0, 0] as Vec3), 1 / pts.length);
    for (const f of c.faces) m.set(f, cen);
  }
  return m;
}

/** Merges surface facets on the same plane (and facing the same way) into polygons, and indexes the vertices. */
function mergeSurface(surface: Face[], planes: Plane[], baseOffset: number, cellCentre: Map<Face, Vec3>): StellationPiece {
  const vertices: Vec3[] = [];
  const vid = (q: Vec3): number => {
    const i = vertices.findIndex((v) => Math.hypot(...sub(v, q)) < 1e-7);
    if (i >= 0) return i;
    vertices.push(q);
    return vertices.length - 1;
  };
  const groups = new Map<string, number[][]>();
  for (const f of surface) {
    const n = planes[f.plane].n;
    const outward = dot(n, sub(f.pts[0], cellCentre.get(f)!)) > 0 ? 1 : -1;
    // Wind each facet counter-clockwise seen from outside.
    const nrm = cross(sub(f.pts[1], f.pts[0]), sub(f.pts[2], f.pts[0]));
    const pts = dot(nrm, n) * outward > 0 ? f.pts : [...f.pts].reverse();
    const key = `${f.plane}|${outward}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(pts.map(vid));
  }
  const faces: number[][] = [];
  let baseFace = -1;
  for (const [key, polys] of groups) {
    // Directed edges that cancel against a reversed twin are interior to the merged region.
    const directed = new Map<string, [number, number]>();
    for (const poly of polys) for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if (directed.has(`${b},${a}`)) directed.delete(`${b},${a}`);
      else directed.set(`${a},${b}`, [a, b]);
    }
    // Walk the boundary loops. Where a region touches itself at one point,
    // two edges leave the same vertex: take the one turning furthest
    // anticlockwise from the way we came in, which keeps each loop on its
    // own region.
    const [pl, sgn] = key.split('|').map(Number);
    const normal = scale(planes[pl].n, sgn);
    const outgoing = new Map<number, number[]>();
    for (const [a, b] of directed.values()) outgoing.set(a, [...(outgoing.get(a) ?? []), b]);
    const turn = (from: Vec3, at: Vec3, to: Vec3): number => {
      const r = sub(from, at), w = sub(to, at);
      const ang = Math.atan2(dot(cross(r, w), normal), dot(r, w));
      return ang <= 0 ? ang + 2 * Math.PI : ang;
    };
    let remaining = directed.size;
    while (remaining) {
      const start = [...outgoing.entries()].find(([, l]) => l.length)![0];
      const loop: number[] = [start];
      let prev = start;
      let v = outgoing.get(start)!.shift()!;
      remaining--;
      while (v !== start) {
        loop.push(v);
        const opts = outgoing.get(v)!;
        let best = 0;
        for (let i = 1; i < opts.length; i++) if (turn(vertices[prev], vertices[v], vertices[opts[i]]) > turn(vertices[prev], vertices[v], vertices[opts[best]])) best = i;
        const w = opts.splice(best, 1)[0];
        remaining--;
        prev = v;
        v = w;
      }
      // Drop points lying straight along an edge.
      const clean = loop.filter((v, i) => {
        const a = vertices[loop[(i - 1 + loop.length) % loop.length]], b = vertices[v], c = vertices[loop[(i + 1) % loop.length]];
        return Math.hypot(...cross(sub(b, a), sub(c, b))) > 1e-9;
      });
      if (+key.split('|')[0] === baseOffset) baseFace = faces.length;
      faces.push(clean);
    }
  }
  // Where a corner of one face lies along another face's edge, add it to
  // that edge too, so the surface is closed edge-to-edge.
  const usedNow = [...new Set(faces.flat())];
  for (let f = 0; f < faces.length; f++) {
    const out: number[] = [];
    const face = faces[f];
    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length];
      out.push(a);
      const ab = sub(vertices[b], vertices[a]);
      const len2 = dot(ab, ab);
      const on = usedNow
        .filter((v) => v !== a && v !== b)
        .map((v) => ({ v, t: dot(sub(vertices[v], vertices[a]), ab) / len2 }))
        .filter(({ v, t }) => t > 1e-9 && t < 1 - 1e-9 && Math.hypot(...cross(sub(vertices[v], vertices[a]), ab)) / Math.sqrt(len2) < 1e-7)
        .sort((x, y) => x.t - y.t);
      out.push(...on.map(({ v }) => v));
    }
    faces[f] = out;
  }
  // Re-index to only the vertices still used by some face.
  const used = [...new Set(faces.flat())].sort((a, b) => a - b);
  const remap = new Map(used.map((v, i) => [v, i]));
  return { vertices: used.map((v) => vertices[v]), faces: faces.map((f) => f.map((v) => remap.get(v)!)), baseFace };
}

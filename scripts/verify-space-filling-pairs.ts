/**
 * Verifies every SPACE_FILLING_PAIR_LIST entry (families.ts) for real,
 * not on reputation:
 *
 *   1. Registry: both shapes exist, and each has ONE uniform edge length,
 *      equal between the two -- so their faces genuinely match under the
 *      app's own face-attach (same-size faces only).
 *   2. Tiling: an explicit patch of that pair's honeycomb, built from its
 *      own coordinates, fills a sample region with no gaps and no
 *      overlaps (Monte Carlo: every sample point inside exactly one
 *      piece). The 3 prismatic pairs are checked as their 2D tilings --
 *      extruding a gap-free, overlap-free tiling can't introduce either.
 */
import * as THREE from 'three';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js';
import { POLYHEDRA } from '../app/lib/polyhedra';
import { SPACE_FILLING_PAIR_LIST, familyIds } from '../app/lib/polyhedra/families';

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}

type V3 = [number, number, number];
type V2 = [number, number];

// ---- 1. registry ---------------------------------------------------------
function edgeLengths(id: string): number[] {
  const spec = POLYHEDRA[id];
  return spec.edges.map(([a, b]) => {
    const p = spec.vertices[a];
    const q = spec.vertices[b];
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  });
}
for (const { ids, honeycomb } of SPACE_FILLING_PAIR_LIST) {
  const exist = ids.every((id) => POLYHEDRA[id]);
  check(`${honeycomb}: both shapes exist (${ids.join(' + ')})`, exist);
  if (!exist) continue;
  const [la, lb] = ids.map(edgeLengths);
  const uniform = (ls: number[]) => ls.every((l) => Math.abs(l - ls[0]) < 1e-6);
  check(`${honeycomb}: uniform, matching edge lengths (${la[0].toFixed(4)} / ${lb[0].toFixed(4)})`, uniform(la) && uniform(lb) && Math.abs(la[0] - lb[0]) < 1e-6);
}
check('family membership = every pair member, deduped', familyIds('SPACE_FILLING_PAIRS').length === new Set(SPACE_FILLING_PAIR_LIST.flatMap((p) => p.ids)).size);

// ---- 2. tilings ----------------------------------------------------------
function hull3(pts: V3[]): ConvexHull {
  return new ConvexHull().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
}
function coverage3(pieces: V3[][], center: V3, half: number, samples = 20000) {
  const hulls = pieces
    .filter((p) => Math.hypot(...p.reduce((s, v) => [s[0] + v[0] / p.length, s[1] + v[1] / p.length, s[2] + v[2] / p.length], [0, 0, 0] as V3).map((x, i) => x - center[i]) as V3) < half * 2 + 3)
    .map(hull3);
  let gaps = 0;
  let overlaps = 0;
  let seed = 12345;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
  const pt = new THREE.Vector3();
  for (let n = 0; n < samples; n++) {
    pt.set(center[0] + rand() * half, center[1] + rand() * half, center[2] + rand() * half);
    let c = 0;
    for (const h of hulls) if (h.containsPoint(pt)) c++;
    if (c === 0) gaps++;
    if (c > 1) overlaps++;
  }
  return { gaps, overlaps };
}
// 2D: convex polygon containment (vertices in any order -> sorted by angle).
function inPoly(poly: V2[], p: V2): boolean {
  const cx = poly.reduce((s, v) => s + v[0], 0) / poly.length;
  const cy = poly.reduce((s, v) => s + v[1], 0) / poly.length;
  const sorted = [...poly].sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const b = sorted[(i + 1) % sorted.length];
    if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) < -1e-9) return false;
  }
  return true;
}
function coverage2(pieces: V2[][], half: number, samples = 20000) {
  let gaps = 0;
  let overlaps = 0;
  let seed = 777;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
  for (let n = 0; n < samples; n++) {
    const p: V2 = [rand() * half, rand() * half];
    let c = 0;
    for (const poly of pieces) if (inPoly(poly, p)) c++;
    if (c === 0) gaps++;
    if (c > 1) overlaps++;
  }
  return { gaps, overlaps };
}
const report = (label: string, r: { gaps: number; overlaps: number }) =>
  check(`${label}: tiles with no gaps (${r.gaps}) and no overlaps (${r.overlaps})`, r.gaps === 0 && r.overlaps === 0);

const R = 3;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const grid3 = (): V3[] => range(-R, R).flatMap((x) => range(-R, R).flatMap((y) => range(-R, R).map((z) => [x, y, z] as V3)));
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const octaAt = (c: V3, r: number): V3[] => [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]].map((d) => add(c, d as V3));
const S: V3[] = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];

// Octet truss: FCC = even-sum integer points; a tetrahedron in every unit
// cube (its 4 even corners), an octahedron at every odd-sum point.
{
  const pieces: V3[][] = [];
  for (const q of grid3()) {
    const corners = [0, 1].flatMap((a) => [0, 1].flatMap((b) => [0, 1].map((c) => add(q, [a, b, c]))));
    pieces.push(corners.filter((v) => (((v[0] + v[1] + v[2]) % 2) + 2) % 2 === 0));
    if ((((q[0] + q[1] + q[2]) % 2) + 2) % 2 === 1) pieces.push(octaAt(q, 1));
  }
  report('Octet truss (tetrahedron + octahedron)', coverage3(pieces, [0.3, 0.2, 0.1], 1.2));
}
// Pyrochlore: up-tets on FCC points, down-tets on T+ holes, truncated
// tetrahedra at O-sites and T- holes (vertices = every tet corner at the
// TT circumradius) -- same construction as Rhombiverse's pyrochlore-lattice.js.
{
  const fcc = grid3().filter((p) => (((p[0] + p[1] + p[2]) % 2) + 2) % 2 === 0);
  const up = fcc.map((p) => S.map((s) => add(p, [s[0] / 4, s[1] / 4, s[2] / 4])));
  const down = fcc.map((p) => S.map((s) => add(add(p, [0.5, 0.5, 0.5]), [-s[0] / 4, -s[1] / 4, -s[2] / 4])));
  // Every pyrochlore vertex is a corner of exactly 2 tets (1 up, 1 down) -- dedupe.
  const corners = [...new Map([...up, ...down].flat().map((v) => [v.map((x) => x.toFixed(6)).join(','), v])).values()];
  const rTT = ((Math.SQRT2 / 2) * Math.sqrt(22)) / 4;
  const tt = [...fcc.map((p) => add(p, [1, 0, 0])), ...fcc.map((p) => add(p, [-0.5, -0.5, -0.5]))]
    .map((c) => corners.filter((v) => Math.abs(Math.hypot(v[0] - c[0], v[1] - c[1], v[2] - c[2]) - rTT) < 1e-9))
    .filter((vs) => vs.length === 12);
  report('Pyrochlore (tetrahedron + truncated tetrahedron)', coverage3([...up, ...down, ...tt], [0.3, 0.2, 0.1], 1.2));
}
// Rectified cubic: a cuboctahedron at every integer point (vertices at the
// unit cube-edge midpoints), an octahedron at every cube center.
{
  const co: V3 = [0.5, 0.5, 0];
  const coVerts = (c: V3): V3[] => [0, 1, 2].flatMap((perm) => [1, -1].flatMap((a) => [1, -1].map((b) => {
    const v: V3 = [0, 0, 0];
    v[(perm + 0) % 3] = a * co[0];
    v[(perm + 1) % 3] = b * co[1];
    return add(c, v);
  })));
  const pieces = [...grid3().map(coVerts), ...grid3().map((q) => octaAt(add(q, [0.5, 0.5, 0.5]), 0.5))];
  report('Rectified cubic (octahedron + cuboctahedron)', coverage3(pieces, [0.3, 0.2, 0.1], 1.2));
}
// Truncated cubic: a truncated cube at every integer point (octagons in
// the unit cube's faces), an octahedron in every corner gap.
{
  const xi = (Math.SQRT2 - 1) / 2;
  const tcVerts = (c: V3): V3[] => {
    const out: V3[] = [];
    for (let axis = 0; axis < 3; axis++) for (const a of [xi, -xi]) for (const b of [0.5, -0.5]) for (const d of [0.5, -0.5]) {
      const v: V3 = [0, 0, 0];
      v[axis] = a;
      v[(axis + 1) % 3] = b;
      v[(axis + 2) % 3] = d;
      out.push(add(c, v));
    }
    return out;
  };
  const pieces = [...grid3().map(tcVerts), ...grid3().map((q) => octaAt(add(q, [0.5, 0.5, 0.5]), 0.5 - xi))];
  report('Truncated cubic (octahedron + truncated cube)', coverage3(pieces, [0.3, 0.2, 0.1], 1.2));
}
// Prismatic pairs, checked as their 2D tilings.
{
  // Elongated triangular: rows of unit squares alternating with rows of triangles.
  const h = Math.sqrt(3) / 2;
  const pieces: V2[][] = [];
  for (let row = -6; row <= 6; row++) {
    const y0 = row * (1 + h);
    const shift = row % 2 === 0 ? 0 : 0.5; // successive triangle rows may shift; either way tiles
    for (let i = -8; i <= 8; i++) {
      pieces.push([[i, y0], [i + 1, y0], [i + 1, y0 + 1], [i, y0 + 1]]);
      const x = i + shift;
      pieces.push([[x, y0 + 1], [x + 1, y0 + 1], [x + 0.5, y0 + 1 + h]]);
      pieces.push([[x + 0.5, y0 + 1 + h], [x + 1.5, y0 + 1 + h], [x + 1, y0 + 1]]);
    }
  }
  report('Elongated triangular prismatic (cube + triangular prism)', coverage2(pieces, 3));
}
{
  // Trihexagonal (kagome): hexagons at a triangular lattice of spacing 2
  // (edge 1), triangles = the medial triangles between them.
  const a1: V2 = [2, 0];
  const a2: V2 = [1, Math.sqrt(3)];
  const P = (i: number, j: number): V2 => [i * a1[0] + j * a2[0], i * a1[1] + j * a2[1]];
  const mid = (p: V2, q: V2): V2 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const pieces: V2[][] = [];
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
    const c = P(i, j);
    pieces.push(Array.from({ length: 6 }, (_, k) => [c[0] + Math.cos((k * Math.PI) / 3), c[1] + Math.sin((k * Math.PI) / 3)] as V2));
    const [p0, p1, p2, p3] = [P(i, j), P(i + 1, j), P(i, j + 1), P(i + 1, j + 1)];
    pieces.push([mid(p0, p1), mid(p1, p2), mid(p2, p0)]);
    pieces.push([mid(p1, p3), mid(p3, p2), mid(p2, p1)]);
  }
  report('Trihexagonal prismatic (triangular prism + hexagonal prism)', coverage2(pieces, 3));
}
{
  // Truncated square (4.8.8): unit-edge octagons on a square grid of
  // spacing 1+sqrt(2), 45-degree unit squares in the gaps.
  const L = 1 + Math.SQRT2;
  const rOct = 1 / (2 * Math.sin(Math.PI / 8));
  const pieces: V2[][] = [];
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
    const c: V2 = [i * L, j * L];
    pieces.push(Array.from({ length: 8 }, (_, k) => [c[0] + rOct * Math.cos(Math.PI / 8 + (k * Math.PI) / 4), c[1] + rOct * Math.sin(Math.PI / 8 + (k * Math.PI) / 4)] as V2));
    const s: V2 = [c[0] + L / 2, c[1] + L / 2];
    const r = Math.SQRT1_2;
    pieces.push([[s[0] + r, s[1]], [s[0], s[1] + r], [s[0] - r, s[1]], [s[0], s[1] - r]]);
  }
  report('Truncated square prismatic (cube + octagonal prism)', coverage2(pieces, 3));
}

console.log(failures === 0 ? '\nAll checks passed (0 failures).' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);

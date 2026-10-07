/**
 * Nets (direct request 2026-09-30; built 2026-10-08): any shape's faces
 * unfolded flat, edge to edge, and folded back up. Ported from Rhombiverse's
 * src/geometry-extensions/nets.js and made general: it takes a shape's own
 * outward-wound faces (so non-convex shapes fold correctly too) and searches
 * spanning trees of the face graph for a flat net with no two faces
 * overlapping. Pure maths, no THREE (scripts/verify-nets.ts).
 *
 * A net is a tree over the faces: each face but the first hangs from a
 * parent face on a shared edge, its hinge. Folding by t (0 flat, 1 closed)
 * turns each face about its hinge by (1 - t) of its unfold angle, on top of
 * its parent's own turn; the first face lies flat throughout.
 */
import type { Vec3 } from '../polyhedra/core';

export type Mat4 = number[]; // 4x4, column-major like THREE.Matrix4
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
export function mul(A: Mat4, B: Mat4): Mat4 {
  const C = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) C[c * 4 + r] += A[k * 4 + r] * B[c * 4 + k];
  return C;
}
export const apply = (M: Mat4, p: Vec3): Vec3 => [0, 1, 2].map((r) => M[r] * p[0] + M[4 + r] * p[1] + M[8 + r] * p[2] + M[12 + r]) as Vec3;
function rotationAbout(a: Vec3, d: Vec3, angle: number): Mat4 {
  const [x, y, z] = d, c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  const R = [
    t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1,
  ];
  const T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, a[0], a[1], a[2], 1];
  const Ti = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -a[0], -a[1], -a[2], 1];
  return mul(T, mul(R, Ti));
}
const centroid = (pts: Vec3[]): Vec3 => pts.reduce<Vec3>((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);
/** A face's outward normal (Newell's method: robust for any simple polygon). */
function normalOf(pts: Vec3[]): Vec3 {
  const n: Vec3 = [0, 0, 0];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    n[0] += (p[1] - q[1]) * (p[2] + q[2]);
    n[1] += (p[2] - q[2]) * (p[0] + q[0]);
    n[2] += (p[0] - q[0]) * (p[1] + q[1]);
  });
  return unit(n);
}
const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

interface Face { pts: Vec3[]; keys: number[] }
interface TreeNode { parent: number; a?: Vec3; d?: Vec3; angle?: number; hinge?: string }
interface Tree { nodes: TreeNode[]; order: number[] }

function transforms(tree: Tree, M0: Mat4, t: number): Mat4[] {
  const T: Mat4[] = new Array(tree.nodes.length);
  for (const i of tree.order) {
    const node = tree.nodes[i];
    T[i] = node.parent < 0 ? M0 : mul(T[node.parent], rotationAbout(node.a!, node.d!, (1 - t) * node.angle!));
  }
  return T;
}

function makeTree(faces: Face[], adj: { face: number; j: number }[][], root: number, shift: number, depthFirst: boolean, seed: number): Tree | null {
  let r = seed * 9301 + 49297;
  const rand = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const nodes: (TreeNode | null)[] = faces.map(() => null);
  nodes[root] = { parent: -1 };
  const order = [root];
  const visit = (p: number) => {
    const list = adj[p].map((_, s) => adj[p][(s + shift) % adj[p].length]);
    if (seed) list.sort(() => rand() - 0.5);
    for (const { face: c, j } of list) {
      if (nodes[c]) continue;
      const P = faces[p].pts;
      const a = P[j], b = P[(j + 1) % P.length];
      const d = unit(sub(b, a));
      const nP = normalOf(P), nC = normalOf(faces[c].pts);
      const angle = Math.atan2(dot(cross(nC, nP), d), dot(nC, nP));
      nodes[c] = { parent: p, a, d, angle, hinge: edgeKey(faces[p].keys[j], faces[p].keys[(j + 1) % P.length]) };
      order.push(c);
      if (depthFirst) visit(c);
    }
  };
  if (depthFirst) visit(root);
  else for (let q = 0; q < order.length; q++) visit(order[q]);
  if (order.length !== faces.length) return null; // not connected
  return { nodes: nodes as TreeNode[], order };
}

/** The first face flat (z = 0), its outside facing away so the solid folds up toward the viewer. */
function flatten(face: Face): Mat4 {
  const P = face.pts;
  const n = normalOf(P);
  const ex = unit(sub(P[1], P[0]));
  const ez: Vec3 = [-n[0], -n[1], -n[2]];
  const ey = cross(ex, ez);
  const c = centroid(P);
  const R = [ey[0], ex[0], ez[0], 0, ey[1], ex[1], ez[1], 0, ey[2], ex[2], ez[2], 0, 0, 0, 0, 1];
  return mul(R, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -c[0], -c[1], -c[2], 1]);
}

type P2 = [number, number];
/** Signed area of a 2D polygon (positive counter-clockwise). */
const area2 = (P: P2[]) => P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
/** Fan triangles of a simple polygon by ear clipping (works for concave faces too). */
export function triangulate(P: P2[]): [number, number, number][] {
  const idx = P.map((_, i) => i);
  if (area2(P) < 0) idx.reverse();
  const out: [number, number, number][] = [];
  const inTri = (p: P2, a: P2, b: P2, c: P2) => {
    const s = (u: P2, v: P2, w: P2) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]);
    return s(a, b, p) > 1e-12 && s(b, c, p) > 1e-12 && s(c, a, p) > 1e-12;
  };
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
      const a = P[i0], b = P[i1], c = P[i2];
      if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) <= 1e-12) continue;
      if (idx.some((m) => m !== i0 && m !== i1 && m !== i2 && inTri(P[m], a, b, c))) continue;
      out.push([i0, i1, i2]);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}
/** Do two flat triangles overlap (more than touching)? Separating axes, each shrunk a hair. */
function trianglesOverlap(A: P2[], B: P2[]): boolean {
  const shrink = (P: P2[]) => { const c = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3]; return P.map((p) => [c[0] + (p[0] - c[0]) * 0.999, c[1] + (p[1] - c[1]) * 0.999] as P2); };
  const a = shrink(A), b = shrink(B);
  for (const P of [a, b]) for (let i = 0; i < 3; i++) {
    const e = [P[(i + 1) % 3][0] - P[i][0], P[(i + 1) % 3][1] - P[i][1]];
    const axis = [-e[1], e[0]];
    const pa = a.map((q) => q[0] * axis[0] + q[1] * axis[1]), pb = b.map((q) => q[0] * axis[0] + q[1] * axis[1]);
    if (Math.max(...pa) <= Math.min(...pb) + 1e-9 || Math.max(...pb) <= Math.min(...pa) + 1e-9) return false;
  }
  return true;
}
export function polygonsOverlap(A: P2[], B: P2[], tA = triangulate(A), tB = triangulate(B)): boolean {
  // Bounding boxes first: most pairs are far apart.
  const box = (P: P2[]) => [Math.min(...P.map((p) => p[0])), Math.max(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[1]))];
  const [ax0, ax1, ay0, ay1] = box(A), [bx0, bx1, by0, by1] = box(B);
  if (ax1 <= bx0 + 1e-9 || bx1 <= ax0 + 1e-9 || ay1 <= by0 + 1e-9 || by1 <= ay0 + 1e-9) return false;
  return tA.some((ta) => tB.some((tb) => trianglesOverlap(ta.map((i) => A[i]), tb.map((i) => B[i]))));
}

export interface Net {
  faces: Face[];
  tree: Tree;
  /** Each face's corners on the page at t = 0 (x, y), in the shape's own units. */
  flat: P2[][];
  /** Per-face transforms at fold t (0 flat, 1 closed). */
  at: (t: number) => Mat4[];
  /**
   * The cut edges, paired: each pair is the same solid edge seen from its two
   * faces, which meet when folded. { label, sides: [{ face, j }, { face, j }] }
   * where side j runs from corner j to corner j + 1 of that face.
   */
  pairs: { label: number; sides: { face: number; j: number }[] }[];
  /** Hinges (fold lines), as { face, j } on the child face. */
  hinges: { face: number; j: number }[];
}

/**
 * Why a shape has no net, or null if it can have one: the surface must be
 * closed (every edge on exactly two faces), with flat faces.
 */
export function netProblem(vertices: Vec3[], faceIdx: number[][]): string | null {
  const count = new Map<string, number>();
  faceIdx.forEach((f) => f.forEach((k, j) => { const e = edgeKey(k, f[(j + 1) % f.length]); count.set(e, (count.get(e) ?? 0) + 1); }));
  if ([...count.values()].some((c) => c !== 2)) return 'not a closed surface';
  for (const f of faceIdx) {
    const P = f.map((i) => vertices[i]);
    const n = normalOf(P), c = centroid(P);
    if (P.some((p) => Math.abs(dot(n, sub(p, c))) > 1e-6 * Math.max(1, Math.hypot(...c)))) return 'a face is not flat';
  }
  return null;
}

/**
 * A shape's net: the first spanning tree found whose faces lie flat with no
 * two overlapping, preferring the most compact among the plain trees; or
 * null if none is found. Faces must be outward-wound.
 */
export function netOf(vertices: Vec3[], faceIdx: number[][], maxSeeds = 300): Net | null {
  if (netProblem(vertices, faceIdx)) return null;
  const faces: Face[] = faceIdx.map((f) => ({ pts: f.map((i) => vertices[i]), keys: [...f] }));
  const adj: { face: number; j: number }[][] = faces.map(() => []);
  const byEdge = new Map<string, [number, number]>();
  faces.forEach((f, i) => f.keys.forEach((k, j) => {
    const e = edgeKey(k, f.keys[(j + 1) % f.keys.length]);
    const o = byEdge.get(e);
    if (o) { adj[i].push({ face: o[0], j }); adj[o[0]].push({ face: i, j: o[1] }); } else byEdge.set(e, [i, j]);
  }));
  const tris = faces.map(() => null as [number, number, number][] | null);
  let best: { tree: Tree; M0: Mat4; flat: P2[][]; area: number } | null = null;
  const tries: [number, number, boolean, number][] = [];
  const roots = Math.min(faces.length, 24);
  for (let root = 0; root < roots; root++) for (let shift = 0; shift < 2; shift++) for (const depthFirst of [false, true]) tries.push([Math.floor((root * faces.length) / roots), shift, depthFirst, 0]);
  for (let seed = 1; seed <= maxSeeds; seed++) tries.push([seed % faces.length, 0, seed % 2 === 0, seed]);
  for (const [root, shift, depthFirst, seed] of tries) {
    if (best && seed) break; // a plain tree worked: no need for random ones
    const tree = makeTree(faces, adj, root, shift, depthFirst, seed);
    if (!tree) return null;
    const M0 = flatten(faces[root]);
    const T = transforms(tree, M0, 0);
    const flat3 = faces.map((f, i) => f.pts.map((p) => apply(T[i], p)));
    if (!flat3.every((P) => P.every((p) => Math.abs(p[2]) < 1e-6 * Math.max(1, Math.hypot(p[0], p[1]))))) continue;
    const flat = flat3.map((P) => P.map((p) => [p[0], p[1]] as P2));
    flat.forEach((P, i) => { tris[i] = triangulate(P); });
    let clash = false;
    for (let i = 0; i < flat.length && !clash; i++) for (let j = i + 1; j < flat.length && !clash; j++) if (polygonsOverlap(flat[i], flat[j], tris[i]!, tris[j]!)) clash = true;
    if (clash) continue;
    const xs = flat.flat().map((p) => p[0]), ys = flat.flat().map((p) => p[1]);
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (!best || area < best.area - 1e-9) best = { tree, M0, flat, area };
  }
  if (!best) return null;
  const { tree, M0, flat } = best;
  const hinges: { face: number; j: number }[] = [];
  const bySolidEdge = new Map<string, { face: number; j: number }[]>();
  faces.forEach((f, i) => f.keys.forEach((k, j) => {
    const e = edgeKey(k, f.keys[(j + 1) % f.keys.length]);
    if (e === tree.nodes[i].hinge) { hinges.push({ face: i, j }); return; }
    // The parent's side of a hinge is not a cut edge either.
    if (tree.nodes.some((n) => n.parent === i && n.hinge === e)) return;
    const list = bySolidEdge.get(e) ?? [];
    list.push({ face: i, j });
    bySolidEdge.set(e, list);
  }));
  const pairs = [...bySolidEdge.values()].filter((s) => s.length === 2).map((sides, n) => ({ label: n + 1, sides }));
  return { faces, tree, flat, at: (t) => transforms(tree, M0, t), pairs, hinges };
}

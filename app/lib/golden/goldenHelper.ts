/**
 * The golden-rhombohedra helper: where a build of prolate and oblate golden
 * rhombohedra stands against the true 3D Penrose (Ammann-Kramer) tiling,
 * and the next piece that keeps it inside that tiling. A build inside the
 * tiling can never dead-end, since the tiling goes on forever.
 *
 * How: face-joined golden rhombohedra always have their edges along the
 * icosahedron's six 5-fold axes, so every corner is an integer point of Z^6
 * and every piece a tile (n, I) of the 6D cut-and-project engine
 * (quasicrystal.js, copied from Rhombiverse). The build's axes are matched
 * to the engine's by their dot products; then of all the translations
 * that put the first piece on a tile of the tiling, the one holding the
 * most pieces is used.
 */
import { Quaternion, Vector3 } from 'three';
import { POLYHEDRA } from '../polyhedra';
import type { Assembly, AssemblyConnection, AssemblyNode } from '../assembly';
import { rotationFor, faceCentres } from '../goldenBuilds';
import { makeQuasicrystal, BASE_OFFSET, tileKey } from './quasicrystal.js';

type Tile = { n: number[]; I: number[] };
const P_ID = 'GOLDEN_RHOMBOHEDRON_PROLATE', O_ID = 'GOLDEN_RHOMBOHEDRON_OBLATE';
const PHI = (1 + Math.sqrt(5)) / 2;
const EDGE = 1 / PHI; // Polyhedraverse's golden edge (the triacontahedron's)
const V = (a: number[]) => new Vector3(a[0], a[1], a[2]);
const posKey = (v: Vector3) => [v.x, v.y, v.z].map((x) => Math.round(x * 1e5)).join(',');
// The six 5-fold axes in the specs' own frame (aperiodic.ts builds both
// rhombohedra from three of these).
const LOCAL_AXES = [[0, 1, PHI], [0, 1, -PHI], [1, PHI, 0], [-1, PHI, 0], [PHI, 0, 1], [PHI, 0, -1]].map((a) => V(a).normalize());

let engine: ReturnType<typeof makeQuasicrystal> | null = null;
const eng = () => (engine ??= makeQuasicrystal('6d'));
let patchTiles: Tile[] | null = null;
const searchPatch = () => (patchTiles ??= eng().patch(BASE_OFFSET['6d'], 6) as Tile[]);
const shiftCache = new Map<string, number[]>();

export const isGoldenBuild = (a: Assembly) => a.nodes.length > 0 && a.nodes.every((n) => n.shape === P_ID || n.shape === O_ID);

// Our world axes -> engine axes: w[k] is engine axis k as a world vector
// (length EDGE). Found by matching dot products (any icosahedral match).
function matchAxes(world: Vector3[]): Vector3[] | null {
  const par: number[][] = eng().par;
  const P = par.map((p: number[]) => V(p).normalize());
  const perms: number[][] = [];
  const permute = (rest: number[], acc: number[]) => { if (!rest.length) perms.push(acc); else rest.forEach((x, i) => permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, x])); };
  permute([0, 1, 2, 3, 4, 5], []);
  for (const pi of perms) for (let sg = 0; sg < 32; sg++) {
    const sign = (i: number) => (i === 0 ? 1 : sg & (1 << (i - 1)) ? -1 : 1);
    let ok = true;
    for (let i = 0; i < 6 && ok; i++) for (let j = i + 1; j < 6 && ok; j++) {
      if (Math.abs(world[i].dot(world[j]) - sign(i) * sign(j) * P[pi[i]].dot(P[pi[j]])) > 1e-6) ok = false;
    }
    if (!ok) continue;
    const w: Vector3[] = new Array(6);
    for (let i = 0; i < 6; i++) w[pi[i]] = world[i].clone().multiplyScalar(sign(i) * EDGE);
    return w;
  }
  return null;
}

interface Frame { w: Vector3[]; origin: Vector3; shift: number[]; tiles: (Tile | null)[] }

// Each node as an engine tile, plus the frame to go back to the world.
function frameOf(a: Assembly): Frame | null {
  if (!isGoldenBuild(a)) return null;
  const q0 = new Quaternion(...a.nodes[0].transform.quaternion);
  const w = matchAxes(LOCAL_AXES.map((v) => v.clone().applyQuaternion(q0)));
  if (!w) return null;
  const unitW = w.map((v) => v.clone().normalize());
  // Per node: its tile's edge indices, and each corner's offset (0/1 per
  // edge) from its min corner (the corner its +w edges leave from).
  const info = a.nodes.map((node) => {
    const spec = POLYHEDRA[node.shape];
    const q = new Quaternion(...node.transform.quaternion), c = V(node.transform.position);
    const world = (m: number) => V(spec.vertices[m]).applyQuaternion(q).add(c);
    const edges = [1, 2, 4].map((m) => world(m).sub(world(0)));
    const idx: number[] = [], minBits: number[] = [];
    for (const e of edges) {
      const u = e.clone().normalize();
      const k = unitW.findIndex((x) => Math.abs(Math.abs(x.dot(u)) - 1) < 1e-6);
      if (k < 0) return null;
      idx.push(k);
      minBits.push(unitW[k].dot(u) > 0 ? 0 : 1);
    }
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((m) => ({ key: posKey(world(m)), up: [0, 1, 2].map((b) => ((m >> b) & 1) ^ minBits[b]) }));
    return { idx, corners, minCorner: world(minBits[0] | (minBits[1] << 1) | (minBits[2] << 2)) };
  });
  if (info.some((x) => !x)) return null;
  // Z^6 corners, spread from piece 1 through shared corners (every corner
  // of a face-joined build is an integer point; piece 1's min corner is 0).
  const coord = new Map<string, number[]>();
  const tiles: (Tile | null)[] = info.map(() => null);
  const assign = (i: number, nMin: number[]) => {
    const x = info[i]!;
    tiles[i] = { n: nMin, I: [...x.idx].sort((p, r) => p - r) };
    for (const c of x.corners) coord.set(c.key, nMin.map((v, k) => v + c.up.reduce((s, u, b) => s + (x.idx[b] === k ? u : 0), 0)));
  };
  assign(0, [0, 0, 0, 0, 0, 0]);
  for (let changed = true; changed;) {
    changed = false;
    info.forEach((x, i) => {
      if (tiles[i]) return;
      const known = x!.corners.find((c) => coord.has(c.key));
      if (!known) return;
      const at = coord.get(known.key)!;
      assign(i, at.map((v, k) => v - known.up.reduce((s, u, b) => s + (x!.idx[b] === k ? u : 0), 0)));
      changed = true;
    });
  }
  if (tiles.some((t) => !t)) return null; // pieces not joined to the rest
  const origin = info[0]!.minCorner.clone();
  // The translation that fits the most pieces into the tiling. Kept per
  // build (keyed by its first piece) so the tiling followed doesn't jump
  // between edits -- and the search, the slow part, runs once.
  const e = eng();
  const root = tiles[0]!;
  const rootKey = `${a.nodes[0].id}|${a.nodes[0].transform.position.join()}|${a.nodes[0].transform.quaternion.join()}`;
  const cached = shiftCache.get(rootKey);
  const fits = (shift: number[]) => tiles.filter((x) => e.isTile(x!.n.map((v, k) => v + shift[k]), x!.I, BASE_OFFSET['6d'])).length;
  if (cached && fits(cached) === tiles.length) return { w, origin, shift: cached, tiles };
  let best = { count: -1, shift: [0, 0, 0, 0, 0, 0] };
  for (const t of searchPatch()) {
    if (t.I.join() !== root.I.join()) continue;
    const shift = t.n.map((v: number, k: number) => v - root.n[k]);
    const count = fits(shift);
    if (count > best.count) best = { count, shift };
    if (count === tiles.length) break;
  }
  shiftCache.set(rootKey, best.shift);
  return { w, origin, shift: best.shift, tiles };
}

export interface GoldenStatus { total: number; inTiling: number }
export function goldenStatus(a: Assembly): GoldenStatus | null {
  const f = frameOf(a);
  if (!f) return null;
  const e = eng();
  const inTiling = f.tiles.filter((t) => e.isTile(t!.n.map((v, k) => v + f.shift[k]), t!.I, BASE_OFFSET['6d'])).length;
  return { total: a.nodes.length, inTiling };
}

// The build plus one more piece of the true tiling, face-joined to a piece
// already in it: the free spot nearest the build's centre. null if none.
export function withNextSafePiece(a: Assembly): Assembly | null {
  const f = frameOf(a);
  if (!f) return null;
  const e = eng();
  const off = BASE_OFFSET['6d'];
  const placed = new Set(f.tiles.map((t) => tileKey(t!.n.map((v, k) => v + f.shift[k]), t!.I)));
  const centre = a.nodes.reduce((s, n) => s.add(V(n.transform.position)), new Vector3()).divideScalar(a.nodes.length);
  const toWorld = (n: number[]) => n.reduce((s, v, k) => s.addScaledVector(f.w[k], v - f.shift[k]), f.origin.clone());
  let best: { tile: Tile; from: number; dist: number } | null = null;
  f.tiles.forEach((t, i) => {
    const n = t!.n.map((v, k) => v + f.shift[k]);
    if (!e.isTile(n, t!.I, off)) return;
    for (const face of e.tileFaces(n, t!.I)) {
      const u = e.neighbourAcross(n, t!.I, face, off) as Tile | null;
      if (!u || placed.has(tileKey(u.n, u.I))) continue;
      const c = toWorld(u.n).add(u.I.reduce((s, j) => s.addScaledVector(f.w[j], 0.5), new Vector3()));
      const dist = c.distanceTo(centre);
      if (!best || dist < best.dist) best = { tile: u, from: i, dist };
    }
  });
  if (!best) return null;
  const { tile, from } = best as { tile: Tile; from: number };
  const spec = POLYHEDRA[e.tileType(tile.I) === 'prolate' ? P_ID : O_ID];
  const q = rotationFor(spec, tile.I.map((j) => f.w[j]));
  if (!q) return null;
  const c = toWorld(tile.n).add(tile.I.reduce((s, j) => s.addScaledVector(f.w[j], 0.5), new Vector3()));
  const id = `golden-${Date.now().toString(36)}`;
  const node: AssemblyNode = { id, shape: spec.id, transform: { position: [c.x, c.y, c.z], quaternion: [q.x, q.y, q.z, q.w] } } as AssemblyNode;
  const cn = faceCentres(node), cf = faceCentres(a.nodes[from]);
  let conn: AssemblyConnection | null = null;
  for (let fa = 0; fa < cf.length && !conn; fa++) {
    const fb = cn.findIndex((x) => x.distanceTo(cf[fa]) < 1e-5);
    if (fb >= 0) conn = { nodeA: a.nodes[from].id, vertexA: fa, nodeB: id, vertexB: fb, kind: 'face' };
  }
  if (!conn) return null;
  return { nodes: [...a.nodes, node], connections: [...a.connections, conn] };
}

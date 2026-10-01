/**
 * Checks the regular nine (families.ts REGULAR_NINE, the four new ones in
 * miscellaneous/regular-nine):
 *
 *   - each has every edge 1 and only squares, regular hexagons and 60
 *     degree rhombi as faces, with exactly the face counts and volume of
 *     Kaleidoverse's list (TARGETS.md, "The most regular: 9 cells");
 *   - the nine are all different shapes (no two alike);
 *   - each tiles space by translation (Venkov), and is offered its slid
 *     copy first by face registration;
 *   - the 60 degree rhombohedron is exactly a regular octahedron with a
 *     regular tetrahedron on two opposite faces (volume, and the octahedron's
 *     corners are its own);
 *   - every face meets a real partner: squares the cube, regular hexagons
 *     the hexagonal prism, 60 degree rhombi the 60 degree rhombohedron;
 *   - the family lists: home Miscellaneous for the new four, all nine in
 *     Parallelohedra.
 */
import * as THREE from 'three';
import { POLYHEDRA } from '../app/lib/polyhedra';
import { facesCongruent, validateShape } from '../app/lib/polyhedra/core';
import { faceAttachOptions } from '../app/lib/faceAttach';
import { rankFaceAttachOptions } from '../app/lib/faceRegistration';
import { faceKind } from '../app/lib/faceKinds';
import { REGULAR_NINE, REGULAR_NINE_NEW, familiesFor, familyIds } from '../app/lib/polyhedra/families';

let failures = 0;
let checks = 0;
const check = (ok: boolean, msg: string) => {
  checks++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`);
  if (!ok) failures++;
};
type Spec = (typeof POLYHEDRA)[string];
const R2 = Math.SQRT2, R3 = Math.sqrt(3);
// Kaleidoverse's table (faces by kind, volume at edge 1).
const WANT: Record<string, { faces: Record<string, number>; volume: number }> = {
  CUBE: { faces: { square: 6 }, volume: 1 },
  RHOMBOHEDRON_60: { faces: { rhombus: 6 }, volume: R2 / 2 },
  LEANING_SQUARE_PRISM: { faces: { rhombus: 4, square: 2 }, volume: R2 / 2 },
  RHOMBIC_PRISM_60: { faces: { rhombus: 2, square: 4 }, volume: R3 / 2 },
  PRISM_6: { faces: { regularHexagon: 2, square: 6 }, volume: (3 * R3) / 2 },
  LEANING_HEX_PRISM_60: { faces: { regularHexagon: 2, rhombus: 4, square: 2 }, volume: 3 / R2 },
  BAIN_RD: { faces: { rhombus: 8, square: 4 }, volume: 2 * R2 },
  REGULAR_HEX_ED: { faces: { regularHexagon: 4, rhombus: 4, square: 4 }, volume: 4 * R2 },
  TRUNCATED_OCTAHEDRON: { faces: { regularHexagon: 8, square: 6 }, volume: 8 * R2 },
};
const volume = (s: Spec) => {
  let v = 0;
  for (const f of s.faces) for (let k = 1; k + 1 < f.length; k++) {
    const a = new THREE.Vector3(...s.vertices[f[0]]), b = new THREE.Vector3(...s.vertices[f[k]]), c = new THREE.Vector3(...s.vertices[f[k + 1]]);
    v += a.dot(b.clone().cross(c)) / 6;
  }
  return Math.abs(v);
};
const rhombusAngle = (s: Spec, f: number[]) => {
  const p = f.map((i) => new THREE.Vector3(...s.vertices[i]));
  return THREE.MathUtils.radToDeg(p[1].clone().sub(p[0]).angleTo(p[f.length - 1].clone().sub(p[0])));
};

check(REGULAR_NINE.length === 9 && new Set(REGULAR_NINE).size === 9, 'the regular nine lists nine different ids');
for (const id of REGULAR_NINE) {
  const s = POLYHEDRA[id];
  check(!!s, `${id} is in the registry`);
  if (!s) continue;
  const problems = validateShape(s);
  check(problems.length === 0, `${id}: every edge has length 1 and the shape is valid`);
  const counts: Record<string, number> = {};
  for (const f of s.faces) { const k = faceKind(s.vertices, f); counts[k] = (counts[k] || 0) + 1; }
  const rhombi60 = s.faces.filter((f) => faceKind(s.vertices, f) === 'rhombus').every((f) => { const a = rhombusAngle(s, f); return Math.abs(a - 60) < 1e-6 || Math.abs(a - 120) < 1e-6; });
  const sorted = (o: Record<string, number>) => JSON.stringify(Object.fromEntries(Object.entries(o).sort()));
  check(sorted(counts) === sorted(WANT[id].faces) && rhombi60, `${id}: faces ${sorted(counts)}, every rhombus 60°`);
  check(Math.abs(volume(s) - WANT[id].volume) < 1e-9, `${id}: volume ${volume(s).toFixed(6)} as in Kaleidoverse's table`);
  // Venkov: centrally symmetric, faces centrally symmetric, belts of 4 or 6.
  const V = s.vertices.map((v) => new THREE.Vector3(...v));
  const c = V.reduce((a, b) => a.clone().add(b), new THREE.Vector3()).multiplyScalar(1 / V.length);
  const symmetric = V.every((p) => V.some((q) => p.clone().sub(c).add(q.clone().sub(c)).length() < 1e-9));
  const dirs: THREE.Vector3[] = [];
  for (const [i, j] of s.edges) { const e = V[j].clone().sub(V[i]).normalize(); if (!dirs.some((x) => Math.abs(Math.abs(x.dot(e)) - 1) < 1e-9)) dirs.push(e); }
  const belts = dirs.every((e) => { const n = s.faces.filter((f) => f.some((a, k) => Math.abs(Math.abs(V[f[(k + 1) % f.length]].clone().sub(V[a]).normalize().dot(e)) - 1) < 1e-9)).length; return n === 4 || n === 6; });
  check(symmetric && belts, `${id} tiles space by translation (centrally symmetric, belts of 4 or 6)`);
  // Face registration offers the slid copy first on every face.
  const allFirst = s.faces.every((_, tf) => {
    const gi = s.faces.map((_, i) => i).filter((i) => facesCongruent(s.vertices, s.faces[tf], s.vertices, s.faces[i]));
    const r = rankFaceAttachOptions(faceAttachOptions(s, tf, new THREE.Matrix4(), s, gi), s, [{ spec: s, matrixWorld: new THREE.Matrix4() }], 0, tf, true);
    return r[0]?.tiling === true;
  });
  check(allFirst, `${id}: attaching its own kind, the slid copy comes first on every face`);
}

// No two alike: compare sorted distance lists between all corners.
{
  const sig = (s: Spec) => { const d: number[] = []; for (let i = 0; i < s.vertices.length; i++) for (let j = i + 1; j < s.vertices.length; j++) d.push(Math.round(Math.hypot(...s.vertices[i].map((x, k) => x - s.vertices[j][k])) * 1e6)); return d.sort((a, b) => a - b).join(); };
  const sigs = REGULAR_NINE.map((id) => sig(POLYHEDRA[id]));
  check(new Set(sigs).size === 9, 'the nine are all different shapes');
}

// The 60 degree rhombohedron = octahedron + 2 tetrahedra.
{
  const R = POLYHEDRA.RHOMBOHEDRON_60;
  const oct = Math.SQRT2 / 3, tet = Math.SQRT2 / 12;
  check(Math.abs(volume(R) - (oct + 2 * tet)) < 1e-12, 'the 60° rhombohedron has the volume of an octahedron plus two tetrahedra (edge 1)');
  // Its two corners on the long axis: every other corner is at distance 1 from exactly one of them... the six middle corners form the octahedron.
  const V = R.vertices.map((v) => new THREE.Vector3(...v));
  const far = (() => { let best = [0, 1], d = 0; for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) if (V[i].distanceTo(V[j]) > d) { d = V[i].distanceTo(V[j]); best = [i, j]; } return best; })();
  const mid = V.filter((_, i) => !far.includes(i));
  const midDist = mid.flatMap((p, i) => mid.slice(i + 1).map((q) => p.distanceTo(q))).sort((a, b) => a - b);
  // Octahedron, edge 1: 12 distances 1 and 3 distances sqrt2.
  check(mid.length === 6 && midDist.slice(0, 12).every((x) => Math.abs(x - 1) < 1e-9) && midDist.slice(12).every((x) => Math.abs(x - Math.SQRT2) < 1e-9), 'its six middle corners are a regular octahedron of edge 1');
}

// Partners through face attach.
{
  const attaches = (target: Spec, tf: number, incoming: Spec) => {
    const gi = incoming.faces.map((_, i) => i).filter((i) => facesCongruent(target.vertices, target.faces[tf], incoming.vertices, incoming.faces[i]));
    return gi.length > 0 && faceAttachOptions(target, tf, new THREE.Matrix4(), incoming, gi).length > 0;
  };
  const partner: Record<string, string> = { square: 'CUBE', regularHexagon: 'PRISM_6', rhombus: 'RHOMBOHEDRON_60' };
  for (const id of REGULAR_NINE_NEW) {
    const s = POLYHEDRA[id];
    const ok = s.faces.every((f, tf) => attaches(s, tf, POLYHEDRA[partner[faceKind(s.vertices, f)]]));
    check(ok, `${id}: every face takes its partner (squares the cube, hexagons the hexagonal prism, rhombi the 60° rhombohedron)`);
    check(familiesFor(id).includes('MISCELLANEOUS') && familyIds('PARALLELOHEDRA').includes(id), `${id}: home Miscellaneous, listed in Parallelohedra`);
  }
}
check(REGULAR_NINE.every((id) => familyIds('PARALLELOHEDRA').includes(id)), 'all nine are in Parallelohedra');

console.log(`\n${checks} checks, ${failures} failures.`);
process.exit(failures ? 1 : 0);

/**
 * Checks the Bain parallelohedra (miscellaneous/bain-parallelohedra):
 *
 *   - every edge has length 1 and each shape has exactly the faces
 *     claimed (squares, 60 degree rhombi, regular hexagons, 135/135/90
 *     hexagons), with the right corner and face counts;
 *   - the volume two independent ways (the zonohedron's sum over triples
 *     of directions, and the divergence theorem over the faces);
 *   - each tiles space by translation (Venkov: centrally symmetric, every
 *     face centrally symmetric, every belt of 4 or 6 faces);
 *   - each face kind meets a real partner through face attach: squares the
 *     cube, regular hexagons the truncated octahedron and hexagonal prism,
 *     every face its own copy;
 *   - the family lists: home Miscellaneous, and in Parallelohedra's
 *     "Kaleidohedra verified" section.
 */
import { POLYHEDRA } from '../krp-core/src/polyhedra/index.js';
import { type Vec3, facesCongruent, validateShape } from '../krp-core/src/polyhedra/core.js';
import { BAIN_DIRECTIONS } from '../krp-core/src/polyhedra/miscellaneous/index.js';
import { familiesFor, familyIds, KALEIDOHEDRA_VERIFIED } from '../krp-core/src/polyhedra/families.js';
import { faceAttachOptions } from '../app/lib/faceAttach';
import * as THREE from 'three';

let failures = 0;
let checks = 0;
const check = (ok: boolean, msg: string) => {
  checks++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`);
  if (!ok) failures++;
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3) => Math.hypot(...a);
const unit = (a: Vec3): Vec3 => scale(a, 1 / norm(a));
const det = (a: Vec3, b: Vec3, c: Vec3) => dot(a, cross(b, c));
type Spec = (typeof POLYHEDRA)[string];

/** A face's kind from its corners: square, rhombus <angle>, regular hexagon, hexagon <corners>. */
function faceKind(spec: Spec, f: number[]): string {
  const pts = f.map((i) => spec.vertices[i]);
  const corners = pts.map((p, k) => {
    const a = sub(pts[(k + pts.length - 1) % pts.length], p), b = sub(pts[(k + 1) % pts.length], p);
    return Math.round((Math.acos(dot(a, b) / (norm(a) * norm(b))) * 180) / Math.PI * 100) / 100;
  });
  if (pts.length === 4) return corners.every((c) => c === 90) ? 'square' : `rhombus ${Math.min(...corners)}`;
  if (pts.length === 6) return corners.every((c) => c === 120) ? 'regular hexagon' : `hexagon ${[...corners].sort((x, y) => y - x).join('/')}`;
  return `${pts.length}-gon`;
}
const faceCounts = (spec: Spec) => {
  const out: Record<string, number> = {};
  for (const f of spec.faces) { const k = faceKind(spec, f); out[k] = (out[k] || 0) + 1; }
  return JSON.stringify(Object.fromEntries(Object.entries(out).sort()));
};

const EXPECT: Record<string, { faces: Record<string, number>; vertices: number; dirs: Vec3[] }> = {
  BAIN_RD: { faces: { 'rhombus 60': 8, square: 4 }, vertices: 14, dirs: BAIN_DIRECTIONS },
  REGULAR_HEX_ED: { faces: { 'regular hexagon': 4, 'rhombus 60': 4, square: 4 }, vertices: 18, dirs: [...BAIN_DIRECTIONS, [1, 0, 0]] },
  BAIN_ED: { faces: { 'hexagon 135/135/135/135/90/90': 4, 'rhombus 60': 8 }, vertices: 18, dirs: [...BAIN_DIRECTIONS, [0, 0, 1]] },
};

for (const [id, want] of Object.entries(EXPECT)) {
  const spec = POLYHEDRA[id];
  check(!!spec, `${id} is in the registry`);
  if (!spec) continue;
  // 1. Edges and faces.
  const problems = validateShape(spec);
  check(problems.length === 0, `${id}: every edge has length 1 and the shape is valid${problems.length ? ` (${problems.slice(0, 2).join('; ')})` : ''}`);
  check(faceCounts(spec) === JSON.stringify(Object.fromEntries(Object.entries(want.faces).sort())), `${id}: faces ${faceCounts(spec)}`);
  check(spec.vertices.length === want.vertices && spec.vertices.length - spec.edges.length + spec.faces.length === 2, `${id}: ${spec.vertices.length} corners, ${spec.edges.length} edges, ${spec.faces.length} faces (Euler)`);
  // 2. Volume two ways.
  let zono = 0;
  for (let i = 0; i < want.dirs.length; i++) for (let j = i + 1; j < want.dirs.length; j++) for (let k = j + 1; k < want.dirs.length; k++) zono += Math.abs(det(want.dirs[i], want.dirs[j], want.dirs[k]));
  let div = 0;
  for (const f of spec.faces) for (let k = 1; k + 1 < f.length; k++) div += det(spec.vertices[f[0]], spec.vertices[f[k]], spec.vertices[f[k + 1]]) / 6;
  check(Math.abs(zono - div) < 1e-9, `${id}: volume ${div.toFixed(6)} (faces) = ${zono.toFixed(6)} (directions)`);
  // 3. Tiles space by translation (Venkov).
  const c = scale(spec.vertices.reduce(add, [0, 0, 0] as Vec3), 1 / spec.vertices.length);
  const symmetric = spec.vertices.every((p) => spec.vertices.some((q) => norm(add(sub(p, c), sub(q, c))) < 1e-9));
  const facesSymmetric = spec.faces.every((f) => {
    const pts = f.map((i) => spec.vertices[i]);
    const fc = scale(pts.reduce(add, [0, 0, 0] as Vec3), 1 / pts.length);
    return pts.every((p) => pts.some((q) => norm(add(sub(p, fc), sub(q, fc))) < 1e-9));
  });
  const dirs: Vec3[] = [];
  for (const [i, j] of spec.edges) { const e = unit(sub(spec.vertices[j], spec.vertices[i])); if (!dirs.some((x) => Math.abs(Math.abs(dot(x, e)) - 1) < 1e-9)) dirs.push(e); }
  const beltsOk = dirs.every((e) => {
    const n = spec.faces.filter((f) => f.some((a, k) => { const b = f[(k + 1) % f.length]; return Math.abs(Math.abs(dot(unit(sub(spec.vertices[b], spec.vertices[a])), e)) - 1) < 1e-9; })).length;
    return n === 4 || n === 6;
  });
  check(symmetric && facesSymmetric && beltsOk, `${id} tiles space by translation (centrally symmetric, faces centrally symmetric, belts of 4 or 6)`);
  // 4. Face attach: every face meets its own copy; squares and regular hexagons meet the classics.
  const identity = new THREE.Matrix4();
  const attaches = (target: Spec, tf: number, incoming: Spec) => {
    const gi = incoming.faces.map((_, i) => i).filter((i) => facesCongruent(target.vertices, target.faces[tf], incoming.vertices, incoming.faces[i]));
    return gi.length > 0 && faceAttachOptions(target, tf, identity, incoming, gi).length > 0;
  };
  check(spec.faces.every((_, tf) => attaches(spec, tf, spec)), `${id}: every face attaches to a copy of itself`);
  const partners: [string, string][] = [['square', 'CUBE'], ['regular hexagon', 'TRUNCATED_OCTAHEDRON'], ['regular hexagon', 'PRISM_6']];
  for (const [kind, other] of partners) {
    const tf = spec.faces.findIndex((f) => faceKind(spec, f) === kind);
    if (tf < 0) continue;
    check(attaches(spec, tf, POLYHEDRA[other]), `${id}: its ${kind} faces take the ${POLYHEDRA[other].name}`);
  }
  // 5. Families.
  check(familyIds('PARALLELOHEDRA').includes(id) && KALEIDOHEDRA_VERIFIED.includes(id) && familiesFor(id).includes('MISCELLANEOUS'), `${id} is in Parallelohedra (Kaleidohedra verified), home Miscellaneous`);
}

console.log(`\n${checks} checks, ${failures} failures.`);
process.exit(failures ? 1 : 0);

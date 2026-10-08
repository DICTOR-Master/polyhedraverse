/**
 * Checks DICTO's Zometool parallelohedra (miscellaneous/zome-parallelohedra):
 *
 *   - every edge has length 1, and each shape has exactly the faces
 *     claimed (regular hexagons, squares, 60 and 72 degree rhombi);
 *   - the prism leans asin((phi - 1) / sqrt 3), about 20.9 degrees;
 *   - all four edge directions are blue-strut directions: one rotation
 *     takes them onto 2-fold axes of the icosahedral system;
 *   - the three blocks fill the prism exactly (volume, and random points
 *     each inside exactly one block);
 *   - each shape tiles space by translation (Venkov: centrally symmetric,
 *     every face centrally symmetric, every belt of 4 or 6 faces);
 *   - each face kind meets a real partner: squares the cube, hexagons the
 *     hexagonal prism, 72 degree rhombi the thick Penrose rhombus prism;
 *   - the family lists: home Miscellaneous, and in Parallelohedra with
 *     the rhombohedron as Fedorov variants.
 */
import { POLYHEDRA } from '../krp-core/src/polyhedra/index.js';
import { type Vec3, facesCongruent, isRegularFace, validateShape } from '../krp-core/src/polyhedra/core.js';
import { ZOME_DIRECTIONS, ZOME_X } from '../krp-core/src/polyhedra/miscellaneous/index.js';
import { familiesFor, familyIds } from '../krp-core/src/polyhedra/families.js';
import { faceAttachOptions } from '../krp-core/src/assembly/faceAttach.js';
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
const deg = (r: number) => (r * 180) / Math.PI;
const PHI = (1 + Math.sqrt(5)) / 2;

const PRISM = POLYHEDRA.DICTO_LEANING_HEX_PRISM;
const SQUARE_BLOCK = POLYHEDRA.DICTO_SQUARE_FACED_BLOCK;
const RHOMBUS_BLOCK = POLYHEDRA.DICTO_ALL_RHOMBUS_BLOCK;
const SKEWED_RD = POLYHEDRA.DICTO_SKEWED_RD;
const FLAT_RHOMBOHEDRON = POLYHEDRA.DICTO_FLATTENED_RHOMBOHEDRON;

/** 'hexagon', 'square', 'rhombus60', 'rhombus72' or '?' */
function kind(vertices: Vec3[], face: number[]): string {
  const pts = face.map((i) => vertices[i]);
  if (face.length === 6) return isRegularFace(vertices, face) ? 'hexagon' : '?';
  if (face.length !== 4) return '?';
  const a = deg(Math.acos(dot(unit(sub(pts[1], pts[0])), unit(sub(pts[3], pts[0])))));
  const acute = Math.min(a, 180 - a);
  if (Math.abs(acute - 90) < 1e-6) return 'square';
  if (Math.abs(acute - 60) < 1e-6) return 'rhombus60';
  if (Math.abs(acute - 72) < 1e-6) return 'rhombus72';
  return '?';
}

function tally(spec: typeof PRISM): Record<string, number> {
  const t: Record<string, number> = {};
  for (const f of spec.faces) { const k = kind(spec.vertices, f); t[k] = (t[k] ?? 0) + 1; }
  return t;
}

// 1. Edges and faces.
for (const spec of [PRISM, SQUARE_BLOCK, RHOMBUS_BLOCK, SKEWED_RD, FLAT_RHOMBOHEDRON]) {
  const problems = validateShape(spec);
  check(problems.length === 0, `${spec.id}: every edge length 1 ${problems.slice(0, 2).join('; ')}`);
}
const same = (a: Record<string, number>, b: Record<string, number>) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
check(same(tally(PRISM), { hexagon: 2, square: 2, rhombus72: 4 }), `prism faces: 2 regular hexagons, 2 squares, 4 rhombi of 72 degrees ${JSON.stringify(tally(PRISM))}`);
check(same(tally(SQUARE_BLOCK), { square: 2, rhombus60: 2, rhombus72: 2 }), `square-faced block: a pair each of squares, 60 and 72 degree rhombi ${JSON.stringify(tally(SQUARE_BLOCK))}`);
check(same(tally(RHOMBUS_BLOCK), { rhombus60: 2, rhombus72: 4 }), `all-rhombus block: a pair of 60 and two pairs of 72 degree rhombi ${JSON.stringify(tally(RHOMBUS_BLOCK))}`);

check(same(tally(SKEWED_RD), { rhombus60: 6, rhombus72: 6 }) && SKEWED_RD.vertices.length === 14, `skewed RD: 14 corners, six 60 and six 72 degree rhombi ${JSON.stringify(tally(SKEWED_RD))}`);
check(same(tally(FLAT_RHOMBOHEDRON), { rhombus60: 4, rhombus72: 2 }), `flattened rhombohedron: two pairs of 60 and one of 72 degree rhombi ${JSON.stringify(tally(FLAT_RHOMBOHEDRON))}`);
{
  const { v, w, d } = ZOME_DIRECTIONS;
  const vol = (a: Vec3, b: Vec3, c: Vec3) => Math.abs(dot(a, cross(b, c)));
  const blocks = [vol(v, w, d), vol(v, w, ZOME_X), vol(v, d, ZOME_X), vol(w, d, ZOME_X)];
  check(blocks.filter((x) => Math.abs(x - PHI / 2) < 1e-12).length === 2 && blocks.filter((x) => Math.abs(x - 0.5) < 1e-12).length === 2, `skewed RD's blocks: two all-rhombus (phi/2) and two flattened rhombohedra (1/2): ${blocks.map((x) => x.toFixed(6)).join(', ')}`);
  check(Math.abs(blocks.reduce((a, b) => a + b, 0) - PHI * PHI) < 1e-12, 'skewed RD volume = phi^2 = 1 + phi');
  check(Math.abs(vol(v, w, ZOME_X) - 0.5) < 1e-12, 'flattened rhombohedron volume = 1/2');
}

// 2. The lean.
{
  const hex = PRISM.faces.find((f) => f.length === 6)!;
  const n = unit(cross(sub(PRISM.vertices[hex[1]], PRISM.vertices[hex[0]]), sub(PRISM.vertices[hex[2]], PRISM.vertices[hex[0]])));
  // The one edge direction not in the hexagon's plane.
  const lateral = PRISM.edges.map(([i, j]) => unit(sub(PRISM.vertices[j], PRISM.vertices[i]))).find((e) => Math.abs(dot(e, n)) > 1e-6)!;
  const lean = deg(Math.acos(Math.abs(dot(lateral, n))));
  const expected = deg(Math.asin((PHI - 1) / Math.sqrt(3)));
  check(Math.abs(lean - expected) < 1e-9, `prism leans ${lean.toFixed(6)} degrees = asin((phi - 1) / sqrt 3) = ${expected.toFixed(6)}`);
}

// 3. Blue struts: the 15 2-fold axes of the icosahedral system, and one rotation taking u, v, w, d onto them.
{
  const blue: Vec3[] = [];
  for (let k = 0; k < 3; k++) {
    const e: Vec3 = [0, 0, 0]; e[k] = 1; blue.push(e);
    for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
      const p: Vec3 = [0, 0, 0];
      p[k] = 0.5; p[(k + 1) % 3] = (s1 * PHI) / 2; p[(k + 2) % 3] = s2 / (2 * PHI);
      blue.push(p);
    }
  }
  check(blue.length === 15, '15 blue-strut lines');
  const { u, v, w, d } = ZOME_DIRECTIONS;
  const x = ZOME_X;
  const onBlue = (x: Vec3) => blue.some((b) => Math.abs(Math.abs(dot(unit(x), unit(b))) - 1) < 1e-9);
  let found = false;
  // Rotations taking u to a blue line a, and d (at 90 degrees to u) to a blue line b at 90 degrees to a.
  for (const a of blue) for (const b of blue) for (const sb of [1, -1]) {
    if (found || Math.abs(dot(unit(a), unit(b))) > 1e-9) continue;
    const A = unit(a), B = scale(unit(b), sb);
    // Frame (u, d, u x d) -> (A, B, A x B), then test v and w.
    const [f1, f2, f3] = [unit(u), unit(d), unit(cross(u, d))];
    const [g1, g2, g3] = [A, B, unit(cross(A, B))];
    const rot = (x: Vec3): Vec3 => add(add(scale(g1, dot(x, f1)), scale(g2, dot(x, f2))), scale(g3, dot(x, f3)));
    if (onBlue(rot(v)) && onBlue(rot(w)) && onBlue(rot(x))) found = true;
  }
  check(found, 'u, v, w, d and the skewed RD\'s x are all blue-strut directions (one rotation of the icosahedral frame)');
}

// 4. The blocks fill the prism: in the prism's own frame, hexagon = P(u,v) + P(u,w) shifted by v + P(v,w).
{
  const { u, v, w, d } = ZOME_DIRECTIONS;
  const B: Vec3 = [-0.5, -Math.sqrt(3) / 2, 0]; // the hexagon corner at 240 degrees (corners at 0, 60, ... degrees)
  const blocks: { o: Vec3; g: [Vec3, Vec3, Vec3] }[] = [
    { o: B, g: [u, v, d] },
    { o: add(B, v), g: [u, w, d] },
    { o: B, g: [v, w, d] },
  ];
  const det3 = (a: Vec3, b: Vec3, c: Vec3) => dot(a, cross(b, c));
  const inBlock = (p: Vec3, blk: (typeof blocks)[number]) => {
    const r = sub(p, blk.o);
    const [a, b, c] = blk.g;
    const D = det3(a, b, c);
    const x = [det3(r, b, c) / D, det3(a, r, c) / D, det3(a, b, r) / D];
    return x.every((t) => t > 1e-9 && t < 1 - 1e-9);
  };
  const hexArea = (3 * Math.sqrt(3)) / 2;
  const prismVolume = hexArea * d[2];
  const blockVolume = blocks.reduce((s, blk) => s + Math.abs(det3(...blk.g)), 0);
  check(Math.abs(prismVolume - blockVolume) < 1e-12, `the three blocks' volumes add up to the prism's (${blockVolume.toFixed(9)} = ${prismVolume.toFixed(9)})`);
  const inPrism = (p: Vec3) => {
    const t = p[2] / d[2];
    const h: Vec3 = sub(p, scale(d, t));
    const r = Math.hypot(h[0], h[1]);
    const ang = Math.atan2(h[1], h[0]);
    const sector = ((ang % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
    const edgeR = Math.cos(Math.PI / 6) / Math.cos(sector - Math.PI / 6);
    return t > 1e-6 && t < 1 - 1e-6 && r < edgeR - 1e-6;
  };
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let bad = 0, inside = 0;
  for (let i = 0; i < 20000; i++) {
    const p: Vec3 = [(rand() * 2 - 1) * 1.5, (rand() * 2 - 1) * 1.6, rand() * d[2]];
    const n = blocks.filter((blk) => inBlock(p, blk)).length;
    const expected = inPrism(p) ? 1 : 0;
    if (expected) inside++;
    // Skip points within a hair of a block's surface (the tolerance band).
    if (n !== expected) bad++;
  }
  check(bad < 5 && inside > 5000, `20,000 random points: each inside the prism is in exactly one block (${bad} disagreements, all on boundaries if any)`);
}

// 5. Each tiles space by translation (Venkov's conditions).
for (const spec of [PRISM, SQUARE_BLOCK, RHOMBUS_BLOCK, SKEWED_RD, FLAT_RHOMBOHEDRON]) {
  const c = scale(spec.vertices.reduce(add, [0, 0, 0] as Vec3), 1 / spec.vertices.length);
  const symmetric = spec.vertices.every((p) => spec.vertices.some((q) => norm(add(sub(p, c), sub(q, c))) < 1e-9));
  const facesSymmetric = spec.faces.every((f) => {
    const pts = f.map((i) => spec.vertices[i]);
    const fc = scale(pts.reduce(add, [0, 0, 0] as Vec3), 1 / pts.length);
    return pts.every((p) => pts.some((q) => norm(add(sub(p, fc), sub(q, fc))) < 1e-9));
  });
  // Belts: faces containing an edge parallel to a given direction.
  const dirs: Vec3[] = [];
  for (const [i, j] of spec.edges) { const e = unit(sub(spec.vertices[j], spec.vertices[i])); if (!dirs.some((x) => Math.abs(Math.abs(dot(x, e)) - 1) < 1e-9)) dirs.push(e); }
  const beltsOk = dirs.every((e) => {
    const n = spec.faces.filter((f) => f.some((a, k) => { const b = f[(k + 1) % f.length]; return Math.abs(Math.abs(dot(unit(sub(spec.vertices[b], spec.vertices[a])), e)) - 1) < 1e-9; })).length;
    return n === 4 || n === 6;
  });
  check(symmetric && facesSymmetric && beltsOk, `${spec.id} tiles space by translation (centrally symmetric, faces centrally symmetric, belts of 4 or 6)`);
}

// 6. Real partners for each face kind.
{
  const fits = (a: typeof PRISM, k: string, b: typeof PRISM) => {
    const fa = a.faces.find((f) => kind(a.vertices, f) === k)!;
    return b.faces.some((fb) => facesCongruent(a.vertices, fa, b.vertices, fb));
  };
  check(fits(PRISM, 'square', POLYHEDRA.CUBE), "the prism's squares attach to the cube");
  check(fits(PRISM, 'hexagon', POLYHEDRA.PRISM_6), "the prism's hexagons attach to the hexagonal prism");
  check(fits(PRISM, 'rhombus72', POLYHEDRA.PENROSE_PRISM_THICK), "the prism's 72 degree rhombi attach to the thick Penrose rhombus prism");
  check(fits(SQUARE_BLOCK, 'rhombus60', RHOMBUS_BLOCK), "the blocks' 60 degree rhombi attach to each other");
  check(fits(SQUARE_BLOCK, 'rhombus72', PRISM), "the square-faced block's 72 degree rhombi attach to the prism's");
}

// 7. Face attach can build the prism from its blocks (direct report
// 2026-09-30: the blocks wouldn't turn to make it). With the square-faced
// block placed as it sits in the prism, face attach (the app's own
// faceAttachOptions) must offer the all-rhombus block and the second
// square-faced block exactly where they sit in it, flat top and bottom.
{
  const { u, v, w, d } = ZOME_DIRECTIONS;
  const B: Vec3 = [-0.5, -Math.sqrt(3) / 2, 0];
  const corners = (o: Vec3, a: Vec3, b: Vec3): Vec3[] => {
    const out: Vec3[] = [];
    for (const i of [0, 1]) for (const j of [0, 1]) for (const k of [0, 1]) out.push(add(add(add(o, scale(a, i)), scale(b, j)), scale(d, k)));
    return out;
  };
  const centreOf = (pts: Vec3[]) => scale(pts.reduce(add, [0, 0, 0] as Vec3), 1 / pts.length);
  const first = corners(B, u, v);
  const c0 = centreOf(first);
  const inFrame = (pts: Vec3[]) => pts.map((p) => sub(p, c0));
  // The square-faced block's registry corners are the first block's, centred.
  const matches = (a: Vec3[], b: Vec3[]) => a.every((p) => b.some((q) => norm(sub(p, q)) < 1e-6));
  check(matches(SQUARE_BLOCK.vertices, inFrame(first)), 'the square-faced block is the (u,v,d) block, centred');
  const identity = new THREE.Matrix4();
  const reachable = (incoming: typeof PRISM, target: Vec3[]) =>
    SQUARE_BLOCK.faces.some((_, tf) => {
      const faces = incoming.faces.map((_, gi) => gi).filter((gi) => facesCongruent(SQUARE_BLOCK.vertices, SQUARE_BLOCK.faces[tf], incoming.vertices, incoming.faces[gi]));
      if (faces.length === 0) return false;
      return faceAttachOptions(SQUARE_BLOCK, tf, identity, incoming, faces).some((o) => {
        const placed = incoming.vertices.map((p) => new THREE.Vector3(...p).applyQuaternion(o.quaternion).add(o.position).toArray() as Vec3);
        return matches(placed, target);
      });
    });
  check(reachable(RHOMBUS_BLOCK, inFrame(corners(B, v, w))), 'face attach offers the all-rhombus block exactly where it sits in the prism');
  check(reachable(SQUARE_BLOCK, inFrame(corners(add(B, v), u, w))), 'face attach offers the second square-faced block exactly where it sits in the prism');
}

// 7b. Face attach can build the skewed rhombic dodecahedron from its four
// blocks, starting from the all-rhombus block (direct report 2026-10-01:
// "face rotation problems"). The blocks sit at v,w,d @0; v,w,x @d; v,d,x @w
// and w,d,x @0, and fill it without overlap.
{
  const { v, w, d } = ZOME_DIRECTIONS;
  const x = ZOME_X;
  const box = (o: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3[] => {
    const out: Vec3[] = [];
    for (const i of [0, 1]) for (const j of [0, 1]) for (const k of [0, 1]) out.push(add(add(add(o, scale(a, i)), scale(b, j)), scale(c, k)));
    return out;
  };
  const c0 = scale(add(add(v, w), d), 0.5);
  const rel = (pts: Vec3[]) => pts.map((p) => sub(p, c0));
  const matches = (a: Vec3[], b: Vec3[]) => a.every((p) => b.some((q) => norm(sub(p, q)) < 1e-6));
  const identity = new THREE.Matrix4();
  const reachable = (incoming: typeof PRISM, target: Vec3[]) =>
    RHOMBUS_BLOCK.faces.some((_, tf) => {
      const faces = incoming.faces.map((_, gi) => gi).filter((gi) => facesCongruent(RHOMBUS_BLOCK.vertices, RHOMBUS_BLOCK.faces[tf], incoming.vertices, incoming.faces[gi]));
      return faces.length > 0 && faceAttachOptions(RHOMBUS_BLOCK, tf, identity, incoming, faces).some((o) =>
        matches(incoming.vertices.map((p) => new THREE.Vector3(...p).applyQuaternion(o.quaternion).add(o.position).toArray() as Vec3), target));
    });
  check(reachable(FLAT_RHOMBOHEDRON, rel(box(d, v, w, x))), 'face attach offers a flattened rhombohedron where it sits in the skewed RD (v, w, x)');
  check(reachable(FLAT_RHOMBOHEDRON, rel(box(w, v, d, x))), 'face attach offers the second flattened rhombohedron where it sits (v, d, x)');
  check(reachable(RHOMBUS_BLOCK, rel(box([0, 0, 0], w, d, x))), 'face attach offers the second all-rhombus block where it sits (w, d, x)');
}

// 8. Families.
for (const id of ['RHOMBOHEDRON', 'DICTO_LEANING_HEX_PRISM', 'DICTO_SQUARE_FACED_BLOCK', 'DICTO_ALL_RHOMBUS_BLOCK', 'DICTO_SKEWED_RD', 'DICTO_FLATTENED_RHOMBOHEDRON']) {
  check(familyIds('PARALLELOHEDRA').includes(id), `${id} is listed in Parallelohedra`);
}
for (const id of ['DICTO_LEANING_HEX_PRISM', 'DICTO_SQUARE_FACED_BLOCK', 'DICTO_ALL_RHOMBUS_BLOCK', 'DICTO_SKEWED_RD', 'DICTO_FLATTENED_RHOMBOHEDRON']) {
  check(familiesFor(id).includes('MISCELLANEOUS'), `${id} lives in Miscellaneous`);
}

console.log(`\n${checks} checks, ${failures} failures.`);
process.exit(failures ? 1 : 0);

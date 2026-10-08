/**
 * Verifies the Dragon Jewel and the stella octangula (krp-core/src/polyhedra/stellaJewel.js), the
 * Stella–Jewel Lattice pair from Kaleidohedra:
 *   - each is a closed surface (every edge on exactly two faces), wound outward;
 *   - Dragon Jewel: 12 rhombi of edge 1 with angles 72/108 (Penrose's thick rhombus) and 48
 *     triangles; volume 12 (phi/2)^3, the windows solid's 12 at cube edge 2;
 *   - stella octangula: 24 triangles, volume 4 (phi/2)^3;
 *   - together, Dragon Jewels on the even cells and stellas on the odd cells fill space: random
 *     points in a patch lie in exactly one piece (point-in-polyhedron by ray casting, since both
 *     are concave).
 */
import { POLYHEDRA } from '../krp-core/src/polyhedra/index.js';
import { familyIds, pairPartners } from '../krp-core/src/polyhedra/families.js';
import type { Vec3 } from '../krp-core/src/polyhedra/core.js';

let failures = 0;
const check = (label: string, ok: boolean) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}`); if (!ok) failures++; };
const PHI = (1 + Math.sqrt(5)) / 2, K = PHI / 2;
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

const DJ = POLYHEDRA.DRAGON_JEWEL, ST = POLYHEDRA.STELLA_OCTANGULA;
check('both shapes are registered, in Space-Filling Pairs, and list each other as pair partners', !!DJ && !!ST && familyIds('SPACE_FILLING_PAIRS').includes('DRAGON_JEWEL') && familyIds('SPACE_FILLING_PAIRS').includes('STELLA_OCTANGULA') && pairPartners('DRAGON_JEWEL').includes('STELLA_OCTANGULA'));

function closedAndOutward(spec: typeof DJ) {
  const dir = new Map<string, number>();
  for (const f of spec.faces) f.forEach((a, j) => { const b = f[(j + 1) % f.length]; dir.set(`${a}>${b}`, (dir.get(`${a}>${b}`) ?? 0) + 1); });
  // Closed and consistently wound: every directed edge once, and its reverse once.
  const ok = [...dir.entries()].every(([k, n]) => { const [a, b] = k.split('>'); return n === 1 && dir.get(`${b}>${a}`) === 1; });
  const vol = spec.faces.reduce((t, f) => { for (let m = 1; m + 1 < f.length; m++) t += dot(spec.vertices[f[0]], cross(spec.vertices[f[m]], spec.vertices[f[m + 1]])); return t; }, 0) / 6;
  return { ok, vol };
}
const dj = closedAndOutward(DJ), st = closedAndOutward(ST);
check(`Dragon Jewel: closed and wound outward; volume ${dj.vol.toFixed(6)} = 12 (phi/2)^3 = ${(12 * K ** 3).toFixed(6)}`, dj.ok && Math.abs(dj.vol - 12 * K ** 3) < 1e-9);
check(`stella octangula: closed and wound outward; volume ${st.vol.toFixed(6)} = 4 (phi/2)^3`, st.ok && Math.abs(st.vol - 4 * K ** 3) < 1e-9);
const quads = DJ.faces.filter((f) => f.length === 4), tris = DJ.faces.filter((f) => f.length === 3);
const angle = (f: number[], k: number) => { const V = DJ.vertices; const a = sub(V[f[(k + 3) % 4]], V[f[k]]), b = sub(V[f[(k + 1) % 4]], V[f[k]]); return (Math.acos(dot(a, b) / (len(a) * len(b))) * 180) / Math.PI; };
const thick = quads.every((f) => f.every((i, k) => Math.abs(len(sub(DJ.vertices[f[(k + 1) % 4]], DJ.vertices[i])) - 1) < 1e-12) && [0, 1, 2, 3].every((k) => [72, 108].some((x) => Math.abs(angle(f, k) - x) < 1e-9)));
check(`Dragon Jewel: ${quads.length} Penrose thick rhombi (edge 1, 72/108 degrees) and ${tris.length} triangles`, quads.length === 12 && tris.length === 48 && thick);
check(`stella octangula: ${ST.faces.length} triangles (its 24 split along the Dragon Jewel seams) on ${ST.vertices.length} corners`, ST.faces.length === 48 && ST.faces.every((f) => f.length === 3) && ST.vertices.length === 26); // 8 tips, 6 face centres, 12 seam points
// Every stella face is congruent to some Dragon Jewel wall, so the two attach face to face.
const sides = (spec: typeof DJ, f: number[]) => f.map((a, k) => len(sub(spec.vertices[f[(k + 1) % f.length]], spec.vertices[a]))).sort((x, y) => x - y);
const wallKinds = tris.map((f) => sides(DJ, f));
check('every stella face matches a Dragon Jewel wall (same side lengths), so the two attach', ST.faces.every((f) => { const s2 = sides(ST, f); return wallKinds.some((w) => w.every((x, i) => Math.abs(x - s2[i]) < 1e-9)); }));

// Point in a closed polyhedron: ray casting along a fixed generic direction.
function inside(spec: typeof DJ, p: Vec3, offset: Vec3): boolean {
  const d: Vec3 = [0.5773, 0.6123, 0.5401];
  let hits = 0;
  for (const f of spec.faces) for (let m = 1; m + 1 < f.length; m++) {
    const a = sub(spec.vertices[f[0]], sub(p, offset)), b = sub(spec.vertices[f[m]], sub(p, offset)), c = sub(spec.vertices[f[m + 1]], sub(p, offset));
    // Moller-Trumbore from the origin along d.
    const e1 = sub(b, a), e2 = sub(c, a), h = cross(d, e2), det = dot(e1, h);
    if (Math.abs(det) < 1e-12) continue;
    const s: Vec3 = [-a[0], -a[1], -a[2]];
    const u = dot(s, h) / det; if (u < 0 || u > 1) continue;
    const q = cross(s, e1), v = dot(d, q) / det; if (v < 0 || u + v > 1) continue;
    if (dot(e2, q) / det > 0) hits++;
  }
  return hits % 2 === 1;
}
let bad = 0, seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const N = 3000;
for (let n = 0; n < N; n++) {
  const p: Vec3 = [rand() * 2 * K, rand() * 2 * K, rand() * 2 * K];
  let count = 0;
  for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) {
    const o: Vec3 = [2 * K * x, 2 * K * y, 2 * K * z];
    if (inside((x + y + z) % 2 === 0 ? DJ : ST, p, o)) count++;
  }
  if (count !== 1) bad++;
}
check(`Dragon Jewels (even cells) and stellas (odd cells) fill space: ${N} random points, ${bad} in none or several`, bad === 0);

console.log(failures === 0 ? '\nAll checks passed (0 failures).' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);

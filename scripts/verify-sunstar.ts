/**
 * Verifies the Sunstar Lattice pair (app/lib/polyhedra/sunstar.ts): the seamed dodecahedron and
 * the Dogstar.
 *   - each is a closed surface, wound outward;
 *   - volumes: the regular dodecahedron's (15 + 7 sqrt 5)/4 at edge 1, and the Dogstar's
 *     (16 - dodecahedron) (phi/2)^3, the hole one dodecahedron leaves per cell;
 *   - the Dogstar's edges are only 2/phi^4 .. 2/phi times phi/2;
 *   - the seams match: every Dogstar face is congruent to some seamed-dodecahedron face, so a
 *     Dogstar attaches face to face (a Sunstar is a seamed dodecahedron with 6 Dogstars on it);
 *   - they fill space: dodecahedra on the even cells and Dogstars on the odd cells, random points
 *     each in exactly one piece (ray casting, both pieces being concave or seamed);
 *   - both are in Space-Filling Pairs as each other's partner.
 */
import { POLYHEDRA } from '../app/lib/polyhedra';
import { familyIds, pairPartners } from '../app/lib/polyhedra/families';
import { facesCongruent, type Vec3 } from '../app/lib/polyhedra/core';
import { DOGSTAR_REQUEST } from '../app/lib/polyhedra/sunstar';
import { fingerprintOf } from '../krp-core/src/vocabulary.js';

let failures = 0;
const check = (label: string, ok: boolean) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}`); if (!ok) failures++; };
const PHI = (1 + Math.sqrt(5)) / 2, K = PHI / 2;
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const D = POLYHEDRA.SEAMED_DODECAHEDRON, G = POLYHEDRA.DOGSTAR;
check('both shapes are registered, in Space-Filling Pairs, and partner each other', !!D && !!G && familyIds('SPACE_FILLING_PAIRS').includes('DOGSTAR') && pairPartners('DOGSTAR').includes('SEAMED_DODECAHEDRON'));
function closedVolume(spec: typeof D) {
  const dir = new Map<string, number>();
  for (const f of spec.faces) f.forEach((a, j) => { const k = `${a}>${f[(j + 1) % f.length]}`; dir.set(k, (dir.get(k) ?? 0) + 1); });
  const closed = [...dir.entries()].every(([k, n]) => { const [a, b] = k.split('>'); return n === 1 && dir.get(`${b}>${a}`) === 1; });
  const vol = spec.faces.reduce((t, f) => { for (let m = 1; m + 1 < f.length; m++) t += dot(spec.vertices[f[0]], cross(spec.vertices[f[m]], spec.vertices[f[m + 1]])); return t; }, 0) / 6;
  return { closed, vol };
}
const dodecaVol1 = (15 + 7 * Math.sqrt(5)) / 4;
const d = closedVolume(D), g = closedVolume(G);
check(`seamed dodecahedron: closed, wound outward, ${D.faces.length} faces; volume ${d.vol.toFixed(9)} = the dodecahedron's at edge 1`, d.closed && Math.abs(d.vol - dodecaVol1) < 1e-9);
const holeVol = (16 - dodecaVol1 * (2 / PHI) ** 3) * K ** 3;
check(`Dogstar: closed, wound outward, ${G.faces.length} faces; volume ${g.vol.toFixed(9)} = (16 - dodecahedron) (phi/2)^3`, g.closed && Math.abs(g.vol - holeVol) < 1e-9);
// Dogstar edges: golden lengths only (the seams split some of its edge-1 edges into 1/phi^2 + 1/phi).
const golden = [4, 3, 2, 1].map((k) => (2 / PHI ** k) * K);
const lens = new Set<string>();
G.edges.forEach(([a, b]) => lens.add(Math.hypot(...sub(G.vertices[a], G.vertices[b])).toFixed(6)));
check(`Dogstar edge lengths only 1/phi^3, 1/phi^2, 1/phi, 1 at dodecahedron edge 1 (${[...lens].sort().join(', ')}); volume exactly phi/2`, [...lens].every((l) => golden.some((x) => Math.abs(Number(l) - x) < 1e-6)) && Math.abs(g.vol - PHI / 2) < 1e-9);
// Seams: every Dogstar face matches a seamed-dodecahedron face.
const unmatched = G.faces.filter((f) => !D.faces.some((h) => h.length === f.length && facesCongruent(G.vertices, f, D.vertices, h)));
check(`every Dogstar face is congruent to a seamed-dodecahedron face (${G.faces.length - unmatched.length} of ${G.faces.length})`, unmatched.length === 0);

// Fill: dodecahedra (seamed) on the even cells, Dogstars on the odd, cube edge phi.
function inside(spec: typeof D, p: Vec3, o: Vec3): boolean {
  const dir: Vec3 = [0.5773, 0.6123, 0.5401];
  let hits = 0;
  for (const f of spec.faces) for (let m = 1; m + 1 < f.length; m++) {
    const a = sub(spec.vertices[f[0]], sub(p, o)), b = sub(spec.vertices[f[m]], sub(p, o)), c = sub(spec.vertices[f[m + 1]], sub(p, o));
    const e1 = sub(b, a), e2 = sub(c, a), h = cross(dir, e2), det = dot(e1, h);
    if (Math.abs(det) < 1e-12) continue;
    const s: Vec3 = [-a[0], -a[1], -a[2]];
    const u = dot(s, h) / det; if (u < 0 || u > 1) continue;
    const q = cross(s, e1), v = dot(dir, q) / det; if (v < 0 || u + v > 1) continue;
    if (dot(e2, q) / det > 0) hits++;
  }
  return hits % 2 === 1;
}
let bad = 0, seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const N = 1500;
for (let n = 0; n < N; n++) {
  const p: Vec3 = [rand() * 2 * K, rand() * 2 * K, rand() * 2 * K];
  let count = 0;
  for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) {
    const o: Vec3 = [2 * K * x, 2 * K * y, 2 * K * z];
    if (Math.hypot(...sub(p, o)) > 2.2 * K * PHI) continue;
    if (inside((((x + y + z) % 2) + 2) % 2 === 0 ? D : G, p, o)) count++;
  }
  if (count !== 1) bad++;
}
check(`dodecahedra (even cells) and Dogstars (odd cells) fill space: ${N} random points, ${bad} in none or several`, bad === 0);

// KRP stage 3: the Dogstar is krp-core's recorded object, requested by ID, at this file's scale.
{
  const d = DOGSTAR_REQUEST.description;
  check(`Dogstar is krp-core's ${d.id} (${d.status}): fingerprint ${d.fingerprint} reproduced, volume ${d.measurements.volume.toFixed(9)} x (phi/2)^3 = this piece's`,
    d.fingerprint === fingerprintOf(DOGSTAR_REQUEST.faces) && Math.abs(d.measurements.volume * K ** 3 - g.vol) < 1e-9 && d.status === 'Curated');
}

console.log(failures === 0 ? '\nAll checks passed (0 failures).' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);

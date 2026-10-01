/**
 * Checks DICTO's skewed ED (miscellaneous/zome-parallelohedra:
 * DICTO_SKEWED_ED_16, DICTO_SKEWED_ED_18) — two ways to extend DICTO's
 * skewed rhombic dodecahedron (DICTO_SKEWED_RD) by a fifth edge direction,
 * found in Kaleidoverse (DISCOVERIES.md #7) by matching its Gram matrix
 * against every already-catalogued equal-edge elongated-dodecahedron cell
 * in geometry-targets.json, not by any Zometool construction:
 *
 *   - both keep DICTO_SKEWED_RD's own four directions exactly (v, w, d, ZOME_X);
 *   - every edge has length 1 and the shape passes generic validation
 *     (Euler's formula, edge/face consistency);
 *   - the exact face counts and kinds (rhombi of 60 and 72 degrees, and
 *     the two non-regular hexagon corner patterns, or regular hexagons);
 *   - the exact volumes, phi^2 + 2 and phi^3 + 1/2;
 *   - each direction set tiles space by translation (Venkov: centrally
 *     symmetric, every belt of 4 or 6 faces).
 */
import { POLYHEDRA } from '../app/lib/polyhedra';
import { type Vec3, validateShape } from '../app/lib/polyhedra/core';
import { ZOME_DIRECTIONS, ZOME_X, DICTO_SKEWED_ED_16_DIRECTION, DICTO_SKEWED_ED_18_DIRECTION } from '../app/lib/polyhedra/miscellaneous';

let failures = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); if (!ok) failures++; };

const { v, w, d } = ZOME_DIRECTIONS;
const PHI = (1 + Math.sqrt(5)) / 2;

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const det3 = (a: Vec3, b: Vec3, c: Vec3) => dot(a, cross(b, c));
const norm = (a: Vec3) => Math.hypot(...a);
const lineAngle = (a: Vec3, b: Vec3) => (Math.acos(Math.min(1, Math.abs(dot(a, b)) / norm(a) / norm(b))) * 180) / Math.PI;
const coplanar = (a: Vec3, b: Vec3, c: Vec3) => Math.abs(det3(a, b, c)) < 1e-9;

/** Zonohedron volume: sum over every 3-direction choice of |det|. */
const zonoVolume = (gens: Vec3[]) => {
  let total = 0;
  for (let i = 0; i < gens.length; i++) for (let j = i + 1; j < gens.length; j++) for (let k = j + 1; k < gens.length; k++) total += Math.abs(det3(gens[i], gens[j], gens[k]));
  return total;
};

/** Face kinds from a generator set, as a sorted count map (opposite faces both counted). */
const faceKinds = (gens: Vec3[]): Record<string, number> => {
  const out: string[] = [];
  for (let i = 0; i < gens.length; i++) for (let j = i + 1; j < gens.length; j++) {
    const third = gens.findIndex((g, k) => k !== i && k !== j && coplanar(gens[i], gens[j], g));
    if (third >= 0) {
      if (third < j) continue; // each hexagon once, from its lowest pair
      const angs = [lineAngle(gens[i], gens[j]), lineAngle(gens[i], gens[third]), lineAngle(gens[j], gens[third])].map((a) => Math.round(a * 1000) / 1000).sort((a, b) => a - b);
      const regular = angs.every((a) => a === 60);
      const label = regular ? 'regular hexagon' : `hexagon ${angs.join('/')}`;
      out.push(label, label);
    } else {
      const a = Math.round(lineAngle(gens[i], gens[j]) * 1000) / 1000;
      const label = a === 90 ? 'square' : `rhombus ${a}`;
      out.push(label, label);
    }
  }
  const count: Record<string, number> = {};
  for (const f of out) count[f] = (count[f] || 0) + 1;
  return Object.fromEntries(Object.entries(count).sort());
};

/** Venkov's criterion: every direction lies in exactly 2 or 3 coplanar-pair belts with the others. */
const isParallelohedron = (gens: Vec3[]) => gens.every((g) => {
  const planes: Vec3[] = [];
  for (const h of gens) {
    if (h === g) continue;
    const n = cross(g, h);
    const u = norm(n);
    if (u < 1e-9) continue;
    const nu: Vec3 = [n[0] / u, n[1] / u, n[2] / u];
    if (!planes.some((m) => Math.abs(Math.abs(dot(nu, m)) - 1) < 1e-9)) planes.push(nu);
  }
  return planes.length === 2 || planes.length === 3;
});

const GENS_16: Vec3[] = [v, w, d, ZOME_X, DICTO_SKEWED_ED_16_DIRECTION];
const GENS_18: Vec3[] = [v, w, d, ZOME_X, DICTO_SKEWED_ED_18_DIRECTION];

check(GENS_16.every((g) => Math.abs(norm(g) - 1) < 1e-9) && GENS_18.every((g) => Math.abs(norm(g) - 1) < 1e-9), 'both direction sets have unit length');
check(isParallelohedron(GENS_16), 'DICTO skewed ED #16 tiles space by translation (Venkov)');
check(isParallelohedron(GENS_18), 'DICTO skewed ED #18 tiles space by translation (Venkov)');

const expect16 = { 'hexagon 36/36/72': 2, 'regular hexagon': 2, 'rhombus 60': 4, 'rhombus 72': 4 };
const expect18 = { 'hexagon 36/72/72': 4, 'rhombus 60': 6, 'rhombus 72': 2 };
check(JSON.stringify(faceKinds(GENS_16)) === JSON.stringify(Object.fromEntries(Object.entries(expect16).sort())), `DICTO skewed ED #16 faces: 4 rhombus 60, 4 rhombus 72, 2 hexagon 36/36/72, 2 regular hexagon (${JSON.stringify(faceKinds(GENS_16))})`);
check(JSON.stringify(faceKinds(GENS_18)) === JSON.stringify(Object.fromEntries(Object.entries(expect18).sort())), `DICTO skewed ED #18 faces: 6 rhombus 60, 2 rhombus 72, 4 hexagon 36/72/72 (${JSON.stringify(faceKinds(GENS_18))})`);

check(Math.abs(zonoVolume(GENS_16) - (PHI * PHI + 2)) < 1e-9, `DICTO skewed ED #16 volume is phi^2 + 2 (${zonoVolume(GENS_16).toFixed(6)})`);
check(Math.abs(zonoVolume(GENS_18) - (PHI * PHI * PHI + 0.5)) < 1e-9, `DICTO skewed ED #18 volume is phi^3 + 1/2 (${zonoVolume(GENS_18).toFixed(6)})`);

check(GENS_16.slice(0, 4).every((g, i) => g.every((x, k) => x === [v, w, d, ZOME_X][i][k])) && GENS_18.slice(0, 4).every((g, i) => g.every((x, k) => x === [v, w, d, ZOME_X][i][k])), "both keep DICTO's skewed RD directions (v, w, d, ZOME_X) unchanged as their first four");

for (const id of ['DICTO_SKEWED_ED_16', 'DICTO_SKEWED_ED_18']) {
  const spec = POLYHEDRA[id];
  check(!!spec, `${id} is registered in POLYHEDRA`);
  if (spec) {
    const problems = validateShape(spec);
    check(problems.length === 0, `${id} passes validateShape (${problems.join('; ') || 'no problems'})`);
    check(spec.vertices.length === 18 && spec.faces.length === 12 && spec.edges.length === 28, `${id} has the elongated dodecahedron's combinatorics (18 vertices, 12 faces, 28 edges): got ${spec.vertices.length}, ${spec.faces.length}, ${spec.edges.length}`);
  }
}

console.log(failures === 0 ? '\nAll checks passed (0 failures).' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);

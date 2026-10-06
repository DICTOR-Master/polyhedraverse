/**
 * Checks the rhombic-dodecahedron sub-family (miscellaneous/rd-targets):
 * each target has 12 faces, every edge 1, the volume of Kaleidohedra's
 * table (TARGETS.md, rhombic dodecahedron rows), validateShape passes, and
 * all 24 are in the Parallelohedra family.
 */
import { POLYHEDRA } from '../app/lib/polyhedra';
import { validateShape } from '../app/lib/polyhedra/core';
import { KALEIDOHEDRA_RD_TARGETS, familyIds } from '../app/lib/polyhedra/families';

let failures = 0;
let checks = 0;
const check = (ok: boolean, msg: string) => {
  checks++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`);
  if (!ok) failures++;
};
type V = [number, number, number];
const volumeOf = (vs: V[], faces: number[][]) => {
  // divergence theorem over fan-triangulated faces, outward orientation as stored
  let vol = 0;
  for (const f of faces) for (let i = 1; i + 1 < f.length; i++) {
    const a = vs[f[0]], b = vs[f[i]], c = vs[f[i + 1]];
    vol += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  return Math.abs(vol) / 6;
};
const WANT: Record<string, number> = {"RD_TARGET_1": 1.61803, "RD_TARGET_2": 1.42705, "RD_TARGET_3": 1.87268, "RD_TARGET_4": 2.0, "RD_TARGET_5": 1.80902, "RD_TARGET_6": 1.92705, "RD_TARGET_7": 2.0, "RD_TARGET_8": 2.11803, "RD_TARGET_9": 1.61803, "RD_TARGET_10": 2.11803, "RD_TARGET_11": 2.30902, "RD_TARGET_12": 2.42705, "RD_TARGET_13": 2.23607, "RD_TARGET_14": 2.61803, "RD_TARGET_15": 2.61803, "RD_TARGET_16": 1.94281, "RD_TARGET_17": 2.20711, "RD_TARGET_18": 2.41421, "RD_TARGET_19": 2.41421, "RD_TARGET_20": 2.70711, "RD_TARGET_21": 2.35702, "RD_TARGET_23": 2.61803, "RD_TARGET_24": 2.82843, "RD_TARGET_26": 2.92705};
check(KALEIDOHEDRA_RD_TARGETS.length === 24, `24 targets listed (got ${KALEIDOHEDRA_RD_TARGETS.length})`);
const inParallelohedra = new Set(familyIds('PARALLELOHEDRA'));
for (const id of KALEIDOHEDRA_RD_TARGETS) {
  const s = POLYHEDRA[id];
  check(!!s, `${id} is registered`);
  if (!s) continue;
  check(s.faceCount === 12, `${id} has 12 faces (got ${s.faceCount})`);
  const vs = s.vertices as V[];
  let edgeOk = true;
  for (const [a, b] of s.edges) {
    const len = Math.hypot(vs[a][0] - vs[b][0], vs[a][1] - vs[b][1], vs[a][2] - vs[b][2]);
    if (Math.abs(len - 1) > 1e-6) edgeOk = false;
  }
  check(edgeOk, `${id} every edge is 1`);
  const vol = volumeOf(vs, s.faces);
  check(Math.abs(vol - WANT[id]) < 1e-4, `${id} volume ${vol.toFixed(6)} = table ${WANT[id].toFixed(6)}`);
  check(validateShape(s).length === 0, `${id} validateShape`);
  check(inParallelohedra.has(id), `${id} listed in Parallelohedra`);
}
console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);

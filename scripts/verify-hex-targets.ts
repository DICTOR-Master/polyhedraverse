/**
 * Checks the hexagonal-prism sub-family (miscellaneous/hex-targets):
 * each target has 8 faces (two hexagons, six sides), every edge 1, the
 * volume of Kaleidohedra's table (TARGETS.md, hexagonal prism rows),
 * validateShape passes, and all are in the Parallelohedra family.
 */
import { POLYHEDRA } from '../app/lib/polyhedra';
import { validateShape } from '../app/lib/polyhedra/core';
import { KALEIDOHEDRA_HEX_TARGETS, familyIds } from '../app/lib/polyhedra/families';

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
const WANT: Record<string, number> = {"HEX_TARGET_1": 1.11803, "HEX_TARGET_2": 1.11803, "HEX_TARGET_3": 1.30902, "HEX_TARGET_4": 0.927051, "HEX_TARGET_5": 1.30902, "HEX_TARGET_6": 1.80902, "HEX_TARGET_7": 1.11803, "HEX_TARGET_8": 1.30902, "HEX_TARGET_9": 1.80902, "HEX_TARGET_10": 1.75159, "HEX_TARGET_11": 1.80902, "HEX_TARGET_12": 2.12663, "HEX_TARGET_13": 1.66509, "HEX_TARGET_14": 1.5, "HEX_TARGET_15": 2.11803, "HEX_TARGET_16": 2.11803, "HEX_TARGET_17": 2.11803, "HEX_TARGET_18": 2.33196, "HEX_TARGET_19": 2.3548, "HEX_TARGET_20": 2.4899, "HEX_TARGET_21": 1.70711, "HEX_TARGET_22": 1.70711, "HEX_TARGET_23": 1.5, "HEX_TARGET_24": 1.70711, "HEX_TARGET_25": 2.12914, "HEX_TARGET_26": 2.17147, "HEX_TARGET_27": 2.41421, "HEX_TARGET_29": 2.39792};
check(KALEIDOHEDRA_HEX_TARGETS.length === 28, `28 targets listed (got ${KALEIDOHEDRA_HEX_TARGETS.length})`);
const inParallelohedra = new Set(familyIds('PARALLELOHEDRA'));
for (const id of KALEIDOHEDRA_HEX_TARGETS) {
  const s = POLYHEDRA[id];
  check(!!s, `${id} is registered`);
  if (!s) continue;
  check(s.faceCount === 8, `${id} has 8 faces (got ${s.faceCount})`);
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

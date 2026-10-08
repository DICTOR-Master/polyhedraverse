/**
 * Verifies Nets (krp-core/src/polyhedra-nets/unfold.js) across the whole registry, and
 * writes krp-core/src/polyhedra-nets/eligible.json, the shapes that get a Net button.
 *
 * Every shape outside the star and 4D families (direct decision
 * 2026-09-30: star and other too-difficult shapes get no net) is unfolded.
 * For each net found:
 *   - no two faces of the flat net overlap (the search guarantees it; checked again here);
 *   - folded (t = 1), every face lands back on its place in the solid, so it closes;
 *   - hinges = faces - 1, and every other edge is one glued pair (hinges + pairs = edges).
 * Run with --write to refresh eligible.json; without it, the file must match.
 */
import { writeFileSync, readFileSync } from 'fs';
import { POLYHEDRA } from '../krp-core/src/polyhedra/index.js';
import { FAMILY_ORDER, familyIds } from '../krp-core/src/polyhedra/families.js';
import { netOf, apply, polygonsOverlap } from '../krp-core/src/polyhedra-nets/unfold.js';

const NO_NET_FAMILIES = ['STELLATIONS', 'POLYTOPES_4D'];
const excluded = new Set(NO_NET_FAMILIES.flatMap((k) => familyIds(k as (typeof FAMILY_ORDER)[number])));
let failures = 0;
const check = (label: string, ok: boolean) => { if (!ok) { console.log(`FAIL ${label}`); failures++; } };

const eligible: string[] = [];
const none: string[] = [];
const t0 = Date.now();
let slowest = { id: '', ms: 0 };
for (const [id, spec] of Object.entries(POLYHEDRA)) {
  if (excluded.has(id)) continue;
  const s = Date.now();
  const net = netOf(spec.vertices, spec.faces);
  const ms = Date.now() - s;
  if (ms > slowest.ms) slowest = { id, ms };
  if (!net) { none.push(id); continue; }
  eligible.push(id);
  const F = net.flat;
  let clash = false;
  for (let i = 0; i < F.length && !clash; i++) for (let j = i + 1; j < F.length && !clash; j++) if (polygonsOverlap(F[i], F[j])) clash = true;
  check(`${id}: flat net has no overlapping faces`, !clash);
  const T1 = net.at(1), M0 = T1[net.tree.order[0]];
  const closes = net.faces.every((f, i) => f.pts.every((p) => { const a = apply(T1[i], p), b = apply(M0, p); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-6; }));
  check(`${id}: folds closed`, closes);
  check(`${id}: ${net.hinges.length} hinges = faces - 1, + ${net.pairs.length} glued pairs = ${spec.edges.length} edges`, net.hinges.length === spec.faces.length - 1 && net.hinges.length + net.pairs.length === spec.edges.length);
}
console.log(`${eligible.length} shapes have a net; ${none.length} have none (${none.join(', ') || '-'}); ${excluded.size} star/4D shapes skipped. ${((Date.now() - t0) / 1000).toFixed(1)} s, slowest ${slowest.id} ${slowest.ms} ms.`);
const file = 'krp-core/src/polyhedra-nets/eligible.json';
const json = JSON.stringify(eligible.sort(), null, 0) + '\n';
if (process.argv.includes('--write')) writeFileSync(file, json);
else check(`${file} matches (run with --write to refresh)`, readFileSync(file, 'utf8') === json);
console.log(failures === 0 ? 'All checks passed (0 failures).' : `${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);

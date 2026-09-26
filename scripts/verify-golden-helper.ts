/**
 * Checks the golden-rhombohedra helper (app/lib/golden/goldenHelper.ts):
 * starting from one prolate golden rhombohedron, 40 "next safe piece"
 * steps keep every piece inside the true 3D Penrose tiling, the build
 * valid and fully face-joined, and no two pieces overlapping (for convex
 * pieces, a pair whose joint hull is smaller than their two volumes must
 * overlap); and goldenStatus reports on the ready-made golden builds.
 */
import { Quaternion, Vector3 } from 'three';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js';
import { POLYHEDRA } from '../app/lib/polyhedra';
import { isValidAssembly, type Assembly, type AssemblyNode } from '../app/lib/assembly';
import { goldenStatus, withNextSafePiece } from '../app/lib/golden/goldenHelper';
import { goldenZonohedron, withNextRecipePiece, GOLDEN_BUILDS } from '../app/lib/goldenBuilds';
import { describeAssembly } from '../app/lib/assemblyNaming';

let failures = 0;
function check(label: string, ok: boolean, extra = '') {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${extra ? `  (${extra})` : ''}`);
  if (!ok) failures++;
}
const worldVerts = (n: AssemblyNode) => {
  const s = POLYHEDRA[n.shape];
  const q = new Quaternion(...n.transform.quaternion);
  return s.vertices.map((v) => new Vector3(...v).applyQuaternion(q).add(new Vector3(...n.transform.position)));
};
const hullVolume = (pts: Vector3[]) => {
  const h = new ConvexHull().setFromPoints(pts);
  let v = 0;
  for (const f of h.faces) {
    const p: Vector3[] = [];
    let e = f.edge;
    do { p.push(e.head().point); e = e.next; } while (e !== f.edge);
    for (let i = 1; i + 1 < p.length; i++) v += p[0].dot(p[i].clone().cross(p[i + 1])) / 6;
  }
  return Math.abs(v);
};

let a: Assembly = { nodes: [{ id: 'n0', shape: 'GOLDEN_RHOMBOHEDRON_PROLATE', transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] } } as AssemblyNode], connections: [] };
let stepsOk = true;
for (let i = 0; i < 40 && stepsOk; i++) {
  const next = withNextSafePiece(a);
  if (!next) { stepsOk = false; console.log(`  no safe piece offered at step ${i}`); break; }
  a = next;
  const st = goldenStatus(a);
  if (!st || st.inTiling !== st.total || !isValidAssembly(a) || a.connections.length !== a.nodes.length - 1) {
    stepsOk = false;
    console.log(`  step ${i}: status ${JSON.stringify(st)}, valid ${isValidAssembly(a)}`);
  }
}
check('40 safe steps: every piece stays in the Penrose tiling; valid, fully joined build', stepsOk && a.nodes.length === 41,
  `${a.nodes.filter((n) => n.shape.endsWith('PROLATE')).length} prolate + ${a.nodes.filter((n) => n.shape.endsWith('OBLATE')).length} oblate`);
const verts = a.nodes.map(worldVerts);
const vols = verts.map(hullVolume);
let overlaps = 0;
for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) {
  if (verts[i][0].distanceTo(verts[j][0]) > 3) continue;
  if (hullVolume([...verts[i], ...verts[j]]) < vols[i] + vols[j] - 1e-7) overlaps++;
}
check('no two pieces overlap', overlaps === 0, `${overlaps} overlapping pairs`);
check('goldenStatus is null for a build with other shapes', goldenStatus({ nodes: [{ id: 'x', shape: 'CUBE', transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] } } as AssemblyNode], connections: [] }) === null);
for (const k of [4, 5, 6]) {
  const s = goldenStatus(goldenZonohedron(k));
  check(`golden build (${k} axes): status computed`, !!s && s.total === goldenZonohedron(k).nodes.length, `${s?.inTiling} of ${s?.total} in the tiling`);
}
// Recipes: from an empty build, Next step builds each golden zonohedron one
// face-joined piece at a time and ends named.
for (const b of GOLDEN_BUILDS) {
  let r: Assembly = { nodes: [], connections: [] };
  let steps = 0, stepOk = true;
  for (;;) {
    const next = withNextRecipePiece(r, b.axes);
    if (next.assembly.nodes.length === r.nodes.length) break;
    r = next.assembly;
    steps++;
    if (!isValidAssembly(r) || r.connections.length !== r.nodes.length - 1 || next.step !== r.nodes.length) stepOk = false;
    if (steps > 30) break;
  }
  const name = describeAssembly(r.nodes, r.connections);
  check(`recipe ${b.name}: ${steps} steps, each valid and joined, ends named`, stepOk && steps === goldenZonohedron(b.axes).nodes.length && name.toLowerCase().includes(b.name.toLowerCase()), name);
}
const other = withNextRecipePiece(a, 4);
check('recipe on a build that is not part of it starts over with its first piece', other.assembly.nodes.length === 1 && other.step === 1);
console.log(`\n${failures} failures.`);
process.exit(failures ? 1 : 0);

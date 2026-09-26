/**
 * Checks the Aperiodic Sets family (app/lib/polyhedra/aperiodic.ts):
 * - both golden rhombohedra: 8 corners, 12 edges all 1/phi (the rhombic
 *   triacontahedron's edge), 6 flat outward faces each starting at its
 *   acute corner, volumes in the golden ratio;
 * - every face is congruent to the triacontahedron's (so they attach to it
 *   and to each other);
 * - the golden zonohedra as real assemblies: each triple of the six
 *   icosahedral 5-fold axes gives one rhombohedron of the zonotope tiling
 *   (placed by the standard lifting rule), and describeAssembly names the
 *   Bilinski dodecahedron (4 axes), rhombic icosahedron (5) and rhombic
 *   triacontahedron (6); the same pieces jumbled get no such name.
 */
import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three';
import { POLYHEDRA, facesCongruent } from '../app/lib/polyhedra';
import { describeAssembly } from '../app/lib/assemblyNaming';
import type { AssemblyNode } from '../app/lib/assembly';

let failures = 0;
function check(label: string, ok: boolean, extra = '') {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${extra ? `  (${extra})` : ''}`);
  if (!ok) failures++;
}
const PHI = (1 + Math.sqrt(5)) / 2;
const P = POLYHEDRA.GOLDEN_RHOMBOHEDRON_PROLATE, O = POLYHEDRA.GOLDEN_RHOMBOHEDRON_OBLATE, RT = POLYHEDRA.RHOMBIC_TRIACONTAHEDRON;
const V = (a: number[]) => new Vector3(a[0], a[1], a[2]);
const volumeOf = (spec: typeof P) => {
  const c = spec.vertices.reduce((s, v) => s.add(V(v)), new Vector3()).divideScalar(spec.vertices.length);
  let vol = 0;
  for (const f of spec.faces) for (let i = 1; i + 1 < f.length; i++) vol += V(spec.vertices[f[0]]).sub(c).dot(V(spec.vertices[f[i]]).sub(c).cross(V(spec.vertices[f[i + 1]]).sub(c))) / 6;
  return vol;
};
for (const spec of [P, O]) {
  check(`${spec.name}: 8 corners, 12 edges, 6 faces`, spec.vertices.length === 8 && spec.edges.length === 12 && spec.faces.length === 6);
  check(`${spec.name}: every edge is 1/phi, the triacontahedron's`, spec.edges.every(([a, b]) => Math.abs(V(spec.vertices[a]).distanceTo(V(spec.vertices[b])) - 1 / PHI) < 1e-9));
  const c = spec.vertices.reduce((s, v) => s.add(V(v)), new Vector3()).divideScalar(8);
  check(`${spec.name}: faces wound outward, acute corner first`, spec.faces.every((f) => {
    const q = f.map((i) => V(spec.vertices[i]));
    const n = q[1].clone().sub(q[0]).cross(q[3].clone().sub(q[0]));
    const angle = q[1].clone().sub(q[0]).angleTo(q[3].clone().sub(q[0])) * 180 / Math.PI;
    return n.dot(q[0].clone().add(q[2]).multiplyScalar(0.5).sub(c)) > 0 && Math.abs(angle - 63.4349) < 1e-3;
  }));
  check(`${spec.name}: every face congruent to the triacontahedron's (attachable)`, spec.faces.every((f) => facesCongruent(spec.vertices, f, RT.vertices, RT.faces[0])));
}
check('volumes in the golden ratio (prolate / oblate = phi)', Math.abs(volumeOf(P) / volumeOf(O) - PHI) < 1e-9, (volumeOf(P) / volumeOf(O)).toFixed(9));

// ---- the golden zonohedra as assemblies ----
const unit = (x: number, y: number, z: number) => new Vector3(x, y, z).normalize().multiplyScalar(1 / PHI);
const AXES = [unit(0, 1, PHI), unit(0, -1, PHI), unit(1, PHI, 0), unit(-1, PHI, 0), unit(PHI, 0, 1), unit(-PHI, 0, 1)];
const HEIGHTS = [0.31, 0.77, 0.12, 0.58, 0.93, 0.44]; // generic lift
const det3 = (a: Vector3, b: Vector3, c: Vector3) => a.dot(b.clone().cross(c));
const det4 = (m: number[][]) => new Matrix4().set(...(m.flat() as [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number])).determinant();
// Rotation taking the spec's edge vectors onto a given triple (up to order
// and sign), or null.
function rotationFor(spec: typeof P, triple: Vector3[]): Quaternion | null {
  const e = [1, 2, 4].map((m) => V(spec.vertices[m]).sub(V(spec.vertices[0]))); // edges from corner 0 (bits of the generator)
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const p of perms) for (let s = 0; s < 8; s++) {
    const t = p.map((i, k) => triple[i].clone().multiplyScalar(s & (1 << k) ? -1 : 1));
    const A = new Matrix3().set(e[0].x, e[1].x, e[2].x, e[0].y, e[1].y, e[2].y, e[0].z, e[1].z, e[2].z);
    const B = new Matrix3().set(t[0].x, t[1].x, t[2].x, t[0].y, t[1].y, t[2].y, t[0].z, t[1].z, t[2].z);
    const R = B.multiply(A.invert());
    const Rt = R.clone().transpose();
    const I = R.clone().multiply(Rt).elements;
    if (I.every((x, i) => Math.abs(x - ([0, 4, 8].includes(i) ? 1 : 0)) < 1e-9) && R.determinant() > 0) {
      return new Quaternion().setFromRotationMatrix(new Matrix4().setFromMatrix3(R));
    }
  }
  return null;
}
function zonohedronNodes(k: number): AssemblyNode[] | null {
  const idx = [...Array(k).keys()];
  const nodes: AssemblyNode[] = [];
  for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) for (let c = b + 1; c < k; c++) {
    const T = [a, b, c];
    const s = Math.sign(det3(AXES[a], AXES[b], AXES[c]));
    const base = new Vector3();
    for (const l of idx) {
      if (T.includes(l)) continue;
      const m = [...T, l].map((i) => [AXES[i].x, AXES[i].y, AXES[i].z, HEIGHTS[i]]);
      if (Math.sign(det4(m)) * s > 0) base.add(AXES[l]);
    }
    const triple = T.map((i) => AXES[i]);
    const spec = [P, O].find((sp) => rotationFor(sp, triple));
    if (!spec) return null;
    const q = rotationFor(spec, triple)!;
    const centre = base.clone().add(triple[0].clone().add(triple[1]).add(triple[2]).multiplyScalar(0.5));
    nodes.push({ id: `n${nodes.length}`, shape: spec.id, transform: { position: [centre.x, centre.y, centre.z], quaternion: [q.x, q.y, q.z, q.w] } } as AssemblyNode);
  }
  return nodes;
}
for (const [k, name, each] of [[4, 'Bilinski Dodecahedron', 2], [5, 'Rhombic Icosahedron', 5], [6, 'Rhombic Triacontahedron (golden rhombohedra)', 10]] as const) {
  const nodes = zonohedronNodes(k);
  const counts = nodes ? [P.id, O.id].map((id) => nodes.filter((n) => n.shape === id).length).join(' + ') : 'none';
  check(`${k} axes: ${each} prolate + ${each} oblate`, !!nodes && counts === `${each} + ${each}`, counts);
  const got = nodes ? describeAssembly(nodes, []) : '';
  check(`${k} axes: named "${name}"`, got.includes(name), got);
  if (nodes) {
    const jumbled = nodes.map((n, i) => ({ ...n, transform: { ...n.transform, position: [n.transform.position[0] + (i % 3) * 0.37, n.transform.position[1], n.transform.position[2]] as [number, number, number] } }));
    check(`${k} axes, same pieces jumbled: not named "${name}"`, !describeAssembly(jumbled, []).includes(name));
  }
}
console.log(`\n${failures} failures.`);
process.exit(failures ? 1 : 0);

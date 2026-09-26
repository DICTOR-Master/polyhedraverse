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
import { Vector3 } from 'three';
import { goldenZonohedron } from '../app/lib/goldenBuilds';
import { isValidAssembly } from '../app/lib/assembly';
import { POLYHEDRA, facesCongruent } from '../app/lib/polyhedra';
import { describeAssembly } from '../app/lib/assemblyNaming';

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

// ---- the golden zonohedra as assemblies (the File menu's golden builds) ----
for (const [k, name, each] of [[4, 'Bilinski Dodecahedron', 2], [5, 'Rhombic Icosahedron', 5], [6, 'Rhombic Triacontahedron (golden rhombohedra)', 10]] as const) {
  const build = goldenZonohedron(k);
  const nodes = build.nodes;
  check(`${k} axes: a valid build, every piece joined by a face (${nodes.length - 1} connections)`, isValidAssembly(build) && build.connections.length === nodes.length - 1);
  const counts = [P.id, O.id].map((id) => nodes.filter((n) => n.shape === id).length).join(' + ');
  check(`${k} axes: ${each} prolate + ${each} oblate`, counts === `${each} + ${each}`, counts);
  const got = describeAssembly(nodes, build.connections);
  check(`${k} axes: named "${name}"`, got.includes(name), got);
  {
    const jumbled = nodes.map((n, i) => ({ ...n, transform: { ...n.transform, position: [n.transform.position[0] + (i % 3) * 0.37, n.transform.position[1], n.transform.position[2]] as [number, number, number] } }));
    check(`${k} axes, same pieces jumbled: not named "${name}"`, !describeAssembly(jumbled, []).includes(name));
  }
}
console.log(`\n${failures} failures.`);
process.exit(failures ? 1 : 0);

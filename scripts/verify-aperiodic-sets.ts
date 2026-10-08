/**
 * Checks the Aperiodic Sets family (krp-core/src/polyhedra/aperiodic.js):
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
import { goldenZonohedron } from '../krp-core/src/assembly/goldenBuilds.js';
import { isValidAssembly } from '../krp-core/src/assembly/assembly.js';
import { POLYHEDRA, facesCongruent } from '../krp-core/src/polyhedra/index.js';
import { describeAssembly } from '../krp-core/src/assembly/assemblyNaming.js';
import { pairPartners } from '../krp-core/src/polyhedra/families.js';

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
// The Penrose rhombus prisms (2026-09-30): edge 1, one edge tall, so the
// sides are unit squares (they attach to the cube); the rhombi are the
// thick 72° and thin 36° Penrose tiles, the two pairs of partners.
for (const [id, angle] of [['PENROSE_PRISM_THICK', 72], ['PENROSE_PRISM_THIN', 36]] as const) {
  const spec = POLYHEDRA[id];
  check(`${id}: 8 corners, 12 edges, 6 faces`, spec.vertices.length === 8 && spec.edges.length === 12 && spec.faces.length === 6);
  check(`${id}: every edge 1`, spec.edges.every(([a, b]) => Math.abs(V(spec.vertices[a]).distanceTo(V(spec.vertices[b])) - 1) < 1e-9));
  const c = spec.vertices.reduce((acc, v) => acc.add(V(v)), new Vector3()).divideScalar(8);
  check(`${id}: faces flat and wound outward`, spec.faces.every((f) => {
    const q = f.map((i) => V(spec.vertices[i]));
    const n = q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[1]));
    const flat = Math.abs(n.clone().normalize().dot(q[3].clone().sub(q[0]))) < 1e-9;
    return flat && n.dot(q.reduce((acc, p) => acc.add(p), new Vector3()).divideScalar(4).sub(c)) > 0;
  }));
  const angles = spec.faces.map((f) => { const q = f.map((i) => V(spec.vertices[i])); return Math.round(q[1].clone().sub(q[0]).angleTo(q[3].clone().sub(q[0])) * 180 / Math.PI); });
  check(`${id}: two ${angle}° rhombi and four squares`, angles.filter((a) => a === angle || a === 180 - angle).length === 2 && angles.filter((a) => a === 90).length === 4, angles.join(','));
  check(`${id}: square sides congruent to the cube's face (attachable)`, spec.faces.filter((f) => facesCongruent(spec.vertices, f, POLYHEDRA.CUBE.vertices, POLYHEDRA.CUBE.faces[0])).length === 4);
}
check('the thick and thin prisms are each other\'s partners', pairPartners('PENROSE_PRISM_THICK').join() === 'PENROSE_PRISM_THIN' && pairPartners('PENROSE_PRISM_THIN').join() === 'PENROSE_PRISM_THICK');
check('the golden pair stays a pair (no prisms)', pairPartners('GOLDEN_RHOMBOHEDRON_PROLATE').join() === 'GOLDEN_RHOMBOHEDRON_OBLATE');

// The rhombic icosahedron (3D Bridges, the 5-cube's shadow): the golden
// zonohedron on five axes -- 22 corners, 40 edges, 20 golden rhombi
// congruent to the triacontahedron's, so it attaches to the golden family.
{
  const RI = POLYHEDRA.RHOMBIC_ICOSAHEDRON;
  check('rhombic icosahedron: 22 corners, 40 edges, 20 faces (Euler)', RI.vertices.length === 22 && RI.edges.length === 40 && RI.faces.length === 20);
  check('rhombic icosahedron: every edge 1/phi', RI.edges.every(([a, b]) => Math.abs(V(RI.vertices[a]).distanceTo(V(RI.vertices[b])) - 1 / PHI) < 1e-9));
  check('rhombic icosahedron: every face congruent to the triacontahedron\'s', RI.faces.every((f) => facesCongruent(RI.vertices, f, RT.vertices, RT.faces[0])));
  check('rhombic icosahedron: every face starts at an acute corner, like the golden rhombohedra', RI.faces.every((f) => {
    const q = f.map((i) => V(RI.vertices[i]));
    return Math.abs(q[1].clone().sub(q[0]).angleTo(q[3].clone().sub(q[0])) * 180 / Math.PI - 63.4349) < 1e-3;
  }));
  check('rhombic icosahedron: faces wound outward', RI.faces.every((f) => {
    const q = f.map((i) => V(RI.vertices[i]));
    return q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[1])).dot(q.reduce((acc, p) => acc.add(p), new Vector3())) > 0;
  }));
  check('rhombic icosahedron: volume = 5 prolate + 5 oblate', Math.abs(volumeOf(RI) - 5 * (volumeOf(P) + volumeOf(O))) < 1e-9, `${volumeOf(RI).toFixed(9)} vs ${(5 * (volumeOf(P) + volumeOf(O))).toFixed(9)}`);
}

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

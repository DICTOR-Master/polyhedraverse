// Face attach's placement options (app/lib/faceAttach.ts, the same function
// ShapeViewer uses), for face 0 of every congruent pair of shapes:
//
//   - every option sits flush: the incoming face's corners land exactly on
//     the target face's corners, with the incoming piece on the far side
//     (the pieces back to back);
//   - the first matching face gives exactly as many turns as the target
//     face's rotational symmetry (a regular n-gon n, a rhombus 2, a kite 1),
//     so the familiar registrations are unchanged.
//
// The old rule (line up corner 0, then step round by the symmetry) could
// never seat a rectangle, whose mirror lines pass through edge midpoints;
// the flush test finds the right turns for any face. The kite prisms'
// rectangle sides are checked directly at the end.
import * as THREE from 'three';
import { POLYHEDRA, POLYHEDRON_IDS, HEXA_ADDITION_IDS, type PolyhedronSpec } from '../krp-core/src/polyhedra/index.js';
import { buildFaceConnectors, facesCongruent, faceRotationalSymmetry } from '../krp-core/src/polyhedra/core.js';
import { isFaceEligibleForAttach } from '../krp-core/src/polyhedra/attachEligibility.js';
import { faceAttachOptions, type FaceAttachOption } from '../krp-core/src/assembly/faceAttach.js';

// DICTO's clusters aren't convex, so their centre can rightly lie on the near side of a face they
// attach by; for them the attached face must instead face back against the root's face (its own
// outward normal, Newell's over the whole polygon, opposite the root face's normal).
const CLUSTER_IDS = ['DJ_TETRAHEDRAL_CLUSTER', 'DJ_OCTAHEDRAL_CLUSTER', 'DODECA_TETRAHEDRAL_CLUSTER', 'DODECA_OCTAHEDRAL_CLUSTER', ...HEXA_ADDITION_IDS];
function facesBack(face: THREE.Vector3[], n: THREE.Vector3): boolean {
  const m = new THREE.Vector3();
  face.forEach((p, j) => { const q = face[(j + 1) % face.length]; m.x += (p.y - q.y) * (p.z + q.z); m.y += (p.z - q.z) * (p.x + q.x); m.z += (p.x - q.x) * (p.y + q.y); });
  return m.normalize().dot(n) < -0.999;
}

let checks = 0;
let failures = 0;
const fail = (msg: string) => {
  failures++;
  if (failures <= 20) console.log(msg);
};

function checkOptions(label: string, root: PolyhedronSpec, tf: number, incoming: PolyhedronSpec, options: FaceAttachOption[], firstFace: number) {
  const target = root.faces[tf].map((v) => new THREE.Vector3(...root.vertices[v]));
  const fc = buildFaceConnectors(root)[tf];
  const normal = new THREE.Vector3(...fc.normal);
  const centre = new THREE.Vector3(...fc.pos);
  checks++;
  if (options.length === 0) {
    fail(`${label}: no placement at all`);
    return;
  }
  for (const [i, o] of options.entries()) {
    checks++;
    const face = incoming.faces[o.incomingFaceIndex].map((v) => new THREE.Vector3(...incoming.vertices[v]).applyQuaternion(o.quaternion).add(o.position));
    const flush = face.every((p) => target.some((q) => p.distanceTo(q) < 1e-6));
    const beyond = CLUSTER_IDS.includes(incoming.id) ? facesBack(face, normal) : o.position.clone().sub(centre).dot(normal) > 0;
    if (!flush || !beyond) fail(`${label} option ${i + 1}: ${!flush ? 'not flush' : 'on the wrong side'}`);
  }
  checks++;
  const firstCount = options.filter((o) => o.incomingFaceIndex === firstFace).length;
  const symmetry = faceRotationalSymmetry(root.vertices, root.faces[tf]);
  if (firstCount !== symmetry) fail(`${label}: first face gives ${firstCount} turns, the face's symmetry is ${symmetry}`);
}

const identity = new THREE.Matrix4();
for (const rootId of POLYHEDRON_IDS) {
  const root = POLYHEDRA[rootId];
  for (const incomingId of POLYHEDRON_IDS) {
    const incoming = POLYHEDRA[incomingId];
    const incomingFaces = incoming.faces
      .map((_, fi) => fi)
      .filter((fi) => isFaceEligibleForAttach(incoming, fi) && facesCongruent(root.vertices, root.faces[0], incoming.vertices, incoming.faces[fi]));
    if (incomingFaces.length === 0) continue;
    checkOptions(`${rootId}[f0] + ${incomingId}`, root, 0, incoming, faceAttachOptions(root, 0, identity, incoming, incomingFaces), incomingFaces[0]);
  }
}

// The rectangle case the old rule couldn't seat: each kite prism's
// rectangle sides onto a copy of themselves.
let rectangles = 0;
for (const id of ['QUAD_PRISM_DI_KITE', 'QUAD_PRISM_DH_KITE']) {
  const spec = POLYHEDRA[id];
  spec.faces.forEach((f, tf) => {
    if (f.length !== 4) return;
    const p = f.map((v) => new THREE.Vector3(...spec.vertices[v]));
    const lens = p.map((a, i) => a.distanceTo(p[(i + 1) % 4]));
    const rightAngled = p.every((a, i) => Math.abs(p[(i + 1) % 4].clone().sub(a).dot(p[(i + 3) % 4].clone().sub(a))) < 1e-9);
    if (!rightAngled || Math.abs(lens[0] - lens[1]) < 1e-6) return; // squares, and the kite caps
    rectangles++;
    const same = spec.faces.map((_, fi) => fi).filter((fi) => facesCongruent(spec.vertices, f, spec.vertices, spec.faces[fi]));
    checkOptions(`${id} rectangle f${tf} + itself`, spec, tf, spec, faceAttachOptions(spec, tf, identity, spec, same), same[0]);
  });
}
checks++;
if (rectangles !== 4) fail(`expected 4 kite-prism rectangle sides, found ${rectangles}`);

console.log(`${checks} face placements checked (${rectangles} rectangle sides), ${failures} failed.`);
if (failures > 0) process.exit(1);

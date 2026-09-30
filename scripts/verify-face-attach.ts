import * as THREE from 'three';
import { POLYHEDRA, POLYHEDRON_IDS, isFaceEligibleForAttach } from '../app/lib/polyhedra';
import { buildFaceConnectors, facesCongruent } from '../app/lib/polyhedra/core';
import { faceAttachOptions } from '../app/lib/faceAttach';

// Every face pair the app can offer, placed by the app's own face-attach
// code (app/lib/faceAttach.ts, shared with ShapeViewer), root parent at the
// identity: each pair must have at least one placement, and every
// placement must sit flush (the incoming face's corners exactly on the
// target face's) with the incoming piece beyond the shared face.
//
// History worth keeping: a first attempt assumed the right twist was among
// n multiples of 360/n from "no extra twist" (for many pairs none matched),
// so the twist became analytic, lining up corner 0 with corner 0 and then
// stepping by the face's symmetry. That could never seat a rectangle,
// whose mirror lines pass through edge midpoints, so kite-prism rectangles
// were kept unattachable. Now each corner is tried against corner 0 and
// only flush placements kept (2026-09-30), which seats any congruent face.

const identity = new THREE.Matrix4();
let checks = 0;
let failures = 0;

for (const rootId of POLYHEDRON_IDS) {
  const rootSpec = POLYHEDRA[rootId];
  const rootConnectors = buildFaceConnectors(rootSpec);
  for (const incomingId of POLYHEDRON_IDS) {
    const incomingSpec = POLYHEDRA[incomingId];
    for (let tf = 0; tf < rootSpec.faces.length; tf++) {
      if (!isFaceEligibleForAttach(rootSpec, tf)) continue;
      const targetVerts = rootSpec.faces[tf].map((i) => new THREE.Vector3(...rootSpec.vertices[i]));
      const Cf = new THREE.Vector3(...rootConnectors[tf].pos);
      const Nf = new THREE.Vector3(...rootConnectors[tf].normal);
      for (let gf = 0; gf < incomingSpec.faces.length; gf++) {
        // Only pairs the app can offer: eligible faces (RVCMG wall
        // triangles aren't), really congruent (not just the same corner
        // count: two different rhombi aren't the same shape).
        if (!isFaceEligibleForAttach(incomingSpec, gf)) continue;
        if (!facesCongruent(rootSpec.vertices, rootSpec.faces[tf], incomingSpec.vertices, incomingSpec.faces[gf])) continue;
        checks++;
        const options = faceAttachOptions(rootSpec, tf, identity, incomingSpec, [gf]);
        if (options.length === 0) {
          failures++;
          console.log(`${rootId}[f${tf}] + ${incomingId}[f${gf}]: no flush placement`);
          continue;
        }
        for (const o of options) {
          const face = incomingSpec.faces[gf].map((i) => new THREE.Vector3(...incomingSpec.vertices[i]).applyQuaternion(o.quaternion).add(o.position));
          if (!face.every((p) => targetVerts.some((q) => p.distanceTo(q) < 1e-6))) {
            failures++;
            console.log(`${rootId}[f${tf}] + ${incomingId}[f${gf}]: a placement isn't flush`);
          }
          if (o.position.dot(Nf) <= Cf.dot(Nf) - 1e-9) {
            failures++;
            console.log(`${rootId}[f${tf}] + ${incomingId}[f${gf}]: incoming piece not beyond the shared face`);
          }
        }
      }
    }
  }
}

console.log(`${checks} face-attach placements checked, ${failures} failed.`);
if (failures > 0) process.exit(1);

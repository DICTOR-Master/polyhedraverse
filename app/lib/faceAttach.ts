/**
 * Every distinct way a piece can sit on a target face (face attach), each
 * a full placement: orientation AND position. Shared by ShapeViewer and
 * the checks, so the checks test exactly what the app does.
 *
 * First come the flush turns of the piece's first matching face (a
 * regular n-gon has n, a rhombus 2, a Catalan kite 1), as before; then any
 * placement another matching face gives that isn't already there. Those extra ones matter
 * when a piece's matching faces aren't all alike (direct report
 * 2026-09-30: DICTO's blocks couldn't be turned to build their prism,
 * which needs a particular one of the all-rhombus block's four 72 degree
 * rhombi). The position is worked out for each: turning about the face
 * normal moves a piece whose face centre is off its own centre line, such
 * as a sheared block.
 */
import * as THREE from 'three';
import { type PolyhedronSpec, buildFaceConnectors } from '../../krp-core/src/polyhedra/core.js';

export interface FaceAttachOption {
  incomingFaceIndex: number;
  quaternion: THREE.Quaternion;
  position: THREE.Vector3;
}

export function faceAttachOptions(
  targetSpec: PolyhedronSpec,
  targetFaceIndex: number,
  targetWorldMatrix: THREE.Matrix4,
  spec: PolyhedronSpec,
  incomingFaces: number[],
): FaceAttachOption[] {
  const targetFaceConnector = buildFaceConnectors(targetSpec)[targetFaceIndex];
  const incomingConnectors = buildFaceConnectors(spec);
  const targetWorldPos = new THREE.Vector3(...targetFaceConnector.pos).applyMatrix4(targetWorldMatrix);
  const targetWorldQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(targetWorldMatrix));
  const targetWorldNormal = new THREE.Vector3(...targetFaceConnector.normal).applyQuaternion(targetWorldQuat).normalize();
  const targetFace = targetSpec.faces[targetFaceIndex];
  const targetV0World = new THREE.Vector3(...targetSpec.vertices[targetFace[0]]).applyMatrix4(targetWorldMatrix);

  const targetCorners = targetFace.map((v) => new THREE.Vector3(...targetSpec.vertices[v]).applyMatrix4(targetWorldMatrix));
  const edge = targetCorners[0].distanceTo(targetCorners[1]);

  // One incoming face: point its outward normal opposite the target's (the
  // pieces meet back to back), then line each of its corners up with the
  // target's corner 0 in turn, keeping the ones where every corner lands
  // on a target corner (the faces sit flush). No symmetry is assumed: this
  // finds the right turns for any face, including a rectangle, whose
  // mirror lines pass through edge midpoints rather than corners (the old
  // corner-0-then-turn rule could never seat one; see the quad-prisms
  // note), and a scalene triangle. A regular n-gon still gets exactly its
  // n turns, a rhombus 2, a kite 1.
  const placementsFor = (fi: number): FaceAttachOption[] => {
    const Cg = new THREE.Vector3(...incomingConnectors[fi].pos);
    const Ng = new THREE.Vector3(...incomingConnectors[fi].normal);
    const baseQuat = new THREE.Quaternion().setFromUnitVectors(Ng, targetWorldNormal.clone().negate());
    const dTargetLocal = targetV0World.clone().sub(targetWorldPos).normalize().applyQuaternion(baseQuat.clone().invert());
    const face = spec.faces[fi];
    const out: FaceAttachOption[] = [];
    for (const corner of face) {
      const u = new THREE.Vector3(...spec.vertices[corner]).sub(Cg).normalize();
      const w = new THREE.Vector3().crossVectors(Ng, u).normalize();
      const theta = Math.atan2(dTargetLocal.dot(w), dTargetLocal.dot(u));
      const quaternion = baseQuat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Ng, theta));
      const position = targetWorldPos.clone().sub(Cg.clone().applyQuaternion(quaternion));
      const flush = face.every((v) => {
        const p = new THREE.Vector3(...spec.vertices[v]).applyQuaternion(quaternion).add(position);
        return targetCorners.some((q) => p.distanceTo(q) < 1e-6 * Math.max(1, edge));
      });
      if (flush) out.push({ incomingFaceIndex: fi, quaternion, position });
    }
    return out;
  };
  const corners = (o: FaceAttachOption) => spec.vertices.map((v) => new THREE.Vector3(...v).applyQuaternion(o.quaternion).add(o.position));

  const options = placementsFor(incomingFaces[0]);
  const seen = options.map(corners);
  for (const fi of incomingFaces.slice(1)) {
    for (const o of placementsFor(fi)) {
      const c = corners(o);
      if (seen.some((s) => c.every((p) => s.some((q) => p.distanceToSquared(q) < 1e-10)))) continue;
      options.push(o);
      seen.push(c);
    }
  }
  return options;
}

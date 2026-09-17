/**
 * Independently re-derives `REGULAR_HEX_WALL_HEIGHT`
 * (app/lib/polyhedra/miscellaneous/rvcmg-connectors-v2/index.ts) from
 * scratch, via the SAME real placement math the app itself uses
 * (`computeFaceAttach`, mirrored from scripts/verify-face-attach.ts),
 * rather than trusting the hardcoded literal there. If this ever drifts
 * (someone changes the icosahedron, PRISM_3, Triangle-to-U-Hex, or the
 * universal hex itself), this script will catch it rather than leaving
 * a stale, silently-wrong constant in the registry.
 *
 * The scenario (direct user play-testing discovery, 2026-09-17):
 * icosahedron -> PRISM_3 (unit-edge triangular prism) on each face ->
 * Triangle-to-U-Hex -> Regular-Hex-to-U-Hex. The 5 resulting unit-edge
 * regular hexagons meeting around one icosahedron vertex have a tiny
 * overlap at the shared v2 wall height (0.25) -- this script finds the
 * exact height that makes two edge-adjacent chains' hexagons touch
 * exactly instead, by bisecting on the signed distance of the nearest
 * hexagon vertex to the real mirror-symmetry plane shared by the two
 * source icosahedron faces (the plane through their shared edge and the
 * icosahedron's own center -- a real symmetry of the icosahedral group,
 * not an approximation).
 */
import * as THREE from 'three';
import { POLYHEDRA } from '../app/lib/polyhedra';
import { buildFaceConnectors, type Vec3, type PolyhedronSpec } from '../app/lib/polyhedra/core';
import { deriveTriangleToUHex } from '../app/lib/rvcmg/adapters/triangleToUHex';
import { deriveRegularHexToUHex } from '../app/lib/rvcmg/adapters/regularHexToUHex';
import { buildAdapterSolid } from '../app/lib/rvcmg/solid';
import { universalHexInterfaceFrame, HEX_CIRCUMRADIUS } from '../app/lib/rvcmg/universalHexInterface';
import { RVCMG_V2_CONNECTOR_ADDITIONS } from '../app/lib/polyhedra/miscellaneous/rvcmg-connectors-v2';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const NORMAL = universalHexInterfaceFrame().normal;
const WALL_HEIGHT_V2 = HEX_CIRCUMRADIUS * (Math.SQRT2 / 4);
check('re-derived WALL_HEIGHT_V2 matches the known closed form 1/4', Math.abs(WALL_HEIGHT_V2 - 0.25) < 1e-9);

const triPiece = deriveTriangleToUHex();
const triSolid = buildAdapterSolid(triPiece.states[0], triPiece.states[triPiece.states.length - 1], { id: 'T', name: 'T', normal: NORMAL, wallHeight: WALL_HEIGHT_V2 }).spec;
const hexPiece = deriveRegularHexToUHex();

function hexSolidWithHeight(h: number): PolyhedronSpec {
  return buildAdapterSolid(hexPiece.states[0], hexPiece.states[hexPiece.states.length - 1], { id: 'H', name: 'H', normal: NORMAL, wallHeight: h }).spec;
}

// Mirrors scripts/verify-face-attach.ts's own computeFaceAttach exactly.
function computeFaceAttach(rootSpec: PolyhedronSpec, targetFaceIdx: number, incomingSpec: PolyhedronSpec, incomingFaceIdx: number) {
  const targetFace = buildFaceConnectors(rootSpec)[targetFaceIdx];
  const incomingFace = buildFaceConnectors(incomingSpec)[incomingFaceIdx];
  const Cf = new THREE.Vector3(...targetFace.pos);
  const Nf = new THREE.Vector3(...targetFace.normal);
  const Cg = new THREE.Vector3(...incomingFace.pos);
  const Ng = new THREE.Vector3(...incomingFace.normal);
  const desiredWorldDir = Nf.clone().negate();
  const baseQuat = new THREE.Quaternion().setFromUnitVectors(Ng, desiredWorldDir);
  const targetFaceIndices = rootSpec.faces[targetFaceIdx];
  const incomingFaceIndices = incomingSpec.faces[incomingFaceIdx];
  const targetV0 = new THREE.Vector3(...rootSpec.vertices[targetFaceIndices[0]]);
  const dTargetWorld = targetV0.clone().sub(Cf).normalize();
  const dTargetLocal = dTargetWorld.clone().applyQuaternion(baseQuat.clone().invert());
  const incomingV0 = new THREE.Vector3(...incomingSpec.vertices[incomingFaceIndices[0]]);
  const dIncomingLocal = incomingV0.clone().sub(Cg).normalize();
  const u = dIncomingLocal.clone();
  const w = new THREE.Vector3().crossVectors(Ng, u).normalize();
  const theta = Math.atan2(dTargetLocal.dot(w), dTargetLocal.dot(u));
  const twistQuat = new THREE.Quaternion().setFromAxisAngle(Ng, theta);
  const finalQuat = baseQuat.clone().multiply(twistQuat);
  const rotatedCg = Cg.clone().applyQuaternion(finalQuat);
  const position = Cf.clone().sub(rotatedCg);
  return { finalQuat, position };
}

function placeIncoming(incomingSpec: PolyhedronSpec, quat: THREE.Quaternion, pos: THREE.Vector3): Vec3[] {
  return incomingSpec.vertices.map((v) => {
    const p = new THREE.Vector3(...v).applyQuaternion(quat).add(pos);
    return [p.x, p.y, p.z] as Vec3;
  });
}

/** Builds one full chain (icosahedron face -> PRISM_3 -> Triangle-to-U-Hex -> Regular-Hex-to-U-Hex at the given height) and returns the final hexagon's real world-space vertices. */
function buildChain(icoSpec: PolyhedronSpec, faceIdx: number, prismSpec: PolyhedronSpec, hexHeight: number): Vec3[] {
  const a1 = computeFaceAttach(icoSpec, faceIdx, prismSpec, 0);
  let curVerts = placeIncoming(prismSpec, a1.finalQuat, a1.position);
  let curSpec: PolyhedronSpec = { ...prismSpec, vertices: curVerts };

  const a2 = computeFaceAttach(curSpec, 1, triSolid, 1);
  curVerts = placeIncoming(triSolid, a2.finalQuat, a2.position);
  curSpec = { ...triSolid, vertices: curVerts };

  const hexSpecLocal = hexSolidWithHeight(hexHeight);
  const a3 = computeFaceAttach(curSpec, 0, hexSpecLocal, 0);
  curVerts = placeIncoming(hexSpecLocal, a3.finalQuat, a3.position);
  curSpec = { ...hexSpecLocal, vertices: curVerts };

  return curSpec.faces[1].map((i) => curSpec.vertices[i]);
}

const cross = (u: Vec3, v: Vec3): Vec3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dot = (u: Vec3, v: Vec3): number => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

const icoSpec = POLYHEDRA.D20;
check('D20 (icosahedron) is registered', !!icoSpec);
const prismSpec = POLYHEDRA.PRISM_3;
check('PRISM_3 is registered', !!prismSpec);

// One vertex's 5 adjacent faces, and one edge-adjacent pair among them.
const vertexIdx = 0;
const adjFaces = icoSpec.faces.map((f, fi) => (f.includes(vertexIdx) ? fi : -1)).filter((fi) => fi >= 0);
check('icosahedron vertex 0 has exactly 5 adjacent faces', adjFaces.length === 5);

function sharedEdge(faceA: number[], faceB: number[]): [number, number] | null {
  const shared = faceA.filter((v) => faceB.includes(v));
  return shared.length === 2 ? [shared[0], shared[1]] : null;
}
let pair: { a: number; b: number; edge: [number, number] } | null = null;
outer: for (let i = 0; i < adjFaces.length; i++) {
  for (let j = i + 1; j < adjFaces.length; j++) {
    const e = sharedEdge(icoSpec.faces[adjFaces[i]], icoSpec.faces[adjFaces[j]]);
    if (e) {
      pair = { a: adjFaces[i], b: adjFaces[j], edge: e };
      break outer;
    }
  }
}
check('found a real edge-adjacent pair among the 5 faces', !!pair);
if (!pair) {
  console.log(`\n${failures} failures.`);
  process.exit(1);
}

const P1 = icoSpec.vertices[pair.edge[0]];
const P2 = icoSpec.vertices[pair.edge[1]];
const planeNormal = cross(P1, P2);
const planeLen = Math.hypot(...planeNormal);

/** Signed distance of the CLOSEST-to-crossing vertex of face `pair.a`'s hexagon to the real mirror plane shared with face `pair.b` (0 = exact touch; negative = gap; positive = overlap). */
function minSignedDistance(hexHeight: number): number {
  const hexA = buildChain(icoSpec, pair!.a, prismSpec, hexHeight);
  return Math.min(...hexA.map((p) => dot(p, planeNormal) / planeLen));
}

check('at the shared v2 wall height (0.25), the hexagons genuinely overlap (a real, non-zero effect, not noise)', minSignedDistance(0.25) < -1e-4);

// Bisection re-derivation of the exact crossover height.
let lo = 0.2;
let hi = 0.4;
let fLo = minSignedDistance(lo);
let fHi = minSignedDistance(hi);
check('bisection bracket [0.2, 0.4] straddles the crossover (opposite signs)', fLo * fHi < 0);
for (let i = 0; i < 80; i++) {
  const mid = (lo + hi) / 2;
  const fMid = minSignedDistance(mid);
  if (fLo * fMid <= 0) {
    hi = mid;
    fHi = fMid;
  } else {
    lo = mid;
    fLo = fMid;
  }
}
const derivedHeight = (lo + hi) / 2;
console.log(`re-derived crossover height: ${derivedHeight.toFixed(9)}`);

const registeredSpec = RVCMG_V2_CONNECTOR_ADDITIONS.RVCMG_V2_REGULAR_HEX_TO_UHEX;
check('RVCMG_V2_REGULAR_HEX_TO_UHEX is registered', !!registeredSpec);

// Measure the REGISTERED piece's own actual neck height directly from its
// built geometry (hex face centroid to target face centroid), rather than
// importing the private constant -- this checks the CLAIM, not just that
// two files agree with each other.
if (registeredSpec) {
  const [hexFaceIndex, targetFaceIndex] = registeredSpec.attachableFaceIndices ?? [-1, -1];
  const centroidOf = (pts: Vec3[]): Vec3 => {
    const c: Vec3 = [0, 0, 0];
    for (const p of pts) {
      c[0] += p[0] / pts.length;
      c[1] += p[1] / pts.length;
      c[2] += p[2] / pts.length;
    }
    return c;
  };
  const hexPts = registeredSpec.faces[hexFaceIndex].map((i) => registeredSpec.vertices[i]);
  const targetPts = registeredSpec.faces[targetFaceIndex].map((i) => registeredSpec.vertices[i]);
  const registeredHeight = Math.hypot(...(centroidOf(targetPts).map((v, i) => v - centroidOf(hexPts)[i]) as Vec3));
  console.log(`registered RVCMG_V2_REGULAR_HEX_TO_UHEX's own measured neck height: ${registeredHeight.toFixed(9)}`);
  check(
    `registered piece's own height matches the independently re-derived crossover (diff=${Math.abs(registeredHeight - derivedHeight).toExponential(3)})`,
    Math.abs(registeredHeight - derivedHeight) < 1e-6,
  );
}

check('at the re-derived height, the two hexagons touch essentially exactly (within 1e-9)', Math.abs(minSignedDistance(derivedHeight)) < 1e-9);

// Confirm the "doesn't matter which adapter you raise" claim: raising
// Triangle-to-U-Hex's own height instead (hex fixed at 0.25) crosses at
// the SAME height.
function buildChainTriHeight(icoSpec: PolyhedronSpec, faceIdx: number, prismSpec: PolyhedronSpec, triHeight: number): Vec3[] {
  const triSpecLocal = buildAdapterSolid(triPiece.states[0], triPiece.states[triPiece.states.length - 1], { id: 'T2', name: 'T2', normal: NORMAL, wallHeight: triHeight }).spec;
  const a1 = computeFaceAttach(icoSpec, faceIdx, prismSpec, 0);
  let curVerts = placeIncoming(prismSpec, a1.finalQuat, a1.position);
  let curSpec: PolyhedronSpec = { ...prismSpec, vertices: curVerts };
  const a2 = computeFaceAttach(curSpec, 1, triSpecLocal, 1);
  curVerts = placeIncoming(triSpecLocal, a2.finalQuat, a2.position);
  curSpec = { ...triSpecLocal, vertices: curVerts };
  const hexFixed = hexSolidWithHeight(0.25);
  const a3 = computeFaceAttach(curSpec, 0, hexFixed, 0);
  curVerts = placeIncoming(hexFixed, a3.finalQuat, a3.position);
  curSpec = { ...hexFixed, vertices: curVerts };
  return curSpec.faces[1].map((i) => curSpec.vertices[i]);
}
function minSignedDistanceTriHeight(triHeight: number): number {
  const hexA = buildChainTriHeight(icoSpec, pair!.a, prismSpec, triHeight);
  return Math.min(...hexA.map((p) => dot(p, planeNormal) / planeLen));
}
const delta = derivedHeight - 0.25;
const triAtSameDelta = minSignedDistanceTriHeight(0.25 + delta);
check(
  `raising Triangle-to-U-Hex's own height by the same delta (${delta.toFixed(9)}) also reaches essentially-exact touching (residual=${triAtSameDelta.toExponential(3)})`,
  Math.abs(triAtSameDelta) < 1e-6,
);

console.log(`\n${failures} failures.`);
process.exit(failures === 0 ? 0 : 1);

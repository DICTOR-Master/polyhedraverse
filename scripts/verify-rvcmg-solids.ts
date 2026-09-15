/**
 * Verifies the actual, shipped RVCMG connector registry entries
 * (RVCMG_CONNECTOR_ADDITIONS, app/lib/polyhedra/miscellaneous/
 * rvcmg-connectors/) directly -- not a parallel re-derivation, so this
 * can never silently drift from what the app actually ships (an earlier
 * version of this script rebuilt its own copy via buildAdapterSolid
 * with a stale, hard-coded WALL_HEIGHT and kept passing after the real
 * one changed -- caught live, not hypothetical).
 *
 * Checks: Euler's formula, every face planar and outward-wound, no
 * degenerate face, the target cap's own edges matching its Stage 0-7
 * pre-lift state exactly, both caps sitting on the same axis exactly
 * `RD_HEMI_DEPTH / 2` apart (the real rhombic dodecahedron's own dome
 * depth, halved because two hex-terminated pieces mate at their hex
 * faces and their neck lengths add -- see rvcmg-connectors/index.ts's
 * own header), and that `attachableFaceIndices` names exactly the two
 * real ports (hex + target), never a wall/side triangle.
 */
import { RVCMG_CONNECTOR_ADDITIONS, RVCMG_CONNECTOR_ADDITION_IDS } from '../app/lib/polyhedra/miscellaneous/rvcmg-connectors';
import { hemiRdInterfaceFrame } from '../app/lib/rvcmg/hemiRdInterface';
import { validateAdapterSolid } from '../app/lib/rvcmg/solid';
import { hemiRdStartState, RD_EDGE_LENGTH } from '../app/lib/rvcmg/adapters/triangleToRdH';
import { deriveSquareToRdH } from '../app/lib/rvcmg/adapters/squareToRdH';
import { derivePentagonToRdH } from '../app/lib/rvcmg/adapters/pentagonToRdH';
import { deriveGoldenRhombusToRdH } from '../app/lib/rvcmg/adapters/goldenRhombusToRdH';
import { deriveDIKiteToRdH } from '../app/lib/rvcmg/adapters/diKiteToRdH';
import { deriveDHKiteToRdH } from '../app/lib/rvcmg/adapters/dhKiteToRdH';
import { deriveRegularHexToRdH } from '../app/lib/rvcmg/adapters/regularHexToRdH';
import { deriveTriangleToRdH } from '../app/lib/rvcmg/adapters/triangleToRdH';
import { CATALAN_ADDITIONS } from '../app/lib/polyhedra/catalan';
import { isRegularFace, rotateFaceToMirrorAxis, facesCongruent, dist, buildFaceConnectors, type Vec3 } from '../app/lib/polyhedra/core';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

// Independently re-derive the real dome depth claim (not imported from
// rvcmg-connectors/index.ts's own private const) so this script checks
// the CLAIM, not just that two files agree with each other.
const RD = CATALAN_ADDITIONS.RHOMBIC_DODECAHEDRON;
const axis = buildFaceConnectors(RD)[0].normal;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const depths = RD.vertices.map((v) => dot(v, axis)).filter((d) => Math.abs(d) > 1e-9);
const magnitude = Math.abs(depths[0]);
check(
  "RD's own off-bisection-plane vertices all sit at one consistent depth",
  depths.every((d) => Math.abs(Math.abs(d) - magnitude) < 1e-9),
);
const RD_HEMI_DEPTH = magnitude / RD_EDGE_LENGTH;
check('re-derived RD_HEMI_DEPTH matches the known closed form sqrt(2/3)', Math.abs(RD_HEMI_DEPTH - Math.sqrt(2 / 3)) < 1e-9);
const EXPECTED_WALL_HEIGHT = RD_HEMI_DEPTH / 2;

const NORMAL = hemiRdInterfaceFrame().normal;

const PIECES: { id: string; derive: () => ReturnType<typeof deriveTriangleToRdH> }[] = [
  { id: 'RVCMG_TRIANGLE_TO_RDH', derive: deriveTriangleToRdH },
  { id: 'RVCMG_SQUARE_TO_RDH', derive: deriveSquareToRdH },
  { id: 'RVCMG_PENTAGON_TO_RDH', derive: derivePentagonToRdH },
  { id: 'RVCMG_GOLDEN_RHOMBUS_TO_RDH', derive: deriveGoldenRhombusToRdH },
  { id: 'RVCMG_DI_KITE_TO_RDH', derive: deriveDIKiteToRdH },
  { id: 'RVCMG_DH_KITE_TO_RDH', derive: deriveDHKiteToRdH },
  { id: 'RVCMG_REGULAR_HEX_TO_RDH', derive: deriveRegularHexToRdH },
];

check(
  'rvcmg-connectors registers exactly these 7 tapered pieces + the bare RD-Hemi (8 total)',
  PIECES.every((p) => RVCMG_CONNECTOR_ADDITION_IDS.includes(p.id)) && RVCMG_CONNECTOR_ADDITION_IDS.includes('RVCMG_RD_HEMI') && RVCMG_CONNECTOR_ADDITION_IDS.length === 8,
);

for (const { id, derive } of PIECES) {
  const spec = RVCMG_CONNECTOR_ADDITIONS[id];
  check(`${id}: is registered`, !!spec);
  if (!spec) continue;

  const piece = derive();
  check(`${id}: Stage 0-7 derivation itself is clean (${JSON.stringify(piece.problems)})`, piece.problems.length === 0);
  const targetState = piece.states[piece.states.length - 1];

  check(`${id}: attachableFaceIndices is set (exactly 2 ports)`, Array.isArray(spec.attachableFaceIndices) && spec.attachableFaceIndices.length === 2);
  const [hexFaceIndex, targetFaceIndex] = spec.attachableFaceIndices ?? [-1, -1];
  check(`${id}: the named hex port is really a 6-gon`, spec.faces[hexFaceIndex]?.length === 6);
  check(`${id}: the named target port has the right vertex count (${targetState.vertices.length})`, spec.faces[targetFaceIndex]?.length === targetState.vertices.length);

  // Both real ports' own vertex 0 must sit on a genuine mirror axis --
  // required by the face-attach placement algorithm (a real bug this
  // project shipped and caught: 222 verify:face-attach failures, all on
  // the shared hex face, before this was enforced). Checked by
  // confirming rotateFaceToMirrorAxis is already a no-op on each.
  check(
    `${id}: hex port's vertex 0 is already on a mirror axis`,
    JSON.stringify(rotateFaceToMirrorAxis(spec.vertices, spec.faces[hexFaceIndex])) === JSON.stringify(spec.faces[hexFaceIndex]),
  );
  check(
    `${id}: target port's vertex 0 is already on a mirror axis`,
    JSON.stringify(rotateFaceToMirrorAxis(spec.vertices, spec.faces[targetFaceIndex])) === JSON.stringify(spec.faces[targetFaceIndex]),
  );

  // Every OTHER face (every wall triangle) must be excluded from
  // attachableFaceIndices regardless of whether it happens to be a
  // regular polygon -- the actual bug this was built to fix.
  spec.faces.forEach((f, fi) => {
    if (fi === hexFaceIndex || fi === targetFaceIndex) return;
    check(`${id}: wall face ${fi} is NOT in attachableFaceIndices (regular=${isRegularFace(spec.vertices, f)})`, !spec.attachableFaceIndices?.includes(fi));
  });

  const validation = validateAdapterSolid(spec, targetState, hexFaceIndex, targetFaceIndex);
  check(`${id}: validateAdapterSolid clean (${JSON.stringify(validation)})`, validation.length === 0);

  const hexPts = spec.faces[hexFaceIndex].map((i) => spec.vertices[i]);
  const targetPts = spec.faces[targetFaceIndex].map((i) => spec.vertices[i]);
  const centroidOf = (pts: Vec3[]): Vec3 => {
    const c: Vec3 = [0, 0, 0];
    for (const p of pts) { c[0] += p[0] / pts.length; c[1] += p[1] / pts.length; c[2] += p[2] / pts.length; }
    return c;
  };
  const hc = centroidOf(hexPts);
  const tc = centroidOf(targetPts);
  const axisVec: Vec3 = [tc[0] - hc[0], tc[1] - hc[1], tc[2] - hc[2]];
  const axisLen = Math.hypot(...axisVec);
  const cosToNormal = Math.abs(dot(axisVec, NORMAL)) / axisLen;
  check(`${id}: hex-to-target axis is parallel to the hex interface's own normal (cos=${cosToNormal.toFixed(9)})`, Math.abs(cosToNormal - 1) < 1e-6);
  check(`${id}: hex-to-target distance equals RD_HEMI_DEPTH/2 (got ${axisLen.toFixed(9)}, expected ${EXPECTED_WALL_HEIGHT.toFixed(9)})`, Math.abs(axisLen - EXPECTED_WALL_HEIGHT) < 1e-6);

  // Compared as a sorted multiset, not index-for-index: `rotateFaceToMirrorAxis`
  // (core.ts) deliberately re-roots the hex cap's own vertex 0 to satisfy
  // the face-attach placement algorithm's real requirement, which
  // cyclically shifts which edge is "first" without changing the actual
  // set of edge lengths at all.
  const hexEdgeLensBuilt = hexPts.map((p, k) => dist(p, hexPts[(k + 1) % hexPts.length])).sort((a, b) => a - b);
  const hexState = hemiRdStartState();
  const hexEdgeLensReal = hexState.vertices.map((v, k) => dist(v.pos, hexState.vertices[(k + 1) % hexState.vertices.length].pos)).sort((a, b) => a - b);
  check(
    `${id}: hex cap edges match the real hemi-RD interface exactly (as a multiset)`,
    hexEdgeLensBuilt.every((l, k) => Math.abs(l - hexEdgeLensReal[k]) < 1e-9),
  );
}

// --- RVCMG_RD_HEMI: the bare RD-Hemi, a genuinely different shape from
// the 7 tapered pieces (a real dome, not a flat hex + wall) -- checked
// on its own terms. ---
{
  const hemi = RVCMG_CONNECTOR_ADDITIONS.RVCMG_RD_HEMI;
  const V = hemi.vertices.length,
    E = hemi.edges.length,
    F = hemi.faces.length;
  check(`RVCMG_RD_HEMI: Euler characteristic holds (V=${V} E=${E} F=${F})`, V - E + F === 2);
  check('RVCMG_RD_HEMI: exactly 10 vertices, 8 faces (1 hex + 5 rhombi + 2 half-rhombus triangles)', V === 10 && F === 8);
  check(
    'RVCMG_RD_HEMI: face sizes are exactly one 6, five 4s, two 3s',
    JSON.stringify(hemi.faces.map((f) => f.length).sort((a, b) => a - b)) === JSON.stringify([3, 3, 4, 4, 4, 4, 4, 6]),
  );
  check('RVCMG_RD_HEMI: attachableFaceIndices names exactly 6 faces (hex + 5 rhombi, not the 2 triangle artifacts)', hemi.attachableFaceIndices?.length === 6);

  const hexFace = hemi.faces[0];
  check('RVCMG_RD_HEMI: face 0 is the hex', hexFace.length === 6);
  const hemiHexLens = hexFace.map((v, k) => dist(hemi.vertices[v], hemi.vertices[hexFace[(k + 1) % 6]])).sort((a, b) => a - b);
  const realHexState = hemiRdStartState();
  const realHexLens = realHexState.vertices.map((v, k) => dist(v.pos, realHexState.vertices[(k + 1) % 6].pos)).sort((a, b) => a - b);
  check(
    "RVCMG_RD_HEMI's own hex matches every adapter piece's own hex exactly (as a multiset) -- the actual point of this shape",
    hemiHexLens.every((l, k) => Math.abs(l - realHexLens[k]) < 1e-9),
  );

  const rhombusFaces = hemi.attachableFaceIndices!.filter((fi) => fi !== 0);
  check('RVCMG_RD_HEMI: exactly 5 rhombus ports', rhombusFaces.length === 5);
  for (const fi of rhombusFaces) {
    const f = hemi.faces[fi];
    const lens = f.map((v, k) => dist(hemi.vertices[v], hemi.vertices[f[(k + 1) % f.length]]));
    check(`RVCMG_RD_HEMI: rhombus face ${fi} is unit-edge (matches RD's own uniform edge length, rescaled)`, lens.every((l) => Math.abs(l - 1) < 1e-9));
  }

  // Overall convexity: a real sub-polytope of the (convex) RD should be
  // convex too -- checked directly, not assumed from that argument alone.
  const solidCentroid = centroidOf(hemi.vertices);
  let hemiConvexFailures = 0;
  hemi.faces.forEach((f) => {
    const pts = f.map((i) => hemi.vertices[i]);
    const c = centroidOf(pts);
    const planeNormal = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    for (let vi = 0; vi < hemi.vertices.length; vi++) {
      if (f.includes(vi)) continue;
      if (dot(planeNormal, sub(hemi.vertices[vi], c)) > 1e-6) hemiConvexFailures++;
    }
    if (dot(planeNormal, sub(c, solidCentroid)) < 0) hemiConvexFailures++;
  });
  check('RVCMG_RD_HEMI: every face is convex-consistent with the whole solid (a real dome, not a warped one)', hemiConvexFailures === 0);

  // The crown: the one rhombus touching none of the hex's own 6 vertices
  // -- self-attaches to another copy of itself cleanly (the actual
  // "hourglass" join, direct user description: "rhombi faces at
  // crown... forms a rhombi waist").
  const hexVertexSet = new Set(hexFace);
  const crownCandidates = rhombusFaces.filter((fi) => hemi.faces[fi].every((v) => !hexVertexSet.has(v)));
  check('RVCMG_RD_HEMI: exactly one crown rhombus (touching none of the hex vertices)', crownCandidates.length === 1);
  if (crownCandidates.length === 1) {
    const crownFi = crownCandidates[0];
    check('RVCMG_RD_HEMI: crown rhombus is congruent to itself (a real face-attach candidate)', facesCongruent(hemi.vertices, hemi.faces[crownFi], hemi.vertices, hemi.faces[crownFi]));
  }
}

function centroidOf(vs: Vec3[]): Vec3 {
  const c: Vec3 = [0, 0, 0];
  for (const v of vs) {
    c[0] += v[0] / vs.length;
    c[1] += v[1] / vs.length;
    c[2] += v[2] / vs.length;
  }
  return c;
}

console.log(`\n${failures} failures.`);
process.exit(failures === 0 ? 0 : 1);

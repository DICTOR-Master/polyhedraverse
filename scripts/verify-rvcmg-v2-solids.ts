/**
 * Verifies the actual, shipped RVCMG v2 connector registry entries
 * (RVCMG_V2_CONNECTOR_ADDITIONS, app/lib/polyhedra/miscellaneous/
 * rvcmg-connectors-v2/) directly -- not a parallel re-derivation, so
 * this can never silently drift from what the app actually ships.
 * Mirrors scripts/verify-rvcmg-solids.ts's own checks (now scoped to
 * the archived v1 set), minus the RD-Hemi section -- v2 has no RD-Hemi
 * piece.
 *
 * Checks: Euler's formula, every face planar and outward-wound, no
 * degenerate face, the target cap's own edges matching its Stage 0-7
 * pre-lift state exactly, both caps sitting on the same axis exactly
 * `WALL_HEIGHT_V2` apart, and that `attachableFaceIndices` names exactly
 * the two real ports (hex + target), never a wall/side triangle.
 */
import { RVCMG_V2_CONNECTOR_ADDITIONS, RVCMG_V2_CONNECTOR_ADDITION_IDS } from '../app/lib/polyhedra/miscellaneous/rvcmg-connectors-v2';
import { universalHexInterfaceFrame, HEX_CIRCUMRADIUS } from '../app/lib/rvcmg/universalHexInterface';
import { validateAdapterSolid } from '../app/lib/rvcmg/solid';
import { uHexStartState, deriveTriangleToUHex } from '../app/lib/rvcmg/adapters/triangleToUHex';
import { deriveSquareToUHex } from '../app/lib/rvcmg/adapters/squareToUHex';
import { derivePentagonToUHex } from '../app/lib/rvcmg/adapters/pentagonToUHex';
import { deriveGoldenRhombusToUHex } from '../app/lib/rvcmg/adapters/goldenRhombusToUHex';
import { deriveRdNativeRhombusToUHex } from '../app/lib/rvcmg/adapters/rdNativeRhombusToUHex';
import { deriveDIKiteToUHex } from '../app/lib/rvcmg/adapters/diKiteToUHex';
import { deriveDHKiteToUHex } from '../app/lib/rvcmg/adapters/dhKiteToUHex';
import { deriveRegularHexToUHex } from '../app/lib/rvcmg/adapters/regularHexToUHex';
import { isRegularFace, rotateFaceToMirrorAxis, dist, type Vec3 } from '../app/lib/polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

// Independently re-derive the wall-height claim (not imported from
// rvcmg-connectors-v2/index.ts's own private const) so this script
// checks the CLAIM, not just that two files agree with each other.
check('re-derived HEX_CIRCUMRADIUS matches the known closed form sqrt(2)/2', Math.abs(HEX_CIRCUMRADIUS - Math.SQRT2 / 2) < 1e-9);
const EXPECTED_WALL_HEIGHT_V2 = HEX_CIRCUMRADIUS * (Math.SQRT2 / 4);
check('re-derived WALL_HEIGHT_V2 matches the known closed form 1/4', Math.abs(EXPECTED_WALL_HEIGHT_V2 - 0.25) < 1e-9);

const NORMAL = universalHexInterfaceFrame().normal;

const PIECES: { id: string; derive: () => ReturnType<typeof deriveTriangleToUHex> }[] = [
  { id: 'RVCMG_V2_TRIANGLE_TO_UHEX', derive: deriveTriangleToUHex },
  { id: 'RVCMG_V2_SQUARE_TO_UHEX', derive: deriveSquareToUHex },
  { id: 'RVCMG_V2_PENTAGON_TO_UHEX', derive: derivePentagonToUHex },
  { id: 'RVCMG_V2_GOLDEN_RHOMBUS_TO_UHEX', derive: deriveGoldenRhombusToUHex },
  { id: 'RVCMG_V2_RD_NATIVE_RHOMBUS_TO_UHEX', derive: deriveRdNativeRhombusToUHex },
  { id: 'RVCMG_V2_DI_KITE_TO_UHEX', derive: deriveDIKiteToUHex },
  { id: 'RVCMG_V2_DH_KITE_TO_UHEX', derive: deriveDHKiteToUHex },
  { id: 'RVCMG_V2_REGULAR_HEX_TO_UHEX', derive: deriveRegularHexToUHex },
];

check(
  'rvcmg-connectors-v2 registers exactly these 8 tapered pieces (no RD-Hemi)',
  PIECES.every((p) => RVCMG_V2_CONNECTOR_ADDITION_IDS.includes(p.id)) && RVCMG_V2_CONNECTOR_ADDITION_IDS.length === 8,
);

for (const { id, derive } of PIECES) {
  const spec = RVCMG_V2_CONNECTOR_ADDITIONS[id];
  check(`${id}: is registered`, !!spec);
  if (!spec) continue;

  const piece = derive();
  check(`${id}: Stage 0-7 derivation itself is clean (${JSON.stringify(piece.problems)})`, piece.problems.length === 0);
  const targetState = piece.states[piece.states.length - 1];

  check(`${id}: attachableFaceIndices is set (exactly 2 ports)`, Array.isArray(spec.attachableFaceIndices) && spec.attachableFaceIndices.length === 2);
  const [hexFaceIndex, targetFaceIndex] = spec.attachableFaceIndices ?? [-1, -1];
  check(`${id}: the named hex port is really a 6-gon`, spec.faces[hexFaceIndex]?.length === 6);
  check(`${id}: the named target port has the right vertex count (${targetState.vertices.length})`, spec.faces[targetFaceIndex]?.length === targetState.vertices.length);

  check(
    `${id}: hex port's vertex 0 is already on a mirror axis`,
    JSON.stringify(rotateFaceToMirrorAxis(spec.vertices, spec.faces[hexFaceIndex])) === JSON.stringify(spec.faces[hexFaceIndex]),
  );
  check(
    `${id}: target port's vertex 0 is already on a mirror axis`,
    JSON.stringify(rotateFaceToMirrorAxis(spec.vertices, spec.faces[targetFaceIndex])) === JSON.stringify(spec.faces[targetFaceIndex]),
  );

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
  const dotV = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cosToNormal = Math.abs(dotV(axisVec, NORMAL)) / axisLen;
  check(`${id}: hex-to-target axis is parallel to the hex interface's own normal (cos=${cosToNormal.toFixed(9)})`, Math.abs(cosToNormal - 1) < 1e-6);
  check(`${id}: hex-to-target distance equals WALL_HEIGHT_V2 (got ${axisLen.toFixed(9)}, expected ${EXPECTED_WALL_HEIGHT_V2.toFixed(9)})`, Math.abs(axisLen - EXPECTED_WALL_HEIGHT_V2) < 1e-6);

  const hexEdgeLensBuilt = hexPts.map((p, k) => dist(p, hexPts[(k + 1) % hexPts.length])).sort((a, b) => a - b);
  const hexState = uHexStartState();
  const hexEdgeLensReal = hexState.vertices.map((v, k) => dist(v.pos, hexState.vertices[(k + 1) % hexState.vertices.length].pos)).sort((a, b) => a - b);
  check(
    `${id}: hex cap edges match the universal hex interface exactly (as a multiset)`,
    hexEdgeLensBuilt.every((l, k) => Math.abs(l - hexEdgeLensReal[k]) < 1e-9),
  );
}

console.log(`\n${failures} failures.`);
process.exit(failures === 0 ? 0 : 1);

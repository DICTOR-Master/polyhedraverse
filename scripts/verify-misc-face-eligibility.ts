/**
 * Verifies the Miscellaneous-family-only face-attach eligibility gate
 * (`isRegularFace` in app/lib/polyhedra/core.ts, applied in
 * ShapeViewer.tsx's incoming-face-match and faceAttachOptions logic) --
 * direct user instruction (2026-09-15): "only regular faces (plus
 * irregular hexagons) are offered for attachment so pointed pyramids
 * dont stick to each other", scoped to the Miscellaneous family only so
 * Catalan solids' own irregular rhombi/kite faces keep face-attaching
 * exactly as already shipped (they are NOT in MISCELLANEOUS_ADDITION_IDS,
 * so the gate never applies to them).
 *
 * Mirrors ShapeViewer.tsx's own filters directly rather than a
 * screen-coordinate-driven Playwright click, which is fragile to
 * exact pixel geometry and re-tests three.js raycasting rather than
 * this eligibility policy. tests/e2e/face-attach.spec.ts already
 * covers the underlying click/attach mechanics end to end; this script
 * covers the policy this session added on top of it.
 */
import { POLYHEDRA, POLYHEDRON_IDS } from '../app/lib/polyhedra/index';
import { MISCELLANEOUS_ADDITION_IDS, GRADED_PYRAMID_ADDITION_IDS } from '../app/lib/polyhedra/miscellaneous';
import { RVCMG_CONNECTOR_ADDITION_IDS } from '../app/lib/polyhedra/miscellaneous/rvcmg-connectors';
import { facesCongruent, isRegularFace, faceRotationalSymmetry, type PolyhedronSpec } from '../app/lib/polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

// Mirrors ShapeViewer.tsx's own isFaceEligibleForAttach exactly:
// attachableFaceIndices (RVCMG pieces) takes priority when set, else
// isRegularFace within the Miscellaneous family, else unrestricted.
function isFaceEligibleForAttach(spec: PolyhedronSpec, faceIndex: number): boolean {
  if (spec.attachableFaceIndices) return spec.attachableFaceIndices.includes(faceIndex);
  if (!MISCELLANEOUS_ADDITION_IDS.includes(spec.id)) return true;
  return isRegularFace(spec.vertices, spec.faces[faceIndex]);
}

// Mirrors ShapeViewer.tsx's faceAttachOptions computation exactly.
function attachOptionsFor(targetId: string, faceIdx: number): string[] {
  const targetSpec = POLYHEDRA[targetId];
  const targetFace = targetSpec.faces[faceIdx];
  if (!isFaceEligibleForAttach(targetSpec, faceIdx)) return [];
  return POLYHEDRON_IDS.filter((id) =>
    POLYHEDRA[id].faces.some((f, fi) => isFaceEligibleForAttach(POLYHEDRA[id], fi) && facesCongruent(targetSpec.vertices, targetFace, POLYHEDRA[id].vertices, f)),
  );
}

// --- PYRAMID_SQUARE_G1 (grade 1 = "low", genuinely non-regular
// laterals): base is a regular 4-gon, laterals are isosceles triangles
// with apex angle ~78.46 deg, deliberately NOT equilateral. ---
const g1 = POLYHEDRA.PYRAMID_SQUARE_G1;
const g1BaseFaceIdx = g1.faces.findIndex((f) => f.length === 4);
const g1LateralFaceIdx = g1.faces.findIndex((f) => f.length === 3);
check('PYRAMID_SQUARE_G1 has a 4-gon base and 3-gon laterals', g1BaseFaceIdx !== -1 && g1LateralFaceIdx !== -1);
check('PYRAMID_SQUARE_G1 base face is regular (square)', isRegularFace(g1.vertices, g1.faces[g1BaseFaceIdx]));
check(
  'PYRAMID_SQUARE_G1 lateral face is NOT regular (grade 1 is deliberately non-equilateral)',
  !isRegularFace(g1.vertices, g1.faces[g1LateralFaceIdx]),
);

const g1LateralOptions = attachOptionsFor('PYRAMID_SQUARE_G1', g1LateralFaceIdx);
check(
  `PYRAMID_SQUARE_G1's pointed (lateral) face offers ZERO attach options (got ${JSON.stringify(g1LateralOptions)})`,
  g1LateralOptions.length === 0,
);

const g1BaseOptions = attachOptionsFor('PYRAMID_SQUARE_G1', g1BaseFaceIdx);
check(
  `PYRAMID_SQUARE_G1's regular base face offers at least one attach option (got ${g1BaseOptions.length})`,
  g1BaseOptions.length > 0,
);
check('PYRAMID_SQUARE_G1 base face options include another square-based pyramid', g1BaseOptions.includes('PYRAMID_SQUARE_G1'));

// --- Grade 2 is the "standard" case: laterals ARE equilateral (regular)
// by construction (matches J1_SQUARE_PYRAMID exactly), so its lateral
// face SHOULD be offered -- the gate must not over-restrict. ---
const g2 = POLYHEDRA.PYRAMID_SQUARE_G2;
const g2LateralFaceIdx = g2.faces.findIndex((f) => f.length === 3);
check('PYRAMID_SQUARE_G2 lateral face IS regular (grade 2 = standard, equilateral)', isRegularFace(g2.vertices, g2.faces[g2LateralFaceIdx]));
const g2LateralOptions = attachOptionsFor('PYRAMID_SQUARE_G2', g2LateralFaceIdx);
check(
  `PYRAMID_SQUARE_G2's regular (equilateral) lateral face DOES offer attach options (got ${g2LateralOptions.length})`,
  g2LateralOptions.length > 0,
);

// --- Every grade's base face is regular, every non-grade-2 lateral is
// not, across all three bases -- the general shape of the policy.
// Scoped to graded pyramids only (RVCMG_CONNECTOR_ADDITION_IDS uses a
// completely different eligibility mechanism, attachableFaceIndices,
// checked in its own block below -- their "base" hex face is
// deliberately NOT a regular polygon at all). ---
for (const id of GRADED_PYRAMID_ADDITION_IDS) {
  const spec = POLYHEDRA[id];
  const grade = Number(id.match(/_G(\d)$/)?.[1]);
  const baseN = spec.faces.reduce((max, f) => Math.max(max, f.length), 0);
  const baseFaceIdx = spec.faces.findIndex((f) => f.length === baseN);
  check(`${id}: base face (${baseN}-gon) is regular`, isRegularFace(spec.vertices, spec.faces[baseFaceIdx]));
  const lateralFaceIdx = spec.faces.findIndex((f) => f.length === 3 && f !== spec.faces[baseFaceIdx]);
  if (lateralFaceIdx !== -1 && baseN !== 3) {
    const lateralIsRegular = isRegularFace(spec.vertices, spec.faces[lateralFaceIdx]);
    check(`${id}: lateral face regularity matches grade (regular iff grade 2, got grade ${grade}, regular=${lateralIsRegular})`, lateralIsRegular === (grade === 2));
  }
}

// --- RVCMG connector pieces: attachableFaceIndices names exactly the
// two real ports (hex + target), and both are reachable through
// attachOptionsFor with at least one real cross-family match -- proving
// the eligibility gate doesn't just exclude everything by accident. ---
for (const id of RVCMG_CONNECTOR_ADDITION_IDS) {
  const spec = POLYHEDRA[id];
  check(`${id}: has attachableFaceIndices set to exactly 2 faces`, Array.isArray(spec.attachableFaceIndices) && spec.attachableFaceIndices.length === 2);
  const [hexIdx, targetIdx] = spec.attachableFaceIndices ?? [-1, -1];
  spec.faces.forEach((_, fi) => {
    const shouldBeEligible = fi === hexIdx || fi === targetIdx;
    check(`${id}: face ${fi} eligibility matches attachableFaceIndices (expected ${shouldBeEligible})`, isFaceEligibleForAttach(spec, fi) === shouldBeEligible);
  });
  const targetOptions = attachOptionsFor(id, targetIdx);
  check(`${id}: target port offers at least one real cross-family match (got ${targetOptions.length}: ${targetOptions.slice(0, 3).join(', ')})`, targetOptions.length > 0);
}

// --- Catalan solids must be completely unaffected: their irregular
// rhombi/kite faces keep offering exactly as before (none are in
// MISCELLANEOUS_ADDITION_IDS, so isRegularFace is never consulted for
// them at all). ---
const rd = POLYHEDRA.RHOMBIC_DODECAHEDRON;
check('RHOMBIC_DODECAHEDRON is NOT in the Miscellaneous-restricted id list', !MISCELLANEOUS_ADDITION_IDS.includes('RHOMBIC_DODECAHEDRON'));
check('RD rhombic face is (correctly) not a regular polygon by itself', !isRegularFace(rd.vertices, rd.faces[0]));
const rdOptions = attachOptionsFor('RHOMBIC_DODECAHEDRON', 0);
check(`RD's rhombic face still offers attach options unaffected by the gate (got ${rdOptions.length})`, rdOptions.length > 0);

// Sanity on the primitive itself: faceRotationalSymmetry === face.length
// IS regularity for a planar convex polygon (equal edges + equal angles).
check('isRegularFace agrees with faceRotationalSymmetry === face.length on the RD face', isRegularFace(rd.vertices, rd.faces[0]) === (faceRotationalSymmetry(rd.vertices, rd.faces[0]) === rd.faces[0].length));

console.log(`\n${failures} failures.`);
process.exit(failures === 0 ? 0 : 1);

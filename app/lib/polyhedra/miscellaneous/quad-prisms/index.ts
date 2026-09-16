/**
 * The "quad-prisms" sub-group of the "Miscellaneous" family: 4 prism-
 * like "extender" pieces (direct user request, 2026-09-17) — a real
 * Catalan-solid rhombus/kite face, extruded into a right prism whose
 * lateral faces are squares (rhombus bases) or 2 squares + 2 rectangles
 * (kite bases). See `polygonPrismSolid.ts` (one level up) for the
 * construction and why that split is geometrically forced, not a
 * design choice.
 *
 * Two rhombus prisms (RD-native, golden-ratio) and two kite prisms
 * (DI, DH) — one per irregular-quadrilateral-faced Catalan solid this
 * project's RVCMG family already targets (`app/lib/rvcmg/adapters/
 * rhombusToUHex.ts`/`kiteToUHex.ts`), reusing those same measurement
 * helpers so the numbers can never drift from what RVCMG already
 * verified. Geometry itself comes from the shared, n-agnostic
 * `polygonPrismSolid.ts` (one level up — also used by the U-Hex spacer
 * piece in `rvcmg-connectors-v2/`, n=6, though that one keeps its own
 * lateral faces non-attachable — see that file's own comment).
 *
 * Every face is a real attach port (direct user request, 2026-09-17:
 * "add that please for branching possibilities") — the lateral
 * squares/rectangles are genuine, planar, right-angled faces, not
 * construction artifacts, so a cube (or another matching prism) can
 * attach sideways too, not just end-to-end. EXCEPTION: a kite prism's 2
 * non-square rectangle lateral faces stay excluded — a real, structural
 * gap in the app's own face-attach placement algorithm for polygons
 * whose only mirror axis passes through an edge midpoint rather than a
 * vertex (see `polygonPrismSolid.ts`'s own header for the full finding),
 * found while wiring this up, not a design choice. The rhombus prisms
 * are unaffected (all 6 faces are squares, all placeable, all open).
 */

import { type Vec3, type PolyhedronSpec, dist, buildFaceConnectors, facesCongruent } from '../../core';
import { CATALAN_ADDITIONS } from '../../catalan';
import { buildPolygonPrismSolid } from '../../polygonPrismSolid';
import { measureRhombusFace } from '../../../rvcmg/adapters/rhombusToUHex';
import { measureKiteFace } from '../../../rvcmg/adapters/kiteToUHex';

function rhombusPrism(id: string, name: string, catalanId: string): PolyhedronSpec {
  const source = CATALAN_ADDITIONS[catalanId];
  const face = source.faces[0];
  const faceVertices = face.map((i) => source.vertices[i]) as [Vec3, Vec3, Vec3, Vec3];
  const normal = buildFaceConnectors(source)[0].normal;
  const { edge } = measureRhombusFace(catalanId);

  const { spec, problems } = buildPolygonPrismSolid({ id, name, faceVertices, normal, height: edge, attachableFaces: 'all' });
  if (problems.length > 0) throw new Error(`${id}: unresolved problems: ${JSON.stringify(problems)}`);
  if (!facesCongruent(spec.vertices, spec.faces[0], source.vertices, face)) {
    throw new Error(`${id}: built cap is not congruent to the real ${catalanId} face it was extruded from`);
  }
  // Every lateral edge must equal `edge` for all 4 lateral faces to be genuine squares.
  for (let i = 0; i < 4; i++) {
    const len = dist(spec.vertices[i], spec.vertices[i + 4]);
    if (Math.abs(len - edge) > 1e-9) throw new Error(`${id}: lateral edge ${i} has length ${len}, expected ${edge} (not a square prism)`);
  }
  return spec;
}

function kitePrism(id: string, name: string, catalanId: string): PolyhedronSpec {
  const source = CATALAN_ADDITIONS[catalanId];
  const face = source.faces[0];
  const faceVertices = face.map((i) => source.vertices[i]) as [Vec3, Vec3, Vec3, Vec3];
  const normal = buildFaceConnectors(source)[0].normal;
  const { edgeShort } = measureKiteFace(catalanId);

  // Which of the 4 lateral faces will be genuine squares (short base
  // edge == height) vs. non-square rectangles -- computed from the base
  // face's own real edges, not assumed from a fixed index pattern, since
  // the whole point is to hand `buildPolygonPrismSolid` an explicit,
  // checked attachable list. Only the squares (+ both caps) go in:
  // rectangle lateral faces have a REAL placement-algorithm limitation
  // (see polygonPrismSolid.ts's own header) and must stay excluded even
  // though the quad-prism family is otherwise open for branching.
  const squareLateralFaces = [0, 1, 2, 3]
    .filter((i) => Math.abs(dist(faceVertices[i], faceVertices[(i + 1) % 4]) - edgeShort) < 1e-9)
    .map((i) => i + 2);
  if (squareLateralFaces.length !== 2) throw new Error(`${id}: expected exactly 2 short (square) base edges, found ${squareLateralFaces.length}`);

  const { spec, problems } = buildPolygonPrismSolid({ id, name, faceVertices, normal, height: edgeShort, attachableFaces: [0, 1, ...squareLateralFaces] });
  if (problems.length > 0) throw new Error(`${id}: unresolved problems: ${JSON.stringify(problems)}`);
  if (!facesCongruent(spec.vertices, spec.faces[0], source.vertices, face)) {
    throw new Error(`${id}: built cap is not congruent to the real ${catalanId} face it was extruded from`);
  }

  // Direct confirmation of the "2 squares + 2 rectangles" claim, not
  // just trust in the construction: every lateral face's bottom edge is
  // one of the kite's own 4 base edges (short, long, long, short, per
  // measureKiteFace.ts's own layout); height = edgeShort, so the two
  // short-base faces are genuine squares and the two long-base faces
  // are genuine (non-square) rectangles.
  let squareCount = 0;
  let rectangleCount = 0;
  for (let i = 0; i < 4; i++) {
    const baseEdge = dist(spec.vertices[i], spec.vertices[(i + 1) % 4]);
    const verticalEdge = dist(spec.vertices[i], spec.vertices[i + 4]);
    if (Math.abs(verticalEdge - edgeShort) > 1e-9) throw new Error(`${id}: lateral edge ${i} has length ${verticalEdge}, expected ${edgeShort}`);
    if (Math.abs(baseEdge - edgeShort) < 1e-9) squareCount++;
    else rectangleCount++;
  }
  if (squareCount !== 2 || rectangleCount !== 2) {
    throw new Error(`${id}: expected exactly 2 square + 2 rectangle lateral faces, got ${squareCount} square + ${rectangleCount} rectangle`);
  }
  return spec;
}

export const QUAD_PRISM_ADDITIONS: Record<string, PolyhedronSpec> = {
  QUAD_PRISM_RD_RHOMBUS: rhombusPrism('QUAD_PRISM_RD_RHOMBUS', 'RD-rhombus prism (square sides)', 'RHOMBIC_DODECAHEDRON'),
  QUAD_PRISM_RT_GOLDEN_RHOMBUS: rhombusPrism('QUAD_PRISM_RT_GOLDEN_RHOMBUS', 'golden rhombus prism (square sides)', 'RHOMBIC_TRIACONTAHEDRON'),
  QUAD_PRISM_DI_KITE: kitePrism('QUAD_PRISM_DI_KITE', 'DI-kite prism (2 square + 2 rectangle sides)', 'DELTOIDAL_ICOSITETRAHEDRON'),
  QUAD_PRISM_DH_KITE: kitePrism('QUAD_PRISM_DH_KITE', 'DH-kite prism (2 square + 2 rectangle sides)', 'DELTOIDAL_HEXECONTAHEDRON'),
};

export const QUAD_PRISM_ADDITION_IDS: string[] = Object.keys(QUAD_PRISM_ADDITIONS);

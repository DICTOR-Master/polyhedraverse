/**
 * The "rvcmg-connectors" sub-group of the "Miscellaneous" family (see
 * the family's own index.ts one level up, which combines this
 * sub-group with the sibling "pyramids" one).
 *
 * The 7 RVCMG physical adapter pieces (see
 * docs/rvcmg-adapter-pieces-spec.md), now built as real, closed 3D
 * solids (Stage 8, `app/lib/rvcmg/solid.ts`): each piece's own flat
 * hemi-RD hex interface and shape-specific target polygon (Stages 0-7,
 * already verified) get a real triangulated tapered wall between them,
 * derived directly from that piece's own coalesce sequence rather than
 * hand-declared per piece. These 7 shapes have no external precedent —
 * unlike every other family in this registry, there is no published
 * classification to check them against; see solid.ts's own header.
 */

import { type Vec3, type PolyhedronSpec, buildFaceConnectors } from '../../core';
import { CATALAN_ADDITIONS } from '../../catalan';
import { buildAdapterSolid } from '../../../rvcmg/solid';
import { hemiRdInterfaceFrame } from '../../../rvcmg/hemiRdInterface';
import { deriveTriangleToRdH, RD_EDGE_LENGTH } from '../../../rvcmg/adapters/triangleToRdH';
import { deriveSquareToRdH } from '../../../rvcmg/adapters/squareToRdH';
import { derivePentagonToRdH } from '../../../rvcmg/adapters/pentagonToRdH';
import { deriveGoldenRhombusToRdH } from '../../../rvcmg/adapters/goldenRhombusToRdH';
import { deriveDIKiteToRdH } from '../../../rvcmg/adapters/diKiteToRdH';
import { deriveDHKiteToRdH } from '../../../rvcmg/adapters/dhKiteToRdH';
import { deriveRegularHexToRdH } from '../../../rvcmg/adapters/regularHexToRdH';

const NORMAL = hemiRdInterfaceFrame().normal;

/**
 * The FULL real hemi-RD dome depth, DERIVED from the real RD, not chosen
 * freely -- direct user correction (2026-09-15) after two rounds of
 * picking arbitrary numbers (1, then 0.3, then 0.55) by eye: "it should
 * be based on geometry of RD; pentagonal [antiprism] is only example of
 * format not geometry" -- the antiprism comparison (one hexagon on the
 * bottom, one triangle on top) was about the TOPOLOGY only, never a
 * license to invent the proportions.
 *
 * The real hemi-RD is not a flat disk -- it is one real half of the
 * rhombic dodecahedron, a genuine 3D dome bulging out from the flat hex
 * cut face. That dome has one real, measurable depth: the RD's own
 * vertices NOT on the bisection plane sit at a single consistent
 * distance from it (checked below, not assumed) -- `sqrt(2)/2` in RD's
 * own circumradius-1 frame, `sqrt(2/3)` once rescaled to the shared
 * unit-edge frame every adapter piece already uses (`RD_EDGE_LENGTH`).
 */
const RD_HEMI_DEPTH: number = (() => {
  const RD = CATALAN_ADDITIONS.RHOMBIC_DODECAHEDRON;
  const axis = buildFaceConnectors(RD)[0].normal;
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const depths = RD.vertices.map((v) => dot(v, axis)).filter((d) => Math.abs(d) > 1e-9);
  const magnitude = Math.abs(depths[0]);
  for (const d of depths) {
    if (Math.abs(Math.abs(d) - magnitude) > 1e-9) {
      throw new Error(`RD's off-plane vertices do not share one consistent depth (got ${depths.map((x) => x.toFixed(6))}) -- RD_HEMI_DEPTH's derivation assumption is wrong`);
    }
  }
  return magnitude / RD_EDGE_LENGTH;
})();

/**
 * Each adapter piece's OWN neck length is HALF of `RD_HEMI_DEPTH`, not
 * the whole thing -- direct user correction (2026-09-15): "wall height
 * between faces should be halved... as when adapters are used together
 * height will double." Two hex-terminated pieces always mate at their
 * hex faces (adapter-to-adapter, or adapter-to-a-real-bare-RD-hemi), so
 * the two necks' lengths ADD once joined -- using the full dome depth
 * per piece would make every real joint twice as deep as an actual
 * hemi-RD's own dome. Halving here means a joined pair reconstructs the
 * real `RD_HEMI_DEPTH` exactly (matching one real hemi-RD's own depth,
 * or half of a whole RD's own vertex-to-vertex span along this axis).
 */
const WALL_HEIGHT = RD_HEMI_DEPTH / 2;

function buildPiece(id: string, name: string, derive: () => ReturnType<typeof deriveTriangleToRdH>): PolyhedronSpec {
  const piece = derive();
  if (piece.problems.length > 0) {
    throw new Error(`${id}: Stage 0-7 derivation has unresolved problems: ${JSON.stringify(piece.problems)}`);
  }
  const { spec, problems, hexFaceIndex, targetFaceIndex } = buildAdapterSolid(piece.states[0], piece.states[piece.states.length - 1], {
    id,
    name,
    normal: NORMAL,
    wallHeight: WALL_HEIGHT,
  });
  if (problems.length > 0) {
    throw new Error(`${id}: Stage 8 solid construction has unresolved problems: ${JSON.stringify(problems)}`);
  }
  // Only the two real ports (hex interface, target face) are ever valid
  // attach points -- direct user report (2026-09-15): wall/side
  // triangles "look confusingly attachable to squares etc." A wall
  // triangle can coincidentally BE a genuine regular polygon (nothing
  // rules that out geometrically), which would otherwise pass the
  // Miscellaneous family's usual `isRegularFace` gate; conversely the
  // golden-rhombus/kite pieces' own real target faces are deliberately
  // NOT regular polygons and would otherwise be wrongly excluded by that
  // same gate. See core.ts's own `attachableFaceIndices` doc comment.
  return { ...spec, attachableFaceIndices: [hexFaceIndex, targetFaceIndex] };
}

export const RVCMG_CONNECTOR_ADDITIONS: Record<string, PolyhedronSpec> = {
  RVCMG_TRIANGLE_TO_RDH: buildPiece('RVCMG_TRIANGLE_TO_RDH', 'triangle to RD-H adapter', deriveTriangleToRdH),
  RVCMG_SQUARE_TO_RDH: buildPiece('RVCMG_SQUARE_TO_RDH', 'square to RD-H adapter', deriveSquareToRdH),
  RVCMG_PENTAGON_TO_RDH: buildPiece('RVCMG_PENTAGON_TO_RDH', 'pentagon to RD-H adapter', derivePentagonToRdH),
  RVCMG_GOLDEN_RHOMBUS_TO_RDH: buildPiece('RVCMG_GOLDEN_RHOMBUS_TO_RDH', 'golden rhombus to RD-H adapter', deriveGoldenRhombusToRdH),
  RVCMG_DI_KITE_TO_RDH: buildPiece('RVCMG_DI_KITE_TO_RDH', 'DI-kite to RD-H adapter', deriveDIKiteToRdH),
  RVCMG_DH_KITE_TO_RDH: buildPiece('RVCMG_DH_KITE_TO_RDH', 'DH-kite to RD-H adapter', deriveDHKiteToRdH),
  RVCMG_REGULAR_HEX_TO_RDH: buildPiece('RVCMG_REGULAR_HEX_TO_RDH', 'regular hexagon to RD-H adapter', deriveRegularHexToRdH),
};

export const RVCMG_CONNECTOR_ADDITION_IDS: string[] = Object.keys(RVCMG_CONNECTOR_ADDITIONS);

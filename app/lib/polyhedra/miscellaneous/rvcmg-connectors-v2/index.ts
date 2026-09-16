/**
 * RVCMG v2 — the "rvcmg-connectors-v2" sub-group of the "Miscellaneous"
 * family: adapter pieces built on the new universal hex interface
 * (`app/lib/rvcmg/universalHexInterface.ts`), replacing
 * `rvcmg-connectors-v1-archived/` as the LIVE, registered set (see this
 * directory's sibling for the archived v1 set and
 * `docs/rvcmg-adapter-pieces-spec.md` for the full redesign history).
 *
 * 8 pieces, no RD-Hemi (direct user instruction, 2026-09-17 — the
 * hex is no longer tied to a real RD's own native scale, so there is no
 * longer a "bare dome" piece in this v2 set):
 * Triangle, Square, Pentagon, Golden-Rhombus, RD-Native-Rhombus,
 * DI-Kite, DH-Kite, Regular-Hexagon — all -to-U-Hex.
 */

import { type PolyhedronSpec } from '../../core';
import { buildAdapterSolid } from '../../../rvcmg/solid';
import { universalHexInterfaceFrame, HEX_CIRCUMRADIUS } from '../../../rvcmg/universalHexInterface';
import { deriveTriangleToUHex } from '../../../rvcmg/adapters/triangleToUHex';
import { deriveSquareToUHex } from '../../../rvcmg/adapters/squareToUHex';
import { derivePentagonToUHex } from '../../../rvcmg/adapters/pentagonToUHex';
import { deriveGoldenRhombusToUHex } from '../../../rvcmg/adapters/goldenRhombusToUHex';
import { deriveRdNativeRhombusToUHex } from '../../../rvcmg/adapters/rdNativeRhombusToUHex';
import { deriveDIKiteToUHex } from '../../../rvcmg/adapters/diKiteToUHex';
import { deriveDHKiteToUHex } from '../../../rvcmg/adapters/dhKiteToUHex';
import { deriveRegularHexToUHex } from '../../../rvcmg/adapters/regularHexToUHex';

const NORMAL = universalHexInterfaceFrame().normal;

/**
 * Neck length for every v2 piece — a genuinely new design choice with
 * nothing to derive it from (same honest framing as v1's own
 * `WALL_HEIGHT`, `rvcmg-connectors/index.ts`: "no external precedent").
 *
 * Chosen by preserving v1's own wall-height-to-hex-circumradius ratio,
 * scaled to the new hex's smaller size, rather than picking a fresh
 * number by eye: v1's wall height was `sqrt(2)/4` against a hex whose
 * own vertices reached out to circumradius 1.0 (RD's native scale) —
 * ratio `sqrt(2)/4`. The new hex's circumradius is `sqrt(2)/2`
 * (`HEX_CIRCUMRADIUS`), so the same ratio gives
 * `(sqrt(2)/2) * (sqrt(2)/4) = 1/4` exactly.
 */
const WALL_HEIGHT_V2 = HEX_CIRCUMRADIUS * (Math.SQRT2 / 4);

function buildPiece(id: string, name: string, derive: () => ReturnType<typeof deriveTriangleToUHex>): PolyhedronSpec {
  const piece = derive();
  if (piece.problems.length > 0) {
    throw new Error(`${id}: Stage 0-7 derivation has unresolved problems: ${JSON.stringify(piece.problems)}`);
  }
  const { spec, problems, hexFaceIndex, targetFaceIndex } = buildAdapterSolid(piece.states[0], piece.states[piece.states.length - 1], {
    id,
    name,
    normal: NORMAL,
    wallHeight: WALL_HEIGHT_V2,
  });
  if (problems.length > 0) {
    throw new Error(`${id}: Stage 8 solid construction has unresolved problems: ${JSON.stringify(problems)}`);
  }
  return { ...spec, attachableFaceIndices: [hexFaceIndex, targetFaceIndex] };
}

export const RVCMG_V2_CONNECTOR_ADDITIONS: Record<string, PolyhedronSpec> = {
  RVCMG_V2_TRIANGLE_TO_UHEX: buildPiece('RVCMG_V2_TRIANGLE_TO_UHEX', 'triangle to U-Hex adapter', deriveTriangleToUHex),
  RVCMG_V2_SQUARE_TO_UHEX: buildPiece('RVCMG_V2_SQUARE_TO_UHEX', 'square to U-Hex adapter', deriveSquareToUHex),
  RVCMG_V2_PENTAGON_TO_UHEX: buildPiece('RVCMG_V2_PENTAGON_TO_UHEX', 'pentagon to U-Hex adapter', derivePentagonToUHex),
  RVCMG_V2_GOLDEN_RHOMBUS_TO_UHEX: buildPiece('RVCMG_V2_GOLDEN_RHOMBUS_TO_UHEX', 'golden rhombus to U-Hex adapter', deriveGoldenRhombusToUHex),
  RVCMG_V2_RD_NATIVE_RHOMBUS_TO_UHEX: buildPiece('RVCMG_V2_RD_NATIVE_RHOMBUS_TO_UHEX', 'RD-native rhombus to U-Hex adapter', deriveRdNativeRhombusToUHex),
  RVCMG_V2_DI_KITE_TO_UHEX: buildPiece('RVCMG_V2_DI_KITE_TO_UHEX', 'DI-kite to U-Hex adapter', deriveDIKiteToUHex),
  RVCMG_V2_DH_KITE_TO_UHEX: buildPiece('RVCMG_V2_DH_KITE_TO_UHEX', 'DH-kite to U-Hex adapter', deriveDHKiteToUHex),
  RVCMG_V2_REGULAR_HEX_TO_UHEX: buildPiece('RVCMG_V2_REGULAR_HEX_TO_UHEX', 'regular hexagon to U-Hex adapter', deriveRegularHexToUHex),
};

export const RVCMG_V2_CONNECTOR_ADDITION_IDS: string[] = Object.keys(RVCMG_V2_CONNECTOR_ADDITIONS);

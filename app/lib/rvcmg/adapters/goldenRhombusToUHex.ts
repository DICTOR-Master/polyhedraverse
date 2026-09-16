/**
 * RVCMG v2 — Golden-Rhombus-to-U-Hex: the new universal hex interface
 * collapsed to a real rhombus matching the rhombic triacontahedron's own
 * face (diagonal ratio phi:1). See `rhombusToUHex.ts` for the full
 * shared derivation.
 */

import { deriveRhombusToUHex, measureRhombusFace } from './rhombusToUHex';
import type { AdapterPieceResult } from './triangleToUHex';

export function deriveGoldenRhombusToUHex(): AdapterPieceResult {
  return deriveRhombusToUHex({ catalanId: 'RHOMBIC_TRIACONTAHEDRON', pieceName: 'golden-rhombus-to-uhex' });
}

export const GOLDEN_RATIO_MEASURED_V2: number = measureRhombusFace('RHOMBIC_TRIACONTAHEDRON').ratio;
export const RHOMBIC_TRIACONTAHEDRON_EDGE_MEASURED_V2: number = measureRhombusFace('RHOMBIC_TRIACONTAHEDRON').edge;

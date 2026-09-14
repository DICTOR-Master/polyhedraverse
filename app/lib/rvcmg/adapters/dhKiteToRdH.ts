/**
 * The DH-kite-to-RD-H adapter piece: the hex interface collapsed to a
 * real kite matching the deltoidal hexecontahedron's own face — a
 * genuinely different kite proportion from DI's (not interchangeable).
 * See kiteToRdH.ts for the full shared derivation and docs/
 * rvcmg-adapter-pieces-spec.md for the family this belongs to.
 */

import { deriveKiteToRdH } from './kiteToRdH';
import type { AdapterPieceResult } from './triangleToRdH';

export function deriveDHKiteToRdH(): AdapterPieceResult {
  return deriveKiteToRdH({ catalanId: 'DELTOIDAL_HEXECONTAHEDRON', pieceName: 'dh-kite-to-rd-h' });
}

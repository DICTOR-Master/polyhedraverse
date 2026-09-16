/**
 * RVCMG v2 — DH-Kite-to-U-Hex: the new universal hex interface collapsed
 * to a real kite matching the deltoidal hexecontahedron's own face. See
 * `kiteToUHex.ts` for the full shared derivation.
 */

import { deriveKiteToUHex } from './kiteToUHex';
import type { AdapterPieceResult } from './triangleToUHex';

export function deriveDHKiteToUHex(): AdapterPieceResult {
  return deriveKiteToUHex({ catalanId: 'DELTOIDAL_HEXECONTAHEDRON', pieceName: 'dh-kite-to-uhex' });
}

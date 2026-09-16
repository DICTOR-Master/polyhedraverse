/**
 * RVCMG v2 — DI-Kite-to-U-Hex: the new universal hex interface collapsed
 * to a real kite matching the deltoidal icositetrahedron's own face. See
 * `kiteToUHex.ts` for the full shared derivation.
 */

import { deriveKiteToUHex } from './kiteToUHex';
import type { AdapterPieceResult } from './triangleToUHex';

export function deriveDIKiteToUHex(): AdapterPieceResult {
  return deriveKiteToUHex({ catalanId: 'DELTOIDAL_ICOSITETRAHEDRON', pieceName: 'di-kite-to-uhex' });
}

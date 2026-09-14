/**
 * The DI-kite-to-RD-H adapter piece: the hex interface collapsed to a
 * real kite matching the deltoidal icositetrahedron's own face. See
 * kiteToRdH.ts for the full shared derivation and docs/
 * rvcmg-adapter-pieces-spec.md for the family this belongs to.
 */

import { deriveKiteToRdH } from './kiteToRdH';
import type { AdapterPieceResult } from './triangleToRdH';

export function deriveDIKiteToRdH(): AdapterPieceResult {
  return deriveKiteToRdH({ catalanId: 'DELTOIDAL_ICOSITETRAHEDRON', pieceName: 'di-kite-to-rd-h' });
}

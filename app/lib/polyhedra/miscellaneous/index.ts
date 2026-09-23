/**
 * The "Miscellaneous" family: irregular/graded face-attach add-ons that
 * don't belong to one of the classical polyhedron families (see
 * docs/rvcmg-adapter-pieces-spec.md for the full record). A directory,
 * not a single file, because this family is expected to keep growing
 * from more than one source, and each source is itself a sub-group with
 * its own directory:
 *   - "pyramids" — graded pyramids (done, 3 bases x 4 grades)
 *   - "rvcmg-connectors-v2" — the LIVE RVCMG adapter pieces, built on
 *     the new small universal hex interface (8 pieces, no RD-Hemi —
 *     see that sub-group's own index.ts)
 *   - "rvcmg-connectors-v1-archived" — the ORIGINAL 8-piece RD-native-
 *     scale set (7 adapters + bare RD-Hemi). Superseded as the
 *     default/shared interface 2026-09-17 (the RD-native hex was up to
 *     1.73x too big to fit inside the tightest target, a unit-edge
 *     triangle), but kept intact — code and tests still pass — for
 *     reference. The 7 adapters stay OUT of `MISCELLANEOUS_ADDITIONS`
 *     below (superseded by v2's own 8 pieces); RVCMG_RD_HEMI alone is
 *     re-added (2026-09-23, direct user request), since it's a real
 *     standalone solid (RD's own real dome half) rather than an
 *     interface-scale-dependent adapter, and its rhombi are exactly
 *     congruent to `RD_RELATIVES_ADDITIONS.ELONGATED_DODECAHEDRON`'s
 *     own 8 rhombi (both built at RD's real native scale) -- confirmed
 *     directly via `facesCongruent`, not assumed. Its hex face is NOT
 *     congruent to ElongatedDodecahedron's own hexagons, though: same
 *     alternating-angle sequence (109.47/125.26 degrees, RD's own
 *     recurring angle pair) but a different edge-length pattern --
 *     RD-Hemi's hex comes from bisecting RD along one of its 12
 *     face-normal axes, while ElongatedDodecahedron's elongation runs
 *     along an unrelated vertex-to-vertex axis of the same RD, so the
 *     two hexagons were never the same cut to begin with (confirmed:
 *     every one of ElongatedDodecahedron's own 12 face-normal axes
 *     either gives no clean bisection of it at all, or a different,
 *     much larger hexagon -- a matching dome for its own actual hex
 *     face would need a fresh bespoke derivation, not a re-slice of
 *     existing geometry). See docs/rvcmg-adapter-pieces-spec.md for the
 *     full redesign history.
 *   - "quad-prisms" — 4 prism-like "extender" pieces (done, 2 rhombus
 *     bases + 2 kite bases, square/rectangle lateral faces)
 *   - "rd-relatives" — 2 real solids ported from Rhombiverse (Elongated
 *     Dodecahedron, Rhombohedron), both directly related to
 *     RHOMBIC_DODECAHEDRON (catalan.ts) -- see that sub-group's own
 *     index.ts for the full construction/verification record.
 * combined here exactly the way index.ts (one level up) combines every
 * other family's own file.
 */

import type { PolyhedronSpec } from '../core';
import { GRADED_PYRAMID_ADDITIONS, GRADED_PYRAMID_ADDITION_IDS } from './pyramids';
import { RVCMG_V2_CONNECTOR_ADDITIONS, RVCMG_V2_CONNECTOR_ADDITION_IDS } from './rvcmg-connectors-v2';
import { RVCMG_CONNECTOR_ADDITIONS as ARCHIVED_RVCMG_CONNECTOR_ADDITIONS, RVCMG_CONNECTOR_ADDITION_IDS as ARCHIVED_RVCMG_CONNECTOR_ADDITION_IDS } from './rvcmg-connectors-v1-archived';
import { QUAD_PRISM_ADDITIONS, QUAD_PRISM_ADDITION_IDS } from './quad-prisms';
import { RD_RELATIVES_ADDITIONS, RD_RELATIVES_ADDITION_IDS } from './rd-relatives';

export { GRADED_PYRAMID_ADDITIONS, GRADED_PYRAMID_ADDITION_IDS } from './pyramids';
export { RVCMG_V2_CONNECTOR_ADDITIONS, RVCMG_V2_CONNECTOR_ADDITION_IDS } from './rvcmg-connectors-v2';
export { ARCHIVED_RVCMG_CONNECTOR_ADDITIONS, ARCHIVED_RVCMG_CONNECTOR_ADDITION_IDS };
export { QUAD_PRISM_ADDITIONS, QUAD_PRISM_ADDITION_IDS } from './quad-prisms';
export { RD_RELATIVES_ADDITIONS, RD_RELATIVES_ADDITION_IDS } from './rd-relatives';

export const MISCELLANEOUS_ADDITIONS: Record<string, PolyhedronSpec> = {
  ...GRADED_PYRAMID_ADDITIONS,
  ...RVCMG_V2_CONNECTOR_ADDITIONS,
  ...QUAD_PRISM_ADDITIONS,
  ...RD_RELATIVES_ADDITIONS,
  RVCMG_RD_HEMI: ARCHIVED_RVCMG_CONNECTOR_ADDITIONS.RVCMG_RD_HEMI,
};

export const MISCELLANEOUS_ADDITION_IDS: string[] = [...GRADED_PYRAMID_ADDITION_IDS, ...RVCMG_V2_CONNECTOR_ADDITION_IDS, ...QUAD_PRISM_ADDITION_IDS, ...RD_RELATIVES_ADDITION_IDS, 'RVCMG_RD_HEMI'];

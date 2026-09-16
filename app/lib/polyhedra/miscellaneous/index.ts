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
 *     reference. Deliberately NOT spread into `MISCELLANEOUS_ADDITIONS`
 *     below, so it no longer appears anywhere in the live app; exported
 *     separately as `ARCHIVED_*` for anyone who wants to reach it
 *     directly. See docs/rvcmg-adapter-pieces-spec.md for the full
 *     redesign history.
 *   - "quad-prisms" — 4 prism-like "extender" pieces (done, 2 rhombus
 *     bases + 2 kite bases, square/rectangle lateral faces)
 * combined here exactly the way index.ts (one level up) combines every
 * other family's own file.
 */

import type { PolyhedronSpec } from '../core';
import { GRADED_PYRAMID_ADDITIONS, GRADED_PYRAMID_ADDITION_IDS } from './pyramids';
import { RVCMG_V2_CONNECTOR_ADDITIONS, RVCMG_V2_CONNECTOR_ADDITION_IDS } from './rvcmg-connectors-v2';
import { RVCMG_CONNECTOR_ADDITIONS as ARCHIVED_RVCMG_CONNECTOR_ADDITIONS, RVCMG_CONNECTOR_ADDITION_IDS as ARCHIVED_RVCMG_CONNECTOR_ADDITION_IDS } from './rvcmg-connectors-v1-archived';
import { QUAD_PRISM_ADDITIONS, QUAD_PRISM_ADDITION_IDS } from './quad-prisms';

export { GRADED_PYRAMID_ADDITIONS, GRADED_PYRAMID_ADDITION_IDS } from './pyramids';
export { RVCMG_V2_CONNECTOR_ADDITIONS, RVCMG_V2_CONNECTOR_ADDITION_IDS } from './rvcmg-connectors-v2';
export { ARCHIVED_RVCMG_CONNECTOR_ADDITIONS, ARCHIVED_RVCMG_CONNECTOR_ADDITION_IDS };
export { QUAD_PRISM_ADDITIONS, QUAD_PRISM_ADDITION_IDS } from './quad-prisms';

export const MISCELLANEOUS_ADDITIONS: Record<string, PolyhedronSpec> = {
  ...GRADED_PYRAMID_ADDITIONS,
  ...RVCMG_V2_CONNECTOR_ADDITIONS,
  ...QUAD_PRISM_ADDITIONS,
};

export const MISCELLANEOUS_ADDITION_IDS: string[] = [...GRADED_PYRAMID_ADDITION_IDS, ...RVCMG_V2_CONNECTOR_ADDITION_IDS, ...QUAD_PRISM_ADDITION_IDS];

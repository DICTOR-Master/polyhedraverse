/**
 * The "Miscellaneous" family: irregular/graded face-attach add-ons that
 * don't belong to one of the classical polyhedron families (see
 * docs/rvcmg-adapter-pieces-spec.md for the full record). A directory,
 * not a single file, because this family is expected to keep growing
 * from more than one source, and each source is itself a sub-group with
 * its own directory:
 *   - "pyramids" — graded pyramids (done, 3 bases x 4 grades)
 *   - "rvcmg-connectors" — the 7 RVCMG physical adapter pieces (empty
 *     scaffold today; real solid geometry not built yet, see that
 *     sub-group's own index.ts)
 * combined here exactly the way index.ts (one level up) combines every
 * other family's own file.
 */

import type { PolyhedronSpec } from '../core';
import { GRADED_PYRAMID_ADDITIONS, GRADED_PYRAMID_ADDITION_IDS } from './pyramids';
import { RVCMG_CONNECTOR_ADDITIONS, RVCMG_CONNECTOR_ADDITION_IDS } from './rvcmg-connectors';

export { GRADED_PYRAMID_ADDITIONS, GRADED_PYRAMID_ADDITION_IDS } from './pyramids';
export { RVCMG_CONNECTOR_ADDITIONS, RVCMG_CONNECTOR_ADDITION_IDS } from './rvcmg-connectors';

export const MISCELLANEOUS_ADDITIONS: Record<string, PolyhedronSpec> = {
  ...GRADED_PYRAMID_ADDITIONS,
  ...RVCMG_CONNECTOR_ADDITIONS,
};

export const MISCELLANEOUS_ADDITION_IDS: string[] = [...GRADED_PYRAMID_ADDITION_IDS, ...RVCMG_CONNECTOR_ADDITION_IDS];

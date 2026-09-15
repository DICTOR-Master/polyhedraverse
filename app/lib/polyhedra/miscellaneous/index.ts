/**
 * The "Miscellaneous" family: irregular/graded face-attach add-ons that
 * don't belong to one of the classical polyhedron families (see
 * docs/rvcmg-adapter-pieces-spec.md for the full record). A directory,
 * not a single file, because this family is expected to keep growing
 * from more than one source — graded pyramids today, the 7 RVCMG
 * adapter pieces once they have real 3D solid geometry, and whatever
 * else lands here later — each sub-source gets its own file, combined
 * here exactly the way index.ts (one level up) combines every other
 * family's own file.
 */

import type { PolyhedronSpec } from '../core';
import { GRADED_PYRAMID_ADDITIONS, GRADED_PYRAMID_ADDITION_IDS } from './pyramids';

export { GRADED_PYRAMID_ADDITIONS, GRADED_PYRAMID_ADDITION_IDS } from './pyramids';

export const MISCELLANEOUS_ADDITIONS: Record<string, PolyhedronSpec> = {
  ...GRADED_PYRAMID_ADDITIONS,
};

export const MISCELLANEOUS_ADDITION_IDS: string[] = [...GRADED_PYRAMID_ADDITION_IDS];

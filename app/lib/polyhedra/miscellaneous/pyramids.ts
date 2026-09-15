/**
 * Graded pyramids, one sub-source of the "Miscellaneous" family (see
 * this directory's own index.ts) — on the three regular bases already
 * used by an existing standard pyramid elsewhere in the registry
 * (D4/triangular, J1/square, J2/pentagonal). Direct user request: "add
 * scale versions to all standard pyramids existing in registry...
 * duplicate will be in miscellaneous family too."
 *
 * Grade 2 of each base is DELIBERATELY a geometric duplicate of the
 * existing D4/J1_SQUARE_PYRAMID/J2_PENTAGONAL_PYRAMID entries (confirmed
 * vertex-for-vertex in scripts/validate-graded-pyramids.ts, not just
 * assumed from the shared construction code) — a genuinely different
 * registry id for the same shape, not an error, so the graded family
 * reads as a complete 1-4 set on its own without a gap at "standard."
 *
 * Grades 1/3/4 are NOT unit-edge overall (only the base is; the lateral/
 * slant edges are whatever `apexHeightForAngle` derives for that grade's
 * target apex angle) — `validateShape`'s "every edge is 1" rule doesn't
 * apply here, matching Catalan solids' own precedent for a family that
 * needs a different validator (`validateGradedPyramid` instead).
 */

import type { PolyhedronSpec } from '../core';
import { buildGradedPyramid, gradeApexAngleDeg, GRADE_NUMBERS } from '../gradedPyramids';

interface PyramidBase {
  n: number;
  idPrefix: string;
  nameNoun: string;
}

const BASES: PyramidBase[] = [
  { n: 3, idPrefix: 'PYRAMID_TRI', nameNoun: 'triangular pyramid' },
  { n: 4, idPrefix: 'PYRAMID_SQUARE', nameNoun: 'square pyramid' },
  { n: 5, idPrefix: 'PYRAMID_PENTAGON', nameNoun: 'pentagonal pyramid' },
];

const GRADE_ADJECTIVE: Record<number, string> = {
  1: 'low',
  2: 'standard',
  3: 'tall',
  4: 'sharp',
};

export const GRADED_PYRAMID_ADDITIONS: Record<string, PolyhedronSpec> = Object.fromEntries(
  BASES.flatMap((base) =>
    GRADE_NUMBERS.map((grade) => {
      const id = `${base.idPrefix}_G${grade}`;
      const name = `${GRADE_ADJECTIVE[grade]} ${base.nameNoun} (grade ${grade})`;
      // Each grade's apex angle is resolved PER BASE SHAPE (gradeApexAngleDeg),
      // never a fixed number reused across bases — see gradedPyramids.ts's
      // own grading-scale comment for the real bug that reusing one base's
      // derived angle for another caused (a degenerate/crashing square base).
      return [id, buildGradedPyramid(base.n, gradeApexAngleDeg(base.n, grade), id, name)];
    }),
  ),
);

export const GRADED_PYRAMID_ADDITION_IDS: string[] = Object.keys(GRADED_PYRAMID_ADDITIONS);

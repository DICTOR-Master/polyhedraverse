/**
 * Composite-Seed RCP investigation, Stage 2 — Proposition P1
 * (positional composite closure): `ε_pos(L) = max_{c∈C_i} |n_i·c − d_i|`
 * per hypothesis.md §6 and Appendix A items 7–8, for the cube and
 * octahedron selections, plus the combinatorial exactness predicate
 * hypothesis.md §7.1/§8.1 proposes (a discrete boundary-selection rule
 * + a discrete facet-centroid offset should let every exposed centroid
 * in a class inherit a common coordinate) — implemented as a real,
 * checkable function over the aggregate's own combinatorics, not just
 * an empirical near-zero measurement.
 *
 * `n_i` here is the UNIT-normalized boundary-class direction — the
 * hypothesis doc's own `P_i: n_i·x = d_i` is a genuine plane equation,
 * which only measures true Euclidean distance-from-plane when `n_i` is
 * unit length. `rcpMap.ts`'s own `BoundaryClass.direction` is
 * deliberately NOT unit (its raw integer form is what the boundary
 * selection functions and `buildEffectiveSeed`'s violation test need,
 * at the same `L` scale) — this file normalizes only where a genuine
 * geometric distance is being reported, per its own file header
 * warning against silently mixing scales.
 */

import type { Vec3 } from '../core';
import { sCube, sOct, CUBE_BOUNDARY_CLASSES, OCT_BOUNDARY_CLASSES, buildEffectiveSeed, type BoundaryClass } from './rcpMap';
import { RD_FACETS } from './lattice';

function unitVec(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}
function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export interface ClassResidual {
  name: string;
  count: number;
  /** The best-fit intercept d_i, in TRUE Euclidean units (unit n_i), for the FIXED normal n_i -- for a fixed normal, the least-squares-optimal d_i is simply the mean of the projections. */
  dHat: number;
  /** epsilon_pos for this class: max |unit(n_i).c - dHat| over every exposed centroid c in this class. TRUE geometric distance from the best-fit plane, not a raw dot-product residual. */
  epsPos: number;
  /** epsPos < EXACT_TOL -- reported explicitly rather than silently rounded, per the investigation plan's own instruction that 1e-9 is not the same claim as exact equality. */
  exact: boolean;
}

export interface ResolutionResult {
  L: number;
  classes: ClassResidual[];
  maxEpsPos: number;
  allExact: boolean;
}

/** Exact-equality tolerance for floating point, not a "close enough" fudge -- distinguishes real machine-epsilon noise (~1e-15 for these magnitudes) from a genuine nonzero geometric discrepancy (which, if present at all in this construction, is on the order of 1 in raw lattice units, i.e. many orders of magnitude larger than float noise -- never ambiguous at this tolerance). */
const EXACT_TOL = 1e-9;

export function positionalResidualAtL(
  selectFn: (L: number) => Vec3[],
  classes: BoundaryClass[],
  L: number,
): ResolutionResult {
  const aggregate = selectFn(L);
  const seed = buildEffectiveSeed(aggregate, classes, L);
  const classResults: ClassResidual[] = seed.classes.map((cls) => {
    if (cls.centroids.length === 0) {
      return { name: cls.name, count: 0, dHat: NaN, epsPos: 0, exact: true };
    }
    const n = unitVec(cls.direction);
    const projections = cls.centroids.map((c) => dot3(n, c));
    const dHat = projections.reduce((a, b) => a + b, 0) / projections.length;
    const epsPos = Math.max(...projections.map((p) => Math.abs(p - dHat)));
    return { name: cls.name, count: cls.centroids.length, dHat, epsPos, exact: epsPos < EXACT_TOL };
  });
  const maxEpsPos = Math.max(...classResults.map((c) => c.epsPos));
  return { L, classes: classResults, maxEpsPos, allExact: classResults.every((c) => c.exact) };
}

export function sweepPositionalResidual(shape: 'cube' | 'oct', maxL: number): ResolutionResult[] {
  const selectFn = shape === 'cube' ? sCube : sOct;
  const classes = shape === 'cube' ? CUBE_BOUNDARY_CLASSES : OCT_BOUNDARY_CLASSES;
  const results: ResolutionResult[] = [];
  for (let L = 1; L <= maxL; L++) results.push(positionalResidualAtL(selectFn, classes, L));
  return results;
}

// ---------------------------------------------------------------------
// Combinatorial exactness predicate (hypothesis.md S7.1/S8.1): rather
// than only measuring epsPos numerically, this groups every
// contributing (cell, facet) pair by its own "stratum" -- the base
// cell's own projection n_i . c BEFORE adding the facet's centroid
// offset -- and reports whether every stratum, once the facet's own
// centroid offset is added, lands on the SAME predicted d_i. If more
// than one distinct stratum survives, that is a real, structural
// finding (not a numerical artifact), and this function reports it as
// such rather than collapsing it into a single "close enough" number.
// ---------------------------------------------------------------------

export interface CombinatorialStratum {
  /** n_i . c for the contributing cell's own centre, BEFORE the facet's own centroid offset is added -- the "generation" this stratum belongs to. */
  cellProjection: number;
  /** How many (cell, facet) pairs fall in this stratum. */
  count: number;
  /** n_i . centroid for every pair in this stratum -- checked internally uniform (a bug, not a finding, if not) before being reported as this stratum's own predicted d_i. */
  predictedD: number;
}

export interface CombinatorialAnalysis {
  name: string;
  strata: CombinatorialStratum[];
  /** True iff every stratum's own predictedD agrees -- the hypothesis's own combinatorial exactness claim, checked structurally rather than only via the numeric epsPos above (though for this construction the two necessarily agree exactly, since both are computed from the same centroid set). */
  singleStratum: boolean;
}

export function analyzeCombinatorialStrata(
  selectFn: (L: number) => Vec3[],
  classes: BoundaryClass[],
  L: number,
): CombinatorialAnalysis[] {
  const aggregate = selectFn(L);
  const inSet = new Set(aggregate.map((v) => `${v[0]},${v[1]},${v[2]}`));
  const results: CombinatorialAnalysis[] = [];

  // Re-derives exposure/classification at the (cell, facet) level directly
  // (not via buildEffectiveSeed) so each contribution can be tagged with
  // its OWN base cell's projection -- buildEffectiveSeed already discards
  // that association once it flattens into a single centroid list.
  for (const bc of classes) {
    const n = unitVec(bc.direction);
    const byStratum = new Map<number, { count: number; predictedDs: number[] }>();

    for (const c of aggregate) {
      for (const facet of RD_FACETS) {
        const neighbour: Vec3 = [c[0] + facet.centreOffset[0], c[1] + facet.centreOffset[1], c[2] + facet.centreOffset[2]];
        if (inSet.has(`${neighbour[0]},${neighbour[1]},${neighbour[2]}`)) continue;
        if (dot3(bc.direction, neighbour) <= L + 1e-9) continue; // this facet doesn't violate THIS class

        const cellProjection = dot3(bc.direction, c); // raw (non-unit) -- the stratum key, exact integers/half-integers only
        const centroid: Vec3 = [c[0] + facet.centroidOffset[0], c[1] + facet.centroidOffset[1], c[2] + facet.centroidOffset[2]];
        const predictedD = dot3(n, centroid);

        const key = Math.round(cellProjection * 1e6) / 1e6;
        const entry = byStratum.get(key) ?? { count: 0, predictedDs: [] };
        entry.count++;
        entry.predictedDs.push(predictedD);
        byStratum.set(key, entry);
      }
    }

    const strata: CombinatorialStratum[] = [...byStratum.entries()].map(([cellProjection, { count, predictedDs }]) => {
      const d0 = predictedDs[0];
      const uniform = predictedDs.every((d) => Math.abs(d - d0) < EXACT_TOL);
      if (!uniform) {
        throw new Error(`analyzeCombinatorialStrata: stratum at cellProjection=${cellProjection} for class ${bc.name} is not internally uniform -- a real bug, not a finding`);
      }
      return { cellProjection, count, predictedD: d0 };
    });

    const distinctDs = [...new Set(strata.map((s) => Math.round(s.predictedD * 1e9)))];
    results.push({ name: bc.name, strata, singleStratum: distinctDs.length <= 1 });
  }

  return results;
}

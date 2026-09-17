/**
 * Composite-Seed RCP investigation, Stage 5 — the tetrahedral
 * experiment (hypothesis.md §13, explicitly "fully open, remain
 * explicitly preliminary"). Computes the full angular spectrum of
 * `S_tet(L)`'s exposed RD facet normals against the 4 target ⟨111⟩
 * directions, classified into exactly one of hypothesis.md §13's three
 * stated possibilities -- NOT assumed to match the cube/octahedron
 * pattern going in, per the plan's own Stage 5 acceptance criterion.
 * Also runs the Stage 2 positional-residual test for this selection,
 * since the hypothesis doc leaves that untested for the tetrahedral
 * case too.
 */

import type { Vec3 } from '../core';
import { sTet, TET_BOUNDARY_CLASSES, buildEffectiveSeed } from './rcpMap';

function unitVec(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}
function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function angleDeg(a: Vec3, b: Vec3): number {
  const cos = Math.min(1, Math.max(-1, Math.abs(dot3(a, b))));
  return (Math.acos(cos) * 180) / Math.PI;
}

const EXACT_TOL = 1e-9;
const EXACT_TOL_DEG = 1e-6;

export type SpectrumClassification = 'single-constant-angle' | 'several-discrete-classes' | 'complex-distribution';

export interface TetrahedralResult {
  L: number;
  /** Positional residual (Stage 2's test, applied here) -- per boundary class. */
  positional: { name: string; count: number; epsPos: number; exact: boolean }[];
  maxEpsPos: number;
  /** Every distinct angle (rounded to EXACT_TOL_DEG) found across ALL 4 classes' own exposed facet normals, with how many facets land at each -- the raw evidence for the classification below. */
  distinctAngles: { angleDeg: number; count: number }[];
  classification: SpectrumClassification;
}

export function tetrahedralExperimentAtL(L: number): TetrahedralResult {
  const aggregate = sTet(L);
  const seed = buildEffectiveSeed(aggregate, TET_BOUNDARY_CLASSES, L);

  const positional = seed.classes.map((cls) => {
    if (cls.centroids.length === 0) return { name: cls.name, count: 0, epsPos: 0, exact: true };
    const n = unitVec(cls.direction);
    const projections = cls.centroids.map((c) => dot3(n, c));
    const dHat = projections.reduce((a, b) => a + b, 0) / projections.length;
    const epsPos = Math.max(...projections.map((p) => Math.abs(p - dHat)));
    return { name: cls.name, count: cls.centroids.length, epsPos, exact: epsPos < EXACT_TOL };
  });
  const maxEpsPos = Math.max(...positional.map((p) => p.epsPos));

  const angleCounts = new Map<number, number>();
  for (const cls of seed.classes) {
    const n = unitVec(cls.direction);
    for (const ν of cls.normals) {
      const a = Math.round(angleDeg(ν, n) / EXACT_TOL_DEG) * EXACT_TOL_DEG;
      angleCounts.set(a, (angleCounts.get(a) ?? 0) + 1);
    }
  }
  const distinctAngles = [...angleCounts.entries()].map(([angleDeg, count]) => ({ angleDeg, count })).sort((a, b) => a.angleDeg - b.angleDeg);

  let classification: SpectrumClassification;
  if (distinctAngles.length === 1) classification = 'single-constant-angle';
  else if (distinctAngles.length > 1 && distinctAngles.length <= 4) classification = 'several-discrete-classes';
  else classification = 'complex-distribution';

  return { L, positional, maxEpsPos, distinctAngles, classification };
}

export function sweepTetrahedralExperiment(maxL: number): TetrahedralResult[] {
  const results: TetrahedralResult[] = [];
  for (let L = 1; L <= maxL; L++) results.push(tetrahedralExperimentAtL(L));
  return results;
}

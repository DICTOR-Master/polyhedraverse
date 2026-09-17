/**
 * Composite-Seed RCP investigation, Stage 4 — single-pair Coxeter
 * compatibility check (hypothesis.md §10.2–§10.3): whether a derived
 * angle θ is (within tolerance) `π/m` for an integer `m`. Deliberately
 * NOT a group-level claim — per the plan's own instruction, "do not
 * conclude anything about whether the full RD-derived mirror system
 * forms a finite reflection group from this stage alone."
 */

const TOL = 1e-6;

export interface CoxeterResult {
  thetaDeg: number;
  /** pi / theta -- checked for integrality, not assumed. */
  piOverTheta: number;
  /** The candidate m if pi/theta is within TOL of an integer, else undefined. */
  m?: number;
  compatible: boolean;
}

export function checkCoxeterCompatibility(thetaDeg: number): CoxeterResult {
  const thetaRad = (thetaDeg * Math.PI) / 180;
  const piOverTheta = Math.PI / thetaRad;
  const rounded = Math.round(piOverTheta);
  const compatible = Math.abs(piOverTheta - rounded) < TOL;
  return { thetaDeg, piOverTheta, m: compatible ? rounded : undefined, compatible };
}

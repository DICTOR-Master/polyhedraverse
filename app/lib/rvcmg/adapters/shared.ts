/**
 * Shared geometry helpers for every RVCMG adapter-piece derivation
 * (triangleToRdH.ts, squareToRdH.ts, and the rest of the family in
 * docs/rvcmg-adapter-pieces-spec.md) — factored out once a second piece
 * needed the exact same logic, not built ahead of need.
 */

/**
 * Assigns each group (by index) a target angle, evenly spaced
 * (`2*pi/n` apart) around the shared centroid, in TWO steps:
 *
 * 1. Rank the groups by their own real angle (in the hex interface's
 *    own planar frame) to read off the hexagon's actual winding order
 *    — this alone is what prevents an inverted (mirrored) result, and
 *    was already done before this helper existed.
 * 2. Choose the whole assignment's rotational PHASE (which absolute
 *    angle rank 0 lands on) to minimize the total twist between each
 *    group's own real angle and its assigned target angle, rather than
 *    an arbitrary fixed start (e.g. "rank 0 = 0 degrees"). Direct user
 *    instruction: "always use closest corresponding corners of group to
 *    match square or other shape" — a piece whose target corners sit as
 *    close as possible to where each corresponding source group already
 *    was makes a more natural, less twisted taper than an arbitrarily
 *    rotated one that happens to have the same shape.
 *
 * The best-fit phase is the circular mean (not a plain average — angles
 * wrap) of each group's own `angle - rank*step`, computed via the
 * standard sum-of-unit-vectors method (`atan2` of the summed sines and
 * cosines), which is exactly the phase minimizing the sum of squared
 * angular deviations on a circle.
 */
export function assignTargetAngles(groupAngles: number[]): number[] {
  const n = groupAngles.length;
  const order = groupAngles.map((_, i) => i).sort((a, b) => groupAngles[a] - groupAngles[b]);
  const rankOf = new Map<number, number>();
  order.forEach((groupIndex, rank) => rankOf.set(groupIndex, rank));
  const step = (2 * Math.PI) / n;

  let sumSin = 0;
  let sumCos = 0;
  for (let i = 0; i < n; i++) {
    const diff = groupAngles[i] - rankOf.get(i)! * step;
    sumSin += Math.sin(diff);
    sumCos += Math.cos(diff);
  }
  const bestFitPhase = Math.atan2(sumSin, sumCos);

  return groupAngles.map((_, i) => rankOf.get(i)! * step + bestFitPhase);
}

/**
 * RVCMG's standing verification suite — a direct implementation of spec
 * §25.1-25.8, runnable against any real state/transition (not just
 * hand-picked examples), mirroring `validateShape`'s own style
 * (core.ts): a list of problem strings, empty = valid.
 *
 * Scope note: `verifyTransition` validates a genuine SINGLE coalesce
 * step (`before` has exactly one more vertex than `after`) — it is not
 * meant to be run against a skip-transition (a `5<->3` edge, which the
 * spec itself says needs "an additional transformation" coalesce()
 * doesn't perform, per Stage 3's own V2 comment) or against a state
 * graph's auto-registered INVERSE edge (Stage 5's `addTransition`
 * synthesizes those as bookkeeping metadata, not a validated geometric
 * operation in their own right — their validity is `separate()`'s own
 * job, checked here via 25.6 instead).
 *
 * Deviation from the plan's literal `verifyTransition(op, before,
 * after)` signature, noted: 25.5 ("matches an independently specified
 * target state, WHEN ONE IS SUPPLIED") and 25.7 ("if two paths are
 * claimed equivalent, diff their geometry") both need something
 * supplied/claimed that a bare 3-argument signature has no room for —
 * an optional 4th `options` argument carries them.
 */

import { dist, type Vec3 } from '../polyhedra/core';
import type { RvcmgState, CoalescenceOp } from './types';
import { statesApproximatelyEqual } from './types';
import { coalesce } from './coalesce';
import { separate } from './separate';

export interface VerifyTransitionOptions {
  /** 25.5: an independently-specified expected result to check `after` against. */
  expectedAfter?: RvcmgState;
  /** 25.7: a claimed-equivalent alternate route (states + the ops connecting them) from `before` to the same endpoint as `after`. */
  equivalentPath?: { states: RvcmgState[]; ops: CoalescenceOp[] };
  tol?: number;
}

export function verifyTransition(op: CoalescenceOp, before: RvcmgState, after: RvcmgState, options: VerifyTransitionOptions = {}): string[] {
  const problems: string[] = [];
  const tol = options.tol ?? 1e-9;
  const [idA, idB] = op.coalescedPair;

  // 25.2 adjacency — coalescing pair was adjacent in `before`.
  const beforeIdxA = before.vertices.findIndex((v) => v.id === idA);
  const beforeIdxB = before.vertices.findIndex((v) => v.id === idB);
  const wasAdjacent =
    beforeIdxA !== -1 &&
    beforeIdxB !== -1 &&
    before.boundaryEdges.some(([i, j]) => (i === beforeIdxA && j === beforeIdxB) || (i === beforeIdxB && j === beforeIdxA));
  if (!wasAdjacent) problems.push(`25.2: "${idA}"/"${idB}" were not adjacent in "${before.id}"`);

  // 25.3 vertex count — after == before - 1 for a genuine single coalesce step.
  if (after.vertices.length !== before.vertices.length - 1) {
    problems.push(`25.3: vertex count ${after.vertices.length} != ${before.vertices.length} - 1 (not a single coalesce step)`);
  }

  // 25.1 coincidence — the merged vertex sits at op.targetPos, within tolerance.
  const mergedVertex = after.vertices.find((v) => v.sourceIds.length === 2 && v.sourceIds.includes(idA) && v.sourceIds.includes(idB));
  if (!mergedVertex) {
    problems.push(`25.1: no vertex in "${after.id}" records both "${idA}" and "${idB}" as its immediate sources`);
  } else if (dist(mergedVertex.pos, op.targetPos) > tol) {
    problems.push(`25.1: merged vertex sits at distance ${dist(mergedVertex.pos, op.targetPos).toFixed(9)} from targetPos, expected <= ${tol}`);
  }

  // 25.4 boundary validity — no stray zero-length edges; self-intersection
  // checked only when the boundary happens to be planar (a valid RVCMG
  // interface is not required to stay planar in general, see
  // hemiRdInterface.ts's own validator for the same scope decision).
  const n = after.vertices.length;
  for (let i = 0; i < n; i++) {
    const p = after.vertices[i].pos;
    const q = after.vertices[(i + 1) % n].pos;
    if (dist(p, q) < tol) problems.push(`25.4: "${after.id}" has a zero-length edge at index ${i}`);
  }
  problems.push(...planarSelfIntersectionProblems(after));

  // 25.5 endpoint geometry — matches an independently specified target state, when one is supplied.
  if (options.expectedAfter && !statesApproximatelyEqual(after, options.expectedAfter, tol)) {
    problems.push(`25.5: "${after.id}" does not structurally match the independently supplied expected state "${options.expectedAfter.id}"`);
  }

  // 25.6 reversibility — separate(coalesce(before)) == before, via the REAL separate() primitive, not re-derived by hand.
  if (mergedVertex) {
    try {
      const back = separate(after, mergedVertex.id, [before.vertices[beforeIdxA].pos, before.vertices[beforeIdxB].pos]);
      if (!statesApproximatelyEqual(back, before, tol)) {
        problems.push(`25.6: separate(coalesce("${before.id}")) does not reproduce "${before.id}"`);
      }
    } catch (e) {
      problems.push(`25.6: separate() threw while undoing this transition: ${(e as Error).message}`);
    }
  }

  // 25.7 path independence — never assume a claimed-equivalent composite
  // path actually reaches the same geometry; recompute it for real and diff.
  if (options.equivalentPath) {
    const { states, ops } = options.equivalentPath;
    let cur = states[0];
    for (const pathOp of ops) {
      cur = coalesce(cur, pathOp.coalescedPair[0], pathOp.coalescedPair[1], pathOp.targetPos, pathOp.deformation);
    }
    if (!statesApproximatelyEqual(cur, after, tol)) {
      problems.push(`25.7: the claimed-equivalent path does NOT reach the same geometry as "${after.id}" — not actually equivalent`);
    }
  }

  return problems;
}

/**
 * 25.8 (equal vertex count does not imply equal state) is enforced
 * structurally, not by a per-call runtime check here: `statesApproximatelyEqual`
 * (types.ts) always compares coordinates + connectivity, never count
 * alone, and types.test.ts's own static scan flags any code that
 * compares two states by `vertices.length` alone. See verify.test.ts for
 * a direct, concrete demonstration (two same-count, different-topology
 * states correctly reported as NOT equal).
 */
export const SPEC_25_8_NOTE =
  'enforced by statesApproximatelyEqual (never count-alone) + types.test.ts\'s static scan; see verify.test.ts for a direct demonstration';

function planarSelfIntersectionProblems(state: RvcmgState): string[] {
  const n = state.vertices.length;
  if (n < 4) return []; // a triangle can't self-intersect
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const centroid: Vec3 = [0, 0, 0];
  for (const v of state.vertices) {
    centroid[0] += v.pos[0] / n;
    centroid[1] += v.pos[1] / n;
    centroid[2] += v.pos[2] / n;
  }
  const p0 = state.vertices[0].pos;
  const p1 = state.vertices[1].pos;
  const p2 = state.vertices.map((v) => v.pos).find((p) => Math.hypot(...cross(sub(p1, p0), sub(p, p0))) > 1e-9);
  if (!p2) return []; // degenerate/collinear — not this check's job
  const normal = cross(sub(p1, p0), sub(p2, p0));
  const normalLen = Math.hypot(...normal);
  const unitNormal: Vec3 = [normal[0] / normalLen, normal[1] / normalLen, normal[2] / normalLen];
  const isPlanar = state.vertices.every((v) => Math.abs(dot(sub(v.pos, p0), unitNormal)) < 1e-6);
  if (!isPlanar) return []; // non-planar boundaries are allowed (spec §2.1) — this check doesn't apply

  const u = ((): Vec3 => {
    const m = Math.hypot(...sub(p1, p0));
    const d = sub(p1, p0);
    return [d[0] / m, d[1] / m, d[2] / m];
  })();
  const w = cross(unitNormal, u);
  const pts2d = state.vertices.map((v) => {
    const d = sub(v.pos, p0);
    return [dot(d, u), dot(d, w)] as [number, number];
  });
  const segsIntersect = (p1a: [number, number], p2a: [number, number], p3a: [number, number], p4a: [number, number]): boolean => {
    const d1 = (p4a[0] - p3a[0]) * (p1a[1] - p3a[1]) - (p4a[1] - p3a[1]) * (p1a[0] - p3a[0]);
    const d2 = (p4a[0] - p3a[0]) * (p2a[1] - p3a[1]) - (p4a[1] - p3a[1]) * (p2a[0] - p3a[0]);
    const d3 = (p2a[0] - p1a[0]) * (p3a[1] - p1a[1]) - (p2a[1] - p1a[1]) * (p3a[0] - p1a[0]);
    const d4 = (p2a[0] - p1a[0]) * (p4a[1] - p1a[1]) - (p2a[1] - p1a[1]) * (p4a[0] - p1a[0]);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  const problems: string[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segsIntersect(pts2d[i], pts2d[(i + 1) % n], pts2d[j], pts2d[(j + 1) % n])) {
        problems.push(`25.4: "${state.id}" is self-intersecting between edges ${i}-${(i + 1) % n} and ${j}-${(j + 1) % n}`);
      }
    }
  }
  return problems;
}

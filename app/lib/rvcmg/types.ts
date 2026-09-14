/**
 * RVCMG core data model (spec §6, §20). Every later stage (coalesce,
 * separate, the state graph, interpolation, verification) is built on
 * these three types alone — no parallel/derived type should ever be
 * introduced to sidestep them.
 */

import type { Vec3 } from '../polyhedra/core';

export interface RvcmgVertex {
  /** Stable identity, survives coalescence (spec §7: count != identity). */
  id: string;
  pos: Vec3;
  /** Which original v1..v6 (or prior coalesced ids) merged into this one. */
  sourceIds: string[];
}

/**
 * A state's identity is its own `id`, NEVER `vertices.length` (spec V7 /
 * §5) — two states can share a vertex count while being geometrically
 * and topologically distinct (e.g. two different 6-vertex states reached
 * by different coalescence/separation histories), and conversely a
 * single vertex count does not pick out a unique state. Any code that
 * compares two `RvcmgState`s by `vertices.length` alone instead of `id`
 * (or full coordinate+connectivity equality, per spec §25.8) is a bug —
 * see `types.test.ts`'s own static scan for this exact mistake, which
 * every later stage's test run re-checks, not just this file's own.
 */
export interface RvcmgState {
  /** State identity, NOT just vertex count (spec V7 / §5). */
  id: string;
  /** Ordered boundary. */
  vertices: RvcmgVertex[];
  /** Indices into `vertices`, in order. */
  boundaryEdges: [number, number][];
}

export interface CoalescenceOp {
  id: string;
  fromStateId: string;
  toStateId: string;
  /** Vertex ids that merged. */
  coalescedPair: [string, string];
  /** `c`, the coalescence target (spec §16). */
  targetPos: Vec3;
  /** spec §18. */
  path: 'symmetric' | 'one-sided' | ((t: number) => Vec3);
  /** `Φ`, applied to all other vertices (spec §16). */
  deformation: (v: Vec3) => Vec3;
  /** id of the separation op that undoes this. */
  inverse: CoalescenceOp['id'];
}

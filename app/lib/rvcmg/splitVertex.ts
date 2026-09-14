/**
 * RVCMG's general "multiply" primitive — the true dual of `coalesce()`
 * ("divide": two adjacent vertices -> one). Splits ANY single vertex
 * (original or previously-coalesced, doesn't matter) into two new ones
 * at caller-supplied positions, connected by a new edge, with every
 * other vertex transformed by a supplied deformation — exactly
 * mirroring `coalesce()`'s own shape, one level up in vertex count.
 *
 * This is a genuinely more general operation than `separate()`
 * (separate.ts): `separate` only undoes a SPECIFIC prior `coalesce()`
 * call (requires the target vertex to carry `sourceIds` recorded by
 * that exact call). `splitVertex` has no such requirement — it can
 * split an ORIGINAL vertex that was never merged at all, which is what
 * lets the vertex count go UP past its starting value (6 -> 7 -> 8 ->
 * ... -> 12, or any other count), not just back down to where it
 * started. Direct user statement this implements: "you can reduce six
 * points to 3 but you can also split it to 12 or any other corner
 * count" — the multiply/divide duality is symmetric and uncapped in
 * both directions, per spec V6/§9's reversibility rule.
 *
 * The two new vertices get `sourceIds: []` — from this operation's own
 * perspective they are fresh vertices (their identity/history is
 * whatever the caller's chosen ids mean), not a record of "undoing a
 * merge." A split vertex's own inverse is a plain `coalesce()` call on
 * the two new ids (see splitVertex.test.ts) — reversibility here is
 * demonstrated via that composition, not via `separate()`.
 */

import type { Vec3 } from '../polyhedra/core';
import type { RvcmgState, RvcmgVertex } from './types';

export function splitVertex(
  state: RvcmgState,
  vertexId: string,
  newIdA: string,
  newIdB: string,
  posA: Vec3,
  posB: Vec3,
  deformation: (v: Vec3) => Vec3 = (v) => v,
): RvcmgState {
  const idx = state.vertices.findIndex((v) => v.id === vertexId);
  if (idx === -1) throw new Error(`splitVertex: vertex "${vertexId}" not found in state "${state.id}"`);
  if (newIdA === newIdB) throw new Error(`splitVertex: newIdA and newIdB must be distinct ("${newIdA}")`);

  // Same left/right neighbor resolution as separate.ts (including the
  // degenerate "only 1 boundary edge touches this vertex" case, which a
  // 3-vertex triangle's own vertices would hit) — kept in sync with
  // that file's own reasoning rather than duplicated ad hoc.
  const touching = state.boundaryEdges.filter(([i, j]) => i === idx || j === idx);
  let neighborOldForLeft: number;
  let neighborOldForRight: number;
  if (touching.length === 2) {
    const incoming = touching.find(([, j]) => j === idx);
    const outgoing = touching.find(([i]) => i === idx);
    if (!incoming || !outgoing) {
      throw new Error(`splitVertex: "${vertexId}"'s two boundary edges are both incoming or both outgoing — state "${state.id}" isn't a consistently-directed simple loop at this vertex`);
    }
    neighborOldForLeft = incoming[0];
    neighborOldForRight = outgoing[1];
  } else if (touching.length === 1) {
    const [i, j] = touching[0];
    const neighbor = i === idx ? j : i;
    neighborOldForLeft = neighbor;
    neighborOldForRight = neighbor;
  } else {
    throw new Error(`splitVertex: "${vertexId}" touches ${touching.length} boundary edges — expected 1 or 2`);
  }

  const oldToNewIndex = new Map<number, number>();
  const newVertices: RvcmgVertex[] = [];
  let leftNewIdx = -1;
  let rightNewIdx = -1;
  state.vertices.forEach((v, i) => {
    if (i === idx) {
      leftNewIdx = newVertices.length;
      newVertices.push({ id: newIdA, pos: posA, sourceIds: [] });
      rightNewIdx = newVertices.length;
      newVertices.push({ id: newIdB, pos: posB, sourceIds: [] });
      return;
    }
    oldToNewIndex.set(i, newVertices.length);
    newVertices.push({ id: v.id, sourceIds: v.sourceIds, pos: deformation(v.pos) });
  });

  const newEdges: [number, number][] = [];
  for (const [i, j] of state.boundaryEdges) {
    if (i === idx || j === idx) continue;
    newEdges.push([oldToNewIndex.get(i)!, oldToNewIndex.get(j)!]);
  }
  newEdges.push([oldToNewIndex.get(neighborOldForLeft)!, leftNewIdx]);
  newEdges.push([rightNewIdx, oldToNewIndex.get(neighborOldForRight)!]);
  // The new edge created by the split itself — the direct dual of
  // coalesce()'s own Distinct() step, which REMOVES exactly this edge.
  newEdges.push([leftNewIdx, rightNewIdx]);

  return {
    id: `${state.id}->split(${vertexId})`,
    vertices: newVertices,
    boundaryEdges: newEdges,
  };
}

/**
 * RVCMG's reversibility primitive (spec §9, V6): every coalescence must
 * have a geometrically defined inverse. Splits a previously-coalesced
 * vertex back into its two source vertices at caller-supplied positions,
 * restoring the exact pre-merge boundary topology.
 *
 * Scope note (2026-09-15, worth remembering): the full mathematical
 * duality this implements is `coalesce` (division: two adjacent
 * vertices -> one) and `separate` (multiplication: one vertex -> two,
 * at any two positions) as general inverse operations — nothing in the
 * math caps vertex count or requires a vertex to have been a coalesce
 * product before it can be split (6 -> 12 by repeated splitting is as
 * valid as 6 -> 3 by repeated merging). THIS function only implements
 * the narrower "undo a specific `coalesce()` call" case — it requires
 * `sourceIds.length === 2` and refuses anything else. Splitting an
 * ORIGINAL (never-merged) vertex into two new ones — the fully general
 * case — is not yet implemented; see docs/rvcmg-adapter-pieces-spec.md
 * for the full record of this distinction.
 */

import type { Vec3 } from '../polyhedra/core';
import type { RvcmgState, RvcmgVertex } from './types';
import { parseCompoundId } from './types';

export function separate(
  state: RvcmgState,
  coalescedVertexId: string,
  toPositions: [Vec3, Vec3],
  inverseDeformation: (v: Vec3) => Vec3 = (v) => v,
): RvcmgState {
  const idx = state.vertices.findIndex((v) => v.id === coalescedVertexId);
  if (idx === -1) throw new Error(`separate: vertex "${coalescedVertexId}" not found in state "${state.id}"`);
  const target = state.vertices[idx];

  // separate() undoes exactly ONE direct coalescence: coalesce() always
  // records the immediate two parents (never flattened further, see its
  // own comment), so any genuinely coalesced vertex has exactly 2
  // sourceIds regardless of how deep its own history goes — a count
  // other than 2 means this vertex was never coalesced at all (0) or the
  // state is malformed (anything else), not a "deeper merge" case to
  // special-case.
  if (target.sourceIds.length !== 2) {
    throw new Error(
      `separate: "${coalescedVertexId}" has ${target.sourceIds.length} recorded source ids, not 2 — it was never produced by coalesce() (spec §9 requires undoing a real prior coalescence)`,
    );
  }
  const [leftId, rightId] = target.sourceIds;
  const [leftPos, rightPos] = toPositions;

  // The merged vertex's boundary edges tell us which original neighbor
  // reconnects to which half: coalesce() (and the initial state)
  // maintain boundaryEdges in a consistent traversal direction, so an
  // edge ending AT idx ([neighborL, idx]) is the connection that used to
  // arrive at the LEFT half, and an edge starting FROM idx
  // ([idx, neighborR]) is the connection that used to leave from the
  // RIGHT half — mirroring coalesce()'s own left/right convention (see
  // coalesce.ts's own comment on `matchedEdge`).
  //
  // A vertex normally touches exactly 2 DISTINCT boundary edges (one
  // incoming, one outgoing). But separating a 3-vertex triangle down to
  // 2 vertices is a real, valid case where BOTH of the merged vertex's
  // original neighbors are the SAME third vertex — coalesce()'s own
  // Distinct() step correctly dedupes what would otherwise be two
  // parallel edges to that one neighbor down to a single stored edge.
  // Undoing that merge must restore BOTH of those parallel edges (one
  // to each new half), not assume a second, distinct neighbor exists.
  const touching = state.boundaryEdges.filter(([i, j]) => i === idx || j === idx);
  let neighborOldForLeft: number;
  let neighborOldForRight: number;
  if (touching.length === 2) {
    const incoming = touching.find(([, j]) => j === idx);
    const outgoing = touching.find(([i]) => i === idx);
    if (!incoming || !outgoing) {
      throw new Error(
        `separate: "${coalescedVertexId}"'s two boundary edges are both incoming or both outgoing — state "${state.id}" isn't a consistently-directed simple loop at this vertex`,
      );
    }
    neighborOldForLeft = incoming[0];
    neighborOldForRight = outgoing[1];
  } else if (touching.length === 1) {
    const [i, j] = touching[0];
    const neighbor = i === idx ? j : i;
    neighborOldForLeft = neighbor;
    neighborOldForRight = neighbor;
  } else {
    throw new Error(`separate: "${coalescedVertexId}" touches ${touching.length} boundary edges — expected 1 or 2`);
  }

  const oldToNewIndex = new Map<number, number>();
  const newVertices: RvcmgVertex[] = [];
  let leftNewIdx = -1;
  let rightNewIdx = -1;
  state.vertices.forEach((v, i) => {
    if (i === idx) {
      // A restored half's own sourceIds is re-derived by parsing ITS
      // id, not hardcoded to [] — if leftId/rightId is itself a
      // compound id from an earlier merge (e.g. separating a
      // merge-of-a-merge), it must come back with its OWN history
      // intact, not looking like a fresh primitive vertex.
      leftNewIdx = newVertices.length;
      newVertices.push({ id: leftId, pos: leftPos, sourceIds: parseCompoundId(leftId) ?? [] });
      rightNewIdx = newVertices.length;
      newVertices.push({ id: rightId, pos: rightPos, sourceIds: parseCompoundId(rightId) ?? [] });
      return;
    }
    oldToNewIndex.set(i, newVertices.length);
    newVertices.push({ id: v.id, sourceIds: v.sourceIds, pos: inverseDeformation(v.pos) });
  });

  const newEdges: [number, number][] = [];
  for (const [i, j] of state.boundaryEdges) {
    if (i === idx || j === idx) continue; // reconnected explicitly below, using the resolved left/right neighbors
    newEdges.push([oldToNewIndex.get(i)!, oldToNewIndex.get(j)!]);
  }
  newEdges.push([oldToNewIndex.get(neighborOldForLeft)!, leftNewIdx]);
  newEdges.push([rightNewIdx, oldToNewIndex.get(neighborOldForRight)!]);
  // Restore the direct left-right edge Distinct() removed at coalesce time.
  newEdges.push([leftNewIdx, rightNewIdx]);

  return {
    id: `${state.id}->separate(${coalescedVertexId})`,
    vertices: newVertices,
    boundaryEdges: newEdges,
  };
}

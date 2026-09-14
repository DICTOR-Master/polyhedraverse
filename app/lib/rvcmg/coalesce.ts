/**
 * RVCMG's one primitive transformation (spec §3, §4, §16): merge two
 * ADJACENT boundary vertices to a single target position, deform every
 * other vertex by a supplied map, then dedupe. Every higher-level
 * operation (composite paths, the state graph, interpolation) is built
 * from this single primitive — it must never special-case a particular
 * vertex count or a particular pair (V9, spec §10): no `3->4->5->6`
 * ladder anywhere in this file.
 */

import type { Vec3 } from '../polyhedra/core';
import type { RvcmgState, RvcmgVertex } from './types';

export function coalesce(
  state: RvcmgState,
  vertexIdA: string,
  vertexIdB: string,
  targetPos: Vec3,
  deformation: (v: Vec3) => Vec3 = (v) => v, // identity Φ by default
): RvcmgState {
  const idxA = state.vertices.findIndex((v) => v.id === vertexIdA);
  const idxB = state.vertices.findIndex((v) => v.id === vertexIdB);
  if (idxA === -1) throw new Error(`coalesce: vertex "${vertexIdA}" not found in state "${state.id}"`);
  if (idxB === -1) throw new Error(`coalesce: vertex "${vertexIdB}" not found in state "${state.id}"`);
  if (idxA === idxB) throw new Error(`coalesce: "${vertexIdA}" and "${vertexIdB}" are the same vertex`);

  // V2: the single most important guard here — the spec is explicit that
  // non-adjacent coalescence is invalid without an additional
  // transformation this function doesn't perform. Checked against the
  // state's own boundaryEdges, never assumed from array position (a
  // state's vertices are ordered, but boundaryEdges is the actual source
  // of truth for adjacency per spec §6). The matched edge's OWN stored
  // order — not the caller's vertexIdA/vertexIdB argument order — is
  // used below as the canonical "left/right" pairing: boundaryEdges is
  // maintained (by this function and by the initial state) in a
  // consistent traversal direction, so `[left, right]` here always means
  // "left immediately precedes right along the boundary." separate()
  // (Stage 4) depends on this to know which original neighbor
  // reconnects to which half of a split vertex — without it, undoing a
  // coalesce would have no principled way to tell which side is which.
  const matchedEdge = state.boundaryEdges.find(([i, j]) => (i === idxA && j === idxB) || (i === idxB && j === idxA));
  if (!matchedEdge) {
    throw new Error(
      `coalesce: "${vertexIdA}" and "${vertexIdB}" are not adjacent on state "${state.id}" — coalescence requires adjacency (spec V2)`,
    );
  }
  const [leftIdx, rightIdx] = matchedEdge;

  // sourceIds records the IMMEDIATE two parents that merged into this
  // vertex — "which original v1..v6 (OR PRIOR COALESCED IDS) merged
  // into this one" (types.ts's own doc comment, taken literally): always
  // exactly 2 entries, never flattened down to original leaves. This is
  // what makes separate() able to undo a merge at ANY depth, not just a
  // merge of two still-primitive vertices — flattening to leaves (an
  // earlier version of this function did that) loses the intermediate
  // grouping and makes a merge-of-a-merge irreversible. Stored in
  // canonical left-to-right order (see above), regardless of which
  // order the caller passed vertexIdA/vertexIdB in.
  const leftId = state.vertices[leftIdx].id;
  const rightId = state.vertices[rightIdx].id;
  const mergedVertex: RvcmgVertex = {
    // Parenthesized, not a bare concatenation — see types.ts's own
    // `parseCompoundId` comment for why this is unambiguous at any
    // nesting depth and a bare `${leftId}+${rightId}` is not.
    id: `(${leftId}+${rightId})`,
    pos: targetPos, // V3: both merged vertices set to targetPos
    sourceIds: [leftId, rightId],
  };

  // Build the new vertex list in one pass over the ORIGINAL order, so the
  // merged vertex lands exactly where the earlier of the pair sat —
  // preserving the boundary's own cyclic order for everything else.
  // Every vertex NOT part of this merge is transformed only by
  // `deformation` (V5) — never regenerated or otherwise touched.
  const oldToNewIndex = new Map<number, number>();
  const newVertices: RvcmgVertex[] = [];
  state.vertices.forEach((v, i) => {
    if (i === idxA || i === idxB) {
      if (!oldToNewIndex.has(idxA)) {
        oldToNewIndex.set(idxA, newVertices.length);
        oldToNewIndex.set(idxB, newVertices.length);
        newVertices.push(mergedVertex);
      }
      return;
    }
    oldToNewIndex.set(i, newVertices.length);
    newVertices.push({ id: v.id, sourceIds: v.sourceIds, pos: deformation(v.pos) });
  });

  // Distinct(): remap every edge through the merged index, drop the
  // coalesced pair's own edge (both endpoints now the same vertex — a
  // real zero-length edge that must be removed, not left in place), and
  // dedupe any OTHER edge that collapsed onto an already-seen pair —
  // spec's S' = Distinct(Φ(S)) is a general dedup step, not narrowly
  // scoped to just the one merged edge.
  const newEdges: [number, number][] = [];
  const seenEdges = new Set<string>();
  for (const [i, j] of state.boundaryEdges) {
    const ni = oldToNewIndex.get(i)!;
    const nj = oldToNewIndex.get(j)!;
    if (ni === nj) continue; // the merged pair's own now-zero-length edge
    const key = ni < nj ? `${ni}-${nj}` : `${nj}-${ni}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    newEdges.push([ni, nj]);
  }

  return {
    id: `${state.id}->merge(${vertexIdA},${vertexIdB})`,
    vertices: newVertices,
    boundaryEdges: newEdges,
  };
}

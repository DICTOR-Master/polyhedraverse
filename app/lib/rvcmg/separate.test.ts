import { coalesce } from './coalesce';
import { separate } from './separate';
import { statesApproximatelyEqual } from './types';
import { initialState } from './testFixtures';
import type { RvcmgState } from './types';
import type { Vec3 } from '../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const midpointOf = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

/** Every adjacent pair on `state`, as [idA, idB, posA, posB] tuples — derived from the state's own boundaryEdges, never hardcoded. */
function adjacentPairs(state: RvcmgState): { idA: string; idB: string; posA: Vec3; posB: Vec3 }[] {
  return state.boundaryEdges.map(([i, j]) => ({
    idA: state.vertices[i].id,
    idB: state.vertices[j].id,
    posA: state.vertices[i].pos,
    posB: state.vertices[j].pos,
  }));
}

/** spec §25.6, run for every adjacent pair on every principal state (3/4/5/6-vertex), not just one example. */
function checkReversibilityFor(label: string, state: RvcmgState) {
  const beforeIds = new Set(state.vertices.map((v) => v.id));
  for (const { idA, idB, posA, posB } of adjacentPairs(state)) {
    const target = midpointOf(posA, posB);
    const merged = coalesce(state, idA, idB, target);
    // The merged vertex is whichever one is new — robust regardless of
    // naming convention, and correct even when idA/idB are themselves
    // already-compound ids from a prior merge.
    const mergedVertexId = merged.vertices.find((v) => !beforeIds.has(v.id))!.id;
    const back = separate(merged, mergedVertexId, [posA, posB]);
    check(`${label}: separate(coalesce(s, ${idA}, ${idB})) reproduces s`, statesApproximatelyEqual(back, state));
  }
}

const s6 = initialState();
checkReversibilityFor('S_6', s6);

const s5 = coalesce(initialState(), 'v1', 'v2', midpointOf(s6.vertices[0].pos, s6.vertices[1].pos));
checkReversibilityFor('S_5', s5);

const s4 = coalesce(s5, s5.vertices[0].id, 'v3', midpointOf(s5.vertices[0].pos, s5.vertices.find((v) => v.id === 'v3')!.pos));
checkReversibilityFor('S_4', s4);

const s3 = coalesce(s4, s4.vertices[0].id, s4.vertices[1].id, midpointOf(s4.vertices[0].pos, s4.vertices[1].pos));
checkReversibilityFor('S_3', s3);

// separate() undoes exactly ONE step, even on a vertex whose own
// sourceIds are themselves compound ids (e.g. "v1+v2" merged with "v3")
// -- it must land back at the INTERMEDIATE state (a "v1+v2" vertex still
// standing on its own, separate from "v3"), not explode all the way back
// to three individually-separate original vertices in one call. This is
// what sourceIds recording the IMMEDIATE two parents (not flattened
// original leaves) buys: reversibility at any depth, one level at a time.
const nested = coalesce(s5, s5.vertices[0].id, 'v3', [0, 0, 0]); // s5.vertices[0].id is "v1+v2"
const nestedMergedId = nested.vertices.find((v) => !new Set(s5.vertices.map((sv) => sv.id)).has(v.id))!.id;
const nestedBack = separate(nested, nestedMergedId, [s5.vertices[0].pos, s5.vertices.find((v) => v.id === 'v3')!.pos]);
check('separating a merge-of-a-merge lands back on the intermediate state, not fully-original vertices', statesApproximatelyEqual(nestedBack, s5));
const restoredCompound = nestedBack.vertices.find((v) => v.id === '(v1+v2)');
check('the restored vertex is still the compound "(v1+v2)", not exploded into v1 and v2', restoredCompound !== undefined);
check(
  "the restored compound vertex's OWN sourceIds are re-derived correctly (not reset to []), so it could be separated again",
  restoredCompound !== undefined && restoredCompound.sourceIds.length === 2 && restoredCompound.sourceIds.includes('v1') && restoredCompound.sourceIds.includes('v2'),
);

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

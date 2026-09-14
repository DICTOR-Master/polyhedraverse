import { splitVertex } from './splitVertex';
import { coalesce } from './coalesce';
import { statesApproximatelyEqual } from './types';
import { initialState } from './testFixtures';
import { dist, type Vec3 } from '../polyhedra/core';
import type { RvcmgState } from './types';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

/**
 * `coalesce()` always synthesizes a fresh compound id `(a+b)` for the
 * merged vertex — it has no way to know that THIS particular merge is
 * "recombining" a vertex some earlier `splitVertex()` call invented a
 * fresh name for, so the round-tripped state's merged vertex will never
 * literally share the original vertex's id. That's expected, not a
 * bug: `statesApproximatelyEqual` compares by id, so proving
 * "splitVertex then coalesce recovers the same GEOMETRY" needs the
 * merged vertex relabeled back to the id it started as first — the
 * honest claim is geometric recovery, not literal id preservation
 * across an arbitrary caller-chosen split naming (id preservation
 * across a KNOWN prior merge is exactly what separate() is for
 * instead, via sourceIds).
 */
function relabelMergedVertex(state: RvcmgState, mergedId: string, originalId: string): RvcmgState {
  return { ...state, vertices: state.vertices.map((v) => (v.id === mergedId ? { ...v, id: originalId } : v)) };
}

const s6 = initialState();
const v1 = s6.vertices.find((v) => v.id === 'v1')!;

// --- Splitting an ORIGINAL (never-coalesced) vertex works — separate() cannot do this ---
const posA: Vec3 = [v1.pos[0] + 0.05, v1.pos[1], v1.pos[2]];
const posB: Vec3 = [v1.pos[0] - 0.05, v1.pos[1], v1.pos[2]];
const s7 = splitVertex(s6, 'v1', 'v1a', 'v1b', posA, posB);
check('splitting a never-merged original vertex yields a 7-vertex state', s7.vertices.length === 7);
check('the two new vertices carry the exact requested ids and positions', dist(s7.vertices.find((v) => v.id === 'v1a')!.pos, posA) === 0 && dist(s7.vertices.find((v) => v.id === 'v1b')!.pos, posB) === 0);
check('the two new vertices have sourceIds: [] (fresh, not a coalesce record)', s7.vertices.find((v) => v.id === 'v1a')!.sourceIds.length === 0);
check('v1 itself no longer exists as a vertex', !s7.vertices.some((v) => v.id === 'v1'));

// --- The dual of coalesce()'s Distinct() removal: a real new edge connects the two split halves ---
const idxA = s7.vertices.findIndex((v) => v.id === 'v1a');
const idxB = s7.vertices.findIndex((v) => v.id === 'v1b');
check('a real edge connects the two new vertices', s7.boundaryEdges.some(([i, j]) => (i === idxA && j === idxB) || (i === idxB && j === idxA)));
check('the split state has one more boundary edge than the original (7 edges vs 6)', s7.boundaryEdges.length === 7 && s6.boundaryEdges.length === 6);

// --- Multiply then divide = identity: coalesce(splitVertex(s)) reproduces s exactly (up to relabeling the recombined vertex) ---
const back = coalesce(s7, 'v1a', 'v1b', v1.pos);
check('coalescing the two split halves back at v1\'s original position reproduces s6 exactly', statesApproximatelyEqual(relabelMergedVertex(back, '(v1a+v1b)', 'v1'), s6));

// --- Works for every vertex on every principal state (3/4/5/6-vertex), not just one hand-picked example ---
function checkSplitReversibilityFor(label: string, state: RvcmgState) {
  for (const v of state.vertices) {
    const p1: Vec3 = [v.pos[0] + 0.01, v.pos[1] + 0.01, v.pos[2]];
    const p2: Vec3 = [v.pos[0] - 0.01, v.pos[1] - 0.01, v.pos[2]];
    const split = splitVertex(state, v.id, `${v.id}-a`, `${v.id}-b`, p1, p2);
    const merged = coalesce(split, `${v.id}-a`, `${v.id}-b`, v.pos);
    const relabeled = relabelMergedVertex(merged, `(${v.id}-a+${v.id}-b)`, v.id);
    check(`${label}: coalesce(splitVertex(s, ${v.id})) reproduces s`, statesApproximatelyEqual(relabeled, state));
  }
}
checkSplitReversibilityFor('S_6', s6);

const s5 = coalesce(initialState(), 'v1', 'v2', [0, 0, 0]);
checkSplitReversibilityFor('S_5', s5);

const s4 = coalesce(s5, s5.vertices[0].id, 'v3', [0, 0, 0]);
checkSplitReversibilityFor('S_4', s4);

const s3 = coalesce(s4, s4.vertices[0].id, s4.vertices[1].id, [0, 0, 0]);
checkSplitReversibilityFor('S_3', s3);

// --- Splitting a vertex that IS itself a coalesce product also works (generalizes beyond separate()'s own scope) ---
const compoundVertex = s5.vertices.find((v) => v.sourceIds.length === 2)!;
const splitCompound = splitVertex(s5, compoundVertex.id, 'x', 'y', [compoundVertex.pos[0] + 0.01, compoundVertex.pos[1], compoundVertex.pos[2]], [compoundVertex.pos[0] - 0.01, compoundVertex.pos[1], compoundVertex.pos[2]]);
check('splitting a compound (already-coalesced) vertex works too — a genuine generalization beyond separate()', splitCompound.vertices.length === 6 && splitCompound.vertices.some((v) => v.id === 'x') && splitCompound.vertices.some((v) => v.id === 'y'));
const mergedBack = coalesce(splitCompound, 'x', 'y', compoundVertex.pos);
check('and reversibility still holds for that case', statesApproximatelyEqual(relabelMergedVertex(mergedBack, '(x+y)', compoundVertex.id), s5));

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

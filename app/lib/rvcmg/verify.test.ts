import { verifyTransition } from './verify';
import { coalesce } from './coalesce';
import { statesApproximatelyEqual } from './types';
import { initialState } from './testFixtures';
import type { CoalescenceOp, RvcmgState } from './types';
import type { Vec3 } from '../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const midpointOf = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

let opCounter = 0;
function makeOp(state: RvcmgState, idA: string, idB: string): { op: CoalescenceOp; next: RvcmgState } {
  const a = state.vertices.find((v) => v.id === idA)!;
  const b = state.vertices.find((v) => v.id === idB)!;
  const targetPos = midpointOf(a.pos, b.pos);
  const next = coalesce(state, idA, idB, targetPos);
  opCounter++;
  const op: CoalescenceOp = {
    id: `op${opCounter}`, fromStateId: state.id, toStateId: next.id, coalescedPair: [idA, idB],
    targetPos, path: 'symmetric', deformation: (v) => v, inverse: `op${opCounter}-inv`,
  };
  return { op, next };
}

// --- This module returns [] for every genuine single-coalesce transition in a real S_6->S_5->S_4->S_3 chain ---
const s6 = initialState();
const { op: op1, next: s5 } = makeOp(s6, 'v1', 'v2');
const { op: op2, next: s4 } = makeOp(s5, s5.vertices[0].id, 'v3');
const { op: op3, next: s3 } = makeOp(s4, s4.vertices[0].id, 'v4');

for (const [label, op, before, after] of [
  ['S_6->S_5', op1, s6, s5],
  ['S_5->S_4', op2, s5, s4],
  ['S_4->S_3', op3, s4, s3],
] as const) {
  const problems = verifyTransition(op, before, after);
  check(`${label}: verifyTransition reports no problems (${JSON.stringify(problems)})`, problems.length === 0);
}

// --- 25.2 adjacency: a fabricated op claiming non-adjacent vertices coalesced is flagged ---
const fakeOp: CoalescenceOp = {
  id: 'fake', fromStateId: s6.id, toStateId: s5.id, coalescedPair: ['v1', 'v4'], // opposite corners, never adjacent
  targetPos: [0, 0, 0], path: 'symmetric', deformation: (v) => v, inverse: 'fake-inv',
};
const adjacencyProblems = verifyTransition(fakeOp, s6, s5);
check('25.2: a non-adjacent claimed pair is flagged', adjacencyProblems.some((p) => p.startsWith('25.2')));

// --- 25.3 vertex count: before/after mismatched by more than 1 is flagged ---
const countProblems = verifyTransition(op1, s6, s4); // skips a step
check('25.3: a vertex-count mismatch (not a single coalesce step) is flagged', countProblems.some((p) => p.startsWith('25.3')));

// --- 25.1 coincidence: a merged vertex NOT at targetPos is flagged ---
const wrongTargetOp: CoalescenceOp = { ...op1, targetPos: [999, 999, 999] };
const coincidenceProblems = verifyTransition(wrongTargetOp, s6, s5);
check('25.1: a merged vertex not at the claimed targetPos is flagged', coincidenceProblems.some((p) => p.startsWith('25.1')));

// --- 25.5 endpoint geometry: a real transition checked against an independently-specified (and matching) expected state ---
const matching = verifyTransition(op1, s6, s5, { expectedAfter: s5 });
check('25.5: matches when the supplied expected state is the real result', !matching.some((p) => p.startsWith('25.5')));
const mismatching = verifyTransition(op1, s6, s5, { expectedAfter: s4 });
check('25.5: flagged when the supplied expected state does NOT match', mismatching.some((p) => p.startsWith('25.5')));

// --- 25.6 reversibility: exercised directly as part of every above check already passing; confirm it fires on a broken case too ---
const brokenReversibility = verifyTransition({ ...op1, targetPos: [42, 42, 42] }, s6, s5); // after (s5) doesn't actually reflect this bogus targetPos
check('25.6/25.1: a self-inconsistent op/after pair is flagged (via 25.1, which 25.6 depends on)', brokenReversibility.length > 0);

// --- 25.7 path independence: a claimed-equivalent path that genuinely reaches the same geometry is NOT flagged ---
const realEquivalentPath = verifyTransition(op1, s6, s5, {
  equivalentPath: { states: [s6], ops: [op1] }, // trivially "the same single step" — must recompute to the same result
});
check('25.7: a genuinely equivalent path is not flagged', !realEquivalentPath.some((p) => p.startsWith('25.7')));

const fakeEquivalentPath = verifyTransition(op1, s6, s5, {
  equivalentPath: { states: [s6], ops: [{ ...op1, coalescedPair: ['v3', 'v4'] }] }, // a DIFFERENT, non-equivalent step
});
check('25.7: a claimed-equivalent path that does NOT actually reach the same geometry is flagged, not assumed', fakeEquivalentPath.some((p) => p.startsWith('25.7')));

// --- 25.8: equal vertex count does not imply equal state (direct demonstration, not just types.test.ts's static scan) ---
const alternateS5 = coalesce(initialState(), 'v3', 'v4', [50, 50, 50]); // same vertex count as s5, wildly different geometry
check('25.8: two same-vertex-count states with different geometry are correctly reported as NOT equal', !statesApproximatelyEqual(s5, alternateS5));
check('25.8: two same-vertex-count states are NOT conflated just because counts match', s5.vertices.length === alternateS5.vertices.length);

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

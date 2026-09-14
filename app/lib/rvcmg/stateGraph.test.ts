import { coalesce } from './coalesce';
import { createStateGraph, addState, addTransition, findPath, isComposite } from './stateGraph';
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
/** Real coalesce() call + a matching CoalescenceOp record, registered on `graph` in one step. */
function coalesceAndRegister(graph: ReturnType<typeof createStateGraph>, state: RvcmgState, idA: string, idB: string): RvcmgState {
  const a = state.vertices.find((v) => v.id === idA)!;
  const b = state.vertices.find((v) => v.id === idB)!;
  const target = midpointOf(a.pos, b.pos);
  const next = coalesce(state, idA, idB, target);
  addState(graph, next);
  opCounter++;
  const op: CoalescenceOp = {
    id: `op${opCounter}`,
    fromStateId: state.id,
    toStateId: next.id,
    coalescedPair: [idA, idB],
    targetPos: target,
    path: 'symmetric',
    deformation: (v) => v,
    inverse: `op${opCounter}-inv`,
  };
  addTransition(graph, op);
  return next;
}

// --- Building the graph for S_3, S_4, S_5, S_6 with the known adjacent coalescences produces a connected graph ---
const graph = createStateGraph();
const s6 = initialState();
addState(graph, s6);
const s5 = coalesceAndRegister(graph, s6, 'v1', 'v2');
const s4 = coalesceAndRegister(graph, s5, s5.vertices[0].id, 'v3');
const s3 = coalesceAndRegister(graph, s4, s4.vertices[0].id, 'v4');

check('graph has 4 states after 3 real coalescences (S_6, S_5, S_4, S_3)', graph.states.size === 4);
check('graph has 6 edges (3 forward ops + 3 auto-registered inverses, spec §19)', graph.edges.length === 6);

const pathDown = findPath(graph, s6.id, s3.id);
check('findPath finds a real path from S_6 down to S_3', pathDown !== null && pathDown.length === 3);
check('graph is connected: S_6 -> S_3 path exists', pathDown !== null);

const pathUp = findPath(graph, s3.id, s6.id);
check('findPath also finds the reverse path (undirected graph, spec §19)', pathUp !== null && pathUp.length === 3);

// --- findPath returns null for genuinely disconnected states ---
const orphan = initialState();
orphan.id = 'orphan-state';
addState(graph, orphan);
const pathToOrphan = findPath(graph, s6.id, orphan.id);
check('findPath returns null for a genuinely disconnected state', pathToOrphan === null);

// --- Explicit skip-transition (S_5 <-> S_3 without visiting S_4) as a first-class edge, not a derived shortcut ---
opCounter++;
const skipOp: CoalescenceOp = {
  id: `op${opCounter}-skip`,
  fromStateId: s5.id,
  toStateId: s3.id,
  coalescedPair: [s5.vertices[0].id, s5.vertices.find((v) => v.id === 'v3')!.id],
  targetPos: [0, 0, 0],
  path: 'one-sided',
  deformation: (v) => v,
  inverse: `op${opCounter}-skip-inv`,
};
addTransition(graph, skipOp);
const directSkipPath = findPath(graph, s5.id, s3.id);
check('a direct S_5<->S_3 skip edge is usable as a first-class graph edge', directSkipPath !== null && directSkipPath.length === 1);
check('the skip edge is NOT a composite path (single hop)', directSkipPath !== null && !isComposite(directSkipPath));
check('the composite S_6->S_5->S_4->S_3 path IS composite', isComposite(pathDown!));

// --- The graph is NOT a linear chain: at least one edge connects vertex counts that aren't numerically adjacent ---
const vertexCountOf = (stateId: string): number => graph.states.get(stateId)!.vertices.length;
const hasNonAdjacentCountEdge = graph.edges.some((e) => Math.abs(vertexCountOf(e.fromStateId) - vertexCountOf(e.toStateId)) > 1);
check('graph has at least one edge between non-numerically-adjacent vertex counts (not a pure ladder)', hasNonAdjacentCountEdge);

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

import { interpolate, classifyState } from './morph';
import { initialState } from './testFixtures';
import { dist } from '../polyhedra/core';
import type { CoalescenceOp } from './types';
import type { Vec3 } from '../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const s6 = initialState();
const v1 = s6.vertices.find((v) => v.id === 'v1')!;
const v2 = s6.vertices.find((v) => v.id === 'v2')!;
const midpoint: Vec3 = [(v1.pos[0] + v2.pos[0]) / 2, (v1.pos[1] + v2.pos[1]) / 2, (v1.pos[2] + v2.pos[2]) / 2];

const symmetricOp: CoalescenceOp = {
  id: 'op1', fromStateId: s6.id, toStateId: 's5', coalescedPair: ['v1', 'v2'], targetPos: midpoint,
  path: 'symmetric', deformation: (v) => v, inverse: 'op1-inv',
};
const oneSidedOp: CoalescenceOp = {
  id: 'op2', fromStateId: s6.id, toStateId: 's5', coalescedPair: ['v1', 'v2'], targetPos: v1.pos, // one-sided: v1 fixed, v2 travels all the way to v1's own position
  path: 'one-sided', deformation: (v) => v, inverse: 'op2-inv',
};

// --- t=0 reproduces the source state exactly ---
const [a0, b0] = interpolate(s6, symmetricOp, 0);
check('t=0 reproduces vertex A exactly', dist(a0.pos, v1.pos) === 0);
check('t=0 reproduces vertex B exactly', dist(b0.pos, v2.pos) === 0);

// --- t=1 reproduces the coalesced state exactly ---
const [a1, b1] = interpolate(s6, symmetricOp, 1);
check('t=1: symmetric — vertex A reaches the target exactly', dist(a1.pos, midpoint) === 0);
check('t=1: symmetric — vertex B reaches the target exactly', dist(b1.pos, midpoint) === 0);
const [a1os, b1os] = interpolate(s6, oneSidedOp, 1);
check('t=1: one-sided — vertex B reaches the (fixed) target exactly', dist(b1os.pos, v1.pos) === 0);
check('t=1: one-sided — vertex A (fixed) is still at the target exactly', dist(a1os.pos, v1.pos) === 0);

// --- at t<1 the two vertices remain genuinely distinct, even near t=1 ---
const [aNear, bNear] = interpolate(s6, symmetricOp, 0.999999);
check('at t<1 (even very close to 1) the two vertices are NOT coincident', dist(aNear.pos, bNear.pos) > 0);
check('classifyState at t<1 still reports 2 distinct vertices at a small tolerance', classifyState([aNear, bNear], 1e-9) === 2);
check('classifyState at t=1 correctly reports 1 (exact coincidence)', classifyState([a1, b1], 1e-9) === 1);

// --- symmetric vs one-sided on the same pair produce different geometry at a mid-t sample ---
const [aMidSym] = interpolate(s6, symmetricOp, 0.5);
const [aMidOneSided] = interpolate(s6, oneSidedOp, 0.5);
check('symmetric moves vertex A partway toward the target', dist(aMidSym.pos, v1.pos) > 1e-9);
check('one-sided keeps vertex A fixed (does not move at all)', dist(aMidOneSided.pos, v1.pos) === 0);
check('symmetric and one-sided produce genuinely different geometry at the same t', dist(aMidSym.pos, aMidOneSided.pos) > 1e-9);

// --- out-of-range t throws ---
let threw = false;
try {
  interpolate(s6, symmetricOp, 1.5);
} catch {
  threw = true;
}
check('t outside [0,1] throws', threw);

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

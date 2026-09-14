import { coalesce } from './coalesce';
import { initialState } from './testFixtures';
import { dist } from '../polyhedra/core';
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

// --- Coalescing an adjacent pair on S_6 yields a 5-vertex state ---
const s5 = coalesce(s6, 'v1', 'v2', midpoint);
check('coalescing an adjacent pair yields a 5-vertex state', s5.vertices.length === 5);
check('coalescing an adjacent pair yields 5 boundary edges (still a closed loop)', s5.boundaryEdges.length === 5);
check('the merged vertex sits at the exact target position (V3)', dist(s5.vertices.find((v) => v.id === '(v1+v2)')!.pos, midpoint) < 1e-12);
check('the merged vertex tracks both original ids (sourceIds)', new Set(s5.vertices.find((v) => v.id === '(v1+v2)')!.sourceIds).size === 2 && s5.vertices.find((v) => v.id === '(v1+v2)')!.sourceIds.includes('v1') && s5.vertices.find((v) => v.id === '(v1+v2)')!.sourceIds.includes('v2'));

// --- Coalescing a non-adjacent pair throws ---
let threw = false;
try {
  coalesce(s6, 'v1', 'v4', midpoint); // v1/v4 are opposite corners of the hexagon, never adjacent
} catch {
  threw = true;
}
check('coalescing a non-adjacent pair throws (spec V2)', threw);

// --- The zero-length edge is actually removed, not just left at length 0 ---
const hasZeroLengthEdge = s5.boundaryEdges.some(([i, j]) => dist(s5.vertices[i].pos, s5.vertices[j].pos) < 1e-9);
check('no zero-length edge remains after coalescence (Distinct(), V4)', !hasZeroLengthEdge);
check('no edge references the pre-merge vertex ids v1 or v2 directly (both replaced by v1+v2)', !s5.vertices.some((v) => v.id === 'v1' || v.id === 'v2'));

// --- Vertices untouched by the operation are transformed only by deformation, byte-for-byte reproducible ---
const s6b = initialState();
const s5identity = coalesce(s6b, 'v1', 'v2', midpoint); // default identity deformation
const v3Before = s6b.vertices.find((v) => v.id === 'v3')!.pos;
const v3After = s5identity.vertices.find((v) => v.id === 'v3')!.pos;
check('untouched vertex is byte-for-byte reproduced under identity deformation', v3Before[0] === v3After[0] && v3Before[1] === v3After[1] && v3Before[2] === v3After[2]);

const doubled = (v: Vec3): Vec3 => [v[0] * 2, v[1] * 2, v[2] * 2];
const s5doubled = coalesce(initialState(), 'v1', 'v2', midpoint, doubled);
const v3Doubled = s5doubled.vertices.find((v) => v.id === 'v3')!.pos;
check(
  'a real (non-identity) deformation is applied exactly to untouched vertices',
  Math.abs(v3Doubled[0] - v3Before[0] * 2) < 1e-12 && Math.abs(v3Doubled[1] - v3Before[1] * 2) < 1e-12 && Math.abs(v3Doubled[2] - v3Before[2] * 2) < 1e-12,
);

// --- V9: coalesce must not hardcode a specific pair or ladder — exercise a different adjacent pair on the SAME 6-vertex state ---
const s5other = coalesce(initialState(), 'v4', 'v5', [0, 0, 0]);
check('coalesce works on a different adjacent pair on the same state (no hardcoded pair, V9)', s5other.vertices.length === 5 && s5other.vertices.some((v) => v.id === '(v4+v5)'));

// --- Works on a non-6-vertex state too (no hardcoded vertex count, V9) ---
const s4 = coalesce(coalesce(initialState(), 'v1', 'v2', midpoint), 'v3', 'v4', [0, 0, 0]);
check('coalesce works starting from a 5-vertex state too (no hardcoded ladder, V9)', s4.vertices.length === 4);

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

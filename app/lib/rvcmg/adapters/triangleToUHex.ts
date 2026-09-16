/**
 * RVCMG v2 — Triangle-to-U-Hex: the new universal hex interface
 * (`universalHexInterface.ts`) collapsed to a real equilateral triangle
 * of edge 1, matching a unit-edge tetrahedron/octahedron face. Direct
 * v2 counterpart of `triangleToRdH.ts` — same pipeline (derive a real
 * target polygon -> coalesce() sequence -> Stage 7 verification), same
 * 3-merge alternate-edge matching, but starting from the new small
 * regular hex instead of RD's own D2h-symmetric native one.
 */

import { dist, type Vec3 } from '../../polyhedra/core';
import { UNIVERSAL_HEX_INTERFACE, universalHexInterfaceFrame } from '../universalHexInterface';
import { coalesce } from '../coalesce';
import { verifyTransition } from '../verify';
import { assignTargetAngles } from './shared';
import type { RvcmgState, CoalescenceOp } from '../types';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The starting 6-vertex state for every v2 adapter piece, built directly from `UNIVERSAL_HEX_INTERFACE`. */
export function uHexStartState(): RvcmgState {
  const n = UNIVERSAL_HEX_INTERFACE.length;
  return {
    id: 'UNIVERSAL_HEX',
    vertices: UNIVERSAL_HEX_INTERFACE.map((pos, i) => ({ id: `v${i + 1}`, pos, sourceIds: [] })),
    boundaryEdges: Array.from({ length: n }, (_, i) => [i, (i + 1) % n] as [number, number]),
  };
}

export interface AdapterPieceResult {
  states: RvcmgState[]; // [start, ...intermediate, final]
  ops: CoalescenceOp[];
  problems: string[]; // Stage 7 verifyTransition problems across every step, plus final-shape checks; [] = fully valid
}

/**
 * Derives the Triangle-to-U-Hex piece: 3 coalesce() steps merging
 * alternate edges of the hexagon — (v1,v2), (v3,v4), (v5,v6) — the same
 * perfect matching triangleToRdH.ts uses (order-independent since
 * merging one pair never disturbs the others' adjacency).
 */
export function deriveTriangleToUHex(): AdapterPieceResult {
  const s6 = uHexStartState();
  const { centroid, u, w } = universalHexInterfaceFrame();

  const angleOf = (p: Vec3): number => {
    const d = sub(p, centroid);
    return Math.atan2(dot(d, w), dot(d, u));
  };

  const pairs: [string, string][] = [
    ['v1', 'v2'],
    ['v3', 'v4'],
    ['v5', 'v6'],
  ];
  const pairAngles = pairs.map(([idA, idB]) => {
    const a = s6.vertices.find((v) => v.id === idA)!.pos;
    const b = s6.vertices.find((v) => v.id === idB)!.pos;
    return (angleOf(a) + angleOf(b)) / 2;
  });
  const targetAngles = assignTargetAngles(pairAngles);

  const EDGE = 1; // unit edge, matching the unit-edge tetrahedron/octahedron
  const circumradius = EDGE / Math.sqrt(3);
  const targetFor = (pairIndex: number): Vec3 => {
    const theta = targetAngles[pairIndex];
    return add(centroid, add(scale(u, circumradius * Math.cos(theta)), scale(w, circumradius * Math.sin(theta))));
  };

  const states: RvcmgState[] = [s6];
  const ops: CoalescenceOp[] = [];
  let current = s6;
  pairs.forEach(([idA, idB], pairIndex) => {
    const targetPos = targetFor(pairIndex);
    const next = coalesce(current, idA, idB, targetPos);
    ops.push({
      id: `triangle-to-uhex-step${pairIndex + 1}`,
      fromStateId: current.id,
      toStateId: next.id,
      coalescedPair: [idA, idB],
      targetPos,
      path: 'symmetric',
      deformation: (v) => v,
      inverse: `triangle-to-uhex-step${pairIndex + 1}-inv`,
    });
    states.push(next);
    current = next;
  });

  const problems: string[] = [];
  for (let i = 0; i < ops.length; i++) {
    problems.push(...verifyTransition(ops[i], states[i], states[i + 1]).map((p) => `step${i + 1}: ${p}`));
  }

  const final = states[states.length - 1];
  if (final.vertices.length !== 3) {
    problems.push(`final state has ${final.vertices.length} vertices, expected 3`);
  } else {
    const edgeLens = final.vertices.map((v, i) => dist(v.pos, final.vertices[(i + 1) % 3].pos));
    edgeLens.forEach((len, i) => {
      if (Math.abs(len - EDGE) > 1e-9) problems.push(`final triangle edge ${i} has length ${len.toFixed(9)}, expected ${EDGE}`);
    });
  }

  return { states, ops, problems };
}

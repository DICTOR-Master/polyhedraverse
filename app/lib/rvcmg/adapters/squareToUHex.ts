/**
 * RVCMG v2 — Square-to-U-Hex: the new universal hex interface
 * (`universalHexInterface.ts`) collapsed to a real unit square, matching
 * a unit-edge cube face. Same 2-merge structure as v1's `squareToRdH.ts`
 * (6 -> 5 -> 4, `v1`/`v4` untouched by any single `coalesce()` call,
 * repositioned via the second merge's own deformation).
 *
 * Dropped entirely from v1: the "rotate so the hex's own longest edges
 * land parallel to the square's sides" alignment hack. That existed
 * only because RD's native hex had distinguishable long/short (D2h)
 * edges to align to — the new universal hex has full 6-fold symmetry,
 * so every edge is identical and there is nothing to align. This piece
 * just uses `assignTargetAngles`'s own default least-twist phase
 * directly, unmodified.
 */

import { dist, type Vec3 } from '../../polyhedra/core';
import { universalHexInterfaceFrame } from '../universalHexInterface';
import { coalesce } from '../coalesce';
import { verifyTransition } from '../verify';
import { uHexStartState } from './triangleToUHex';
import { assignTargetAngles } from './shared';
import type { RvcmgState, CoalescenceOp } from '../types';
import type { AdapterPieceResult } from './triangleToUHex';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function deriveSquareToUHex(): AdapterPieceResult {
  const s6 = uHexStartState();
  const { centroid, u, w } = universalHexInterfaceFrame();

  const angleOf = (p: Vec3): number => {
    const d = sub(p, centroid);
    return Math.atan2(dot(d, w), dot(d, u));
  };
  const posOf = (state: RvcmgState, id: string): Vec3 => state.vertices.find((v) => v.id === id)!.pos;

  const v1 = posOf(s6, 'v1');
  const v4 = posOf(s6, 'v4');
  const v4IsMinusV1 = dist(v4, scale(v1, -1)) < 1e-9;
  if (!v4IsMinusV1) {
    throw new Error('deriveSquareToUHex: v1/v4 are not an exact central-symmetry pair — the new hex is built directly as a regular hexagon, so this should hold trivially');
  }

  type Group = { kind: 'single'; id: string } | { kind: 'pair'; idA: string; idB: string };
  const groups: Group[] = [
    { kind: 'single', id: 'v1' },
    { kind: 'pair', idA: 'v2', idB: 'v3' },
    { kind: 'single', id: 'v4' },
    { kind: 'pair', idA: 'v5', idB: 'v6' },
  ];
  const groupAngle = (g: Group): number => {
    if (g.kind === 'single') return angleOf(posOf(s6, g.id));
    const a = angleOf(posOf(s6, g.idA));
    const b = angleOf(posOf(s6, g.idB));
    return (a + b) / 2;
  };
  const targetAngles = assignTargetAngles(groups.map(groupAngle));

  const EDGE = 1; // unit edge, matching a unit-edge cube face
  const circumradius = EDGE / Math.sqrt(2);
  const targetFor = (groupIndex: number): Vec3 => {
    const theta = targetAngles[groupIndex];
    return add(centroid, add(scale(u, circumradius * Math.cos(theta)), scale(w, circumradius * Math.sin(theta))));
  };
  const targetV1 = targetFor(0);
  const targetM1 = targetFor(1);
  const targetV4 = targetFor(2);
  const targetM2 = targetFor(3);

  const states: RvcmgState[] = [s6];
  const ops: CoalescenceOp[] = [];

  const s5 = coalesce(s6, 'v2', 'v3', targetM1);
  ops.push({
    id: 'square-to-uhex-step1', fromStateId: s6.id, toStateId: s5.id, coalescedPair: ['v2', 'v3'],
    targetPos: targetM1, path: 'symmetric', deformation: (v) => v, inverse: 'square-to-uhex-step1-inv',
  });
  states.push(s5);

  const TOL = 1e-9;
  const step2Deformation = (p: Vec3): Vec3 => {
    if (dist(p, v1) < TOL) return targetV1;
    if (dist(p, v4) < TOL) return targetV4;
    if (dist(p, targetM1) < TOL) return p;
    throw new Error(`deriveSquareToUHex: step2 deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const step2InverseDeformation = (p: Vec3): Vec3 => {
    if (dist(p, targetV1) < TOL) return v1;
    if (dist(p, targetV4) < TOL) return v4;
    if (dist(p, targetM1) < TOL) return p;
    throw new Error(`deriveSquareToUHex: step2 inverse deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const s4 = coalesce(s5, 'v5', 'v6', targetM2, step2Deformation);
  ops.push({
    id: 'square-to-uhex-step2', fromStateId: s5.id, toStateId: s4.id, coalescedPair: ['v5', 'v6'],
    targetPos: targetM2, path: 'symmetric', deformation: step2Deformation, inverse: 'square-to-uhex-step2-inv',
  });
  states.push(s4);

  const problems: string[] = [];
  const inverseDeformations = [(v: Vec3) => v, step2InverseDeformation];
  for (let i = 0; i < ops.length; i++) {
    problems.push(...verifyTransition(ops[i], states[i], states[i + 1], { inverseDeformation: inverseDeformations[i] }).map((p) => `step${i + 1}: ${p}`));
  }

  const final = states[states.length - 1];
  if (final.vertices.length !== 4) {
    problems.push(`final state has ${final.vertices.length} vertices, expected 4`);
  } else {
    const edgeLens = final.vertices.map((v, i) => dist(v.pos, final.vertices[(i + 1) % 4].pos));
    edgeLens.forEach((len, i) => {
      if (Math.abs(len - EDGE) > 1e-9) problems.push(`final square edge ${i} has length ${len.toFixed(9)}, expected ${EDGE}`);
    });
    const e1 = sub(final.vertices[1].pos, final.vertices[0].pos);
    const e2 = sub(final.vertices[3].pos, final.vertices[0].pos);
    const cosAngle = dot(e1, e2) / (Math.hypot(...e1) * Math.hypot(...e2));
    if (Math.abs(cosAngle) > 1e-9) problems.push(`final quadrilateral's corner angle is not 90° (cos=${cosAngle.toFixed(9)}) — a rhombus, not a real square`);
  }

  return { states, ops, problems };
}

/**
 * RVCMG v2 — Regular-Hexagon-to-U-Hex: the new universal hex interface
 * reshaped to a genuine unit-edge (circumradius 1) regular hexagon,
 * matching any unit-edge Archimedean solid with real regular hexagonal
 * faces. Direct port of v1's `regularHexToRdH.ts` — same coalesce+
 * splitVertex composite (RVCMG has no single primitive for "reshape
 * without changing vertex count").
 *
 * A genuinely simpler case than v1's version: v1's SOURCE hex was
 * non-regular (D2h, 2 long + 4 short edges), so that piece was a real
 * asymmetric reshape. This piece's source (the universal hex) is
 * ALREADY a regular hexagon — just at circumradius sqrt(2)/2 instead of
 * 1 — so this is close to a uniform radial dilation, not a symmetry
 * correction. Still routed through the same composite as v1 for
 * consistency (and so the existing reversibility machinery applies
 * unchanged), rather than special-cased into a bare scale multiply.
 */

import { dist, type Vec3 } from '../../polyhedra/core';
import { universalHexInterfaceFrame } from '../universalHexInterface';
import { coalesce } from '../coalesce';
import { separate } from '../separate';
import { splitVertex } from '../splitVertex';
import { verifyTransition } from '../verify';
import { statesApproximatelyEqual } from '../types';
import { uHexStartState } from './triangleToUHex';
import { assignTargetAngles } from './shared';
import type { RvcmgState, CoalescenceOp } from '../types';
import type { AdapterPieceResult } from './triangleToUHex';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function deriveRegularHexToUHex(): AdapterPieceResult {
  const s6 = uHexStartState();
  const { centroid, u, w } = universalHexInterfaceFrame();

  const angleOf = (p: Vec3): number => {
    const d = sub(p, centroid);
    return Math.atan2(dot(d, w), dot(d, u));
  };
  const posOf = (state: RvcmgState, id: string): Vec3 => state.vertices.find((v) => v.id === id)!.pos;

  const ids = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'];
  const positions = ids.map((id) => posOf(s6, id));
  const targetAngles = assignTargetAngles(positions.map(angleOf));

  const EDGE = 1; // unit edge -- a real regular hexagon, matching any unit-edge hexagon-faced Archimedean solid
  const circumradius = EDGE; // a regular hexagon's own edge length equals its circumradius exactly
  const targetFor = (i: number): Vec3 => add(centroid, add(scale(u, circumradius * Math.cos(targetAngles[i])), scale(w, circumradius * Math.sin(targetAngles[i]))));
  const targets = ids.map((_, i) => targetFor(i));
  const [targetV1, targetV2, targetV3, targetV4, targetV5, targetV6] = targets;

  const v3 = posOf(s6, 'v3');
  const v4 = posOf(s6, 'v4');
  const v5 = posOf(s6, 'v5');
  const v6 = posOf(s6, 'v6');
  const TOL = 1e-9;

  const transientM = scale(add(targetV1, targetV2), 0.5);
  const step1Deformation = (p: Vec3): Vec3 => {
    if (dist(p, v3) < TOL) return targetV3;
    if (dist(p, v4) < TOL) return targetV4;
    if (dist(p, v5) < TOL) return targetV5;
    if (dist(p, v6) < TOL) return targetV6;
    throw new Error(`deriveRegularHexToUHex: step1 deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const step1InverseDeformation = (p: Vec3): Vec3 => {
    if (dist(p, targetV3) < TOL) return v3;
    if (dist(p, targetV4) < TOL) return v4;
    if (dist(p, targetV5) < TOL) return v5;
    if (dist(p, targetV6) < TOL) return v6;
    throw new Error(`deriveRegularHexToUHex: step1 inverse deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const s5 = coalesce(s6, 'v1', 'v2', transientM, step1Deformation);
  const op1: CoalescenceOp = {
    id: 'regular-hex-to-uhex-step1', fromStateId: s6.id, toStateId: s5.id, coalescedPair: ['v1', 'v2'],
    targetPos: transientM, path: 'symmetric', deformation: step1Deformation, inverse: 'regular-hex-to-uhex-step1-inv',
  };

  const problems: string[] = verifyTransition(op1, s6, s5, { inverseDeformation: step1InverseDeformation }).map((p) => `step1: ${p}`);

  const mergedId = s5.vertices.find((v) => v.sourceIds.length === 2)!.id;
  const s6Regular = splitVertex(s5, mergedId, 'v1r', 'v2r', targetV1, targetV2);

  if (s6Regular.vertices.length !== 6) {
    problems.push(`final state has ${s6Regular.vertices.length} vertices, expected 6`);
  } else {
    const n = 6;
    const edgeLens = s6Regular.vertices.map((v, i) => dist(v.pos, s6Regular.vertices[(i + 1) % n].pos));
    edgeLens.forEach((len, i) => {
      if (Math.abs(len - EDGE) > 1e-9) problems.push(`final hexagon edge ${i} has length ${len.toFixed(9)}, expected ${EDGE}`);
    });
    const radii = s6Regular.vertices.map((v) => Math.hypot(...sub(v.pos, centroid)));
    if (Math.max(...radii) - Math.min(...radii) > 1e-9) problems.push('final hexagon is not equilateral about its centroid (not regular)');
    const angleAt = (k: number): number => {
      const prev = s6Regular.vertices[(k - 1 + n) % n].pos;
      const curr = s6Regular.vertices[k].pos;
      const next = s6Regular.vertices[(k + 1) % n].pos;
      const e1 = sub(prev, curr);
      const e2 = sub(next, curr);
      return Math.acos(dot(e1, e2) / (Math.hypot(...e1) * Math.hypot(...e2)));
    };
    const expectedInterior = (2 * Math.PI) / 3; // 120 degrees, a regular hexagon's own interior angle
    for (let k = 0; k < n; k++) {
      const a = angleAt(k);
      if (Math.abs(a - expectedInterior) > 1e-9) problems.push(`final hexagon corner ${k} has interior angle ${((a * 180) / Math.PI).toFixed(6)}°, expected 120°`);
    }
  }

  const undoSplit = coalesce(s6Regular, 'v1r', 'v2r', transientM);
  const undoSplitRelabeled: RvcmgState = {
    ...undoSplit,
    vertices: undoSplit.vertices.map((v) => (v.id === '(v1r+v2r)' ? { ...v, id: mergedId, sourceIds: ['v1', 'v2'] } : v)),
  };
  if (!statesApproximatelyEqual(undoSplitRelabeled, s5)) {
    problems.push('undoing step 2 (coalescing v1r/v2r back) does not reproduce the post-step-1 state');
  }
  const undoCoalesce = separate(undoSplitRelabeled, mergedId, [posOf(s6, 'v1'), posOf(s6, 'v2')], step1InverseDeformation);
  if (!statesApproximatelyEqual(undoCoalesce, s6)) {
    problems.push('undoing step 1 (separating v1/v2 back) does not reproduce the original universal hex interface');
  }

  const s6RegularPublic: RvcmgState = {
    ...s6Regular,
    vertices: s6Regular.vertices.map((v) => (v.id === 'v1r' ? { ...v, id: 'v1' } : v.id === 'v2r' ? { ...v, id: 'v2' } : v)),
  };

  return { states: [s6, s5, s6RegularPublic], ops: [op1], problems };
}

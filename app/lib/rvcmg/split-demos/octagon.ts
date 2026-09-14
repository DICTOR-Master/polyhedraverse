/**
 * Proof-of-concept, not a physical adapter piece — see heptagon.ts's
 * own header for the full rationale. This one exercises TWO sequential
 * `splitVertex()` calls (6 -> 7 -> 8), splitting `v1` and its exact
 * central-symmetry partner `v4` (confirmed by the adapter pieces
 * already), mirroring squareToRdH.ts's own 2-step pattern in the
 * opposite (multiplying) direction: step 1 places the first split's two
 * new corners directly and leaves everyone else untouched; step 2
 * places the second split's two new corners directly AND deforms the
 * remaining 4 untouched vertices to their own final corners.
 */

import { dist, type Vec3 } from '../../polyhedra/core';
import { hemiRdInterfaceFrame } from '../hemiRdInterface';
import { splitVertex } from '../splitVertex';
import { coalesce } from '../coalesce';
import { statesApproximatelyEqual } from '../types';
import { hemiRdStartState } from '../adapters/triangleToRdH';
import { assignTargetAngles } from '../adapters/shared';
import type { RvcmgState } from '../types';
import type { SplitDemoResult } from './heptagon';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function deriveOctagonBySplitting(): SplitDemoResult {
  const s6 = hemiRdStartState();
  const { centroid, u, w } = hemiRdInterfaceFrame();

  const angleOf = (p: Vec3): number => {
    const d = sub(p, centroid);
    return Math.atan2(dot(d, w), dot(d, u));
  };
  const posOf = (state: RvcmgState, id: string): Vec3 => state.vertices.find((v) => v.id === id)!.pos;

  const v1 = posOf(s6, 'v1');
  const v4 = posOf(s6, 'v4');

  // Cyclic order after splitting both v1 and v4: v1a, v1b, v2, v3, v4a, v4b, v5, v6.
  const groupIds = ['v1a', 'v1b', 'v2', 'v3', 'v4a', 'v4b', 'v5', 'v6'];
  const groupAngles = [angleOf(v1), angleOf(v1), angleOf(posOf(s6, 'v2')), angleOf(posOf(s6, 'v3')), angleOf(v4), angleOf(v4), angleOf(posOf(s6, 'v5')), angleOf(posOf(s6, 'v6'))];
  const targetAngles = assignTargetAngles(groupAngles);

  const EDGE = 1; // unit edge -- a real regular octagon
  const circumradius = EDGE / (2 * Math.sin(Math.PI / 8));
  const targetFor = (i: number): Vec3 => add(centroid, add(scale(u, circumradius * Math.cos(targetAngles[i])), scale(w, circumradius * Math.sin(targetAngles[i]))));
  const targets = groupIds.map((_, i) => targetFor(i));
  const [targetV1a, targetV1b, targetV2, targetV3, targetV4a, targetV4b, targetV5, targetV6] = targets;

  // Step 1: split v1 -> its two final corners directly; everyone else untouched.
  const s7 = splitVertex(s6, 'v1', 'v1a', 'v1b', targetV1a, targetV1b);

  // Step 2: split v4 -> its two final corners directly, AND deform v2/v3/v5/v6 (the only originals left) to their own final corners.
  const v2 = posOf(s7, 'v2');
  const v3 = posOf(s7, 'v3');
  const v5 = posOf(s7, 'v5');
  const v6 = posOf(s7, 'v6');
  const TOL = 1e-9;
  const step2Deformation = (p: Vec3): Vec3 => {
    if (dist(p, v2) < TOL) return targetV2;
    if (dist(p, v3) < TOL) return targetV3;
    if (dist(p, v5) < TOL) return targetV5;
    if (dist(p, v6) < TOL) return targetV6;
    if (dist(p, targetV1a) < TOL || dist(p, targetV1b) < TOL) return p; // already correctly placed in step 1
    throw new Error(`deriveOctagonBySplitting: step2 deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const after = splitVertex(s7, 'v4', 'v4a', 'v4b', targetV4a, targetV4b, step2Deformation);

  const problems: string[] = [];
  if (after.vertices.length !== 8) {
    problems.push(`final state has ${after.vertices.length} vertices, expected 8`);
  } else {
    const n = 8;
    const edgeLens = after.vertices.map((v, i) => dist(v.pos, after.vertices[(i + 1) % n].pos));
    edgeLens.forEach((len, i) => {
      if (Math.abs(len - EDGE) > 1e-9) problems.push(`final octagon edge ${i} has length ${len.toFixed(9)}, expected ${EDGE}`);
    });
    const radii = after.vertices.map((v) => Math.hypot(...sub(v.pos, centroid)));
    if (Math.max(...radii) - Math.min(...radii) > 1e-9) problems.push('final octagon is not equilateral about its centroid (not regular)');
  }

  // Derivation-reversibility, undoing both splits in reverse: a
  // splitVertex() product's own undo is a plain coalesce() call (not
  // separate(), which only undoes a COALESCE product) — matching
  // heptagon.ts's own approach exactly.
  const step2InverseDeformation = (p: Vec3): Vec3 => {
    if (dist(p, targetV2) < TOL) return v2;
    if (dist(p, targetV3) < TOL) return v3;
    if (dist(p, targetV5) < TOL) return v5;
    if (dist(p, targetV6) < TOL) return v6;
    if (dist(p, targetV1a) < TOL || dist(p, targetV1b) < TOL) return p;
    throw new Error(`deriveOctagonBySplitting: step2 inverse deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const undoStep2 = coalesce(after, 'v4a', 'v4b', v4, step2InverseDeformation);
  const undoStep2Relabeled: RvcmgState = { ...undoStep2, vertices: undoStep2.vertices.map((v) => (v.id === '(v4a+v4b)' ? { ...v, id: 'v4' } : v)) };
  if (!statesApproximatelyEqual(undoStep2Relabeled, s7)) {
    problems.push('undoing step 2 (coalescing v4a/v4b back) does not reproduce the post-step-1 state');
  }
  const undoStep1 = coalesce(undoStep2Relabeled, 'v1a', 'v1b', v1);
  const undoStep1Relabeled: RvcmgState = { ...undoStep1, vertices: undoStep1.vertices.map((v) => (v.id === '(v1a+v1b)' ? { ...v, id: 'v1' } : v)) };
  if (!statesApproximatelyEqual(undoStep1Relabeled, s6)) {
    problems.push('undoing step 1 (coalescing v1a/v1b back) does not reproduce the original hemi-RD hex interface');
  }

  return { before: s6, after, problems };
}

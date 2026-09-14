/**
 * Proof-of-concept, not a physical adapter piece: demonstrates the
 * "multiply" direction of RVCMG's reversibility duality by SPLITTING
 * the hex interface UP to a 7-vertex regular heptagon, rather than
 * dividing it down (the 6 adapter pieces in adapters/ all divide).
 * Direct user statement this proves: "you can reduce six points to 3
 * but you can also split it to 12 or any other corner count."
 *
 * One `splitVertex()` call (6 -> 7): splits `v1` into two new corners
 * placed directly at their final positions, while this same step's
 * deformation repositions the other 5 untouched vertices to their own
 * final corners — mirroring pentagonToRdH.ts's own single-step pattern
 * exactly, just in the opposite (multiplying) direction.
 */

import { dist, type Vec3 } from '../../polyhedra/core';
import { hemiRdInterfaceFrame } from '../hemiRdInterface';
import { splitVertex } from '../splitVertex';
import { coalesce } from '../coalesce';
import { statesApproximatelyEqual } from '../types';
import { hemiRdStartState } from '../adapters/triangleToRdH';
import { assignTargetAngles } from '../adapters/shared';
import type { RvcmgState } from '../types';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export interface SplitDemoResult {
  before: RvcmgState;
  after: RvcmgState;
  problems: string[];
}

export function deriveHeptagonBySplitting(): SplitDemoResult {
  const s6 = hemiRdStartState();
  const { centroid, u, w } = hemiRdInterfaceFrame();

  const angleOf = (p: Vec3): number => {
    const d = sub(p, centroid);
    return Math.atan2(dot(d, w), dot(d, u));
  };
  const posOf = (id: string): Vec3 => s6.vertices.find((v) => v.id === id)!.pos;

  // Cyclic order after splitting v1: v1a, v1b, v2, v3, v4, v5, v6 (v1a
  // takes over v1's "incoming from v6" side, v1b its "outgoing to v2"
  // side — splitVertex.ts's own left/right convention).
  const groupIds = ['v1a', 'v1b', 'v2', 'v3', 'v4', 'v5', 'v6'];
  const groupAngles = [angleOf(posOf('v1')), angleOf(posOf('v1')), angleOf(posOf('v2')), angleOf(posOf('v3')), angleOf(posOf('v4')), angleOf(posOf('v5')), angleOf(posOf('v6'))];
  const targetAngles = assignTargetAngles(groupAngles);

  const EDGE = 1; // unit edge -- a real regular heptagon, matching this family's own shared physical scale
  const circumradius = EDGE / (2 * Math.sin(Math.PI / 7));
  const targetFor = (i: number): Vec3 => add(centroid, add(scale(u, circumradius * Math.cos(targetAngles[i])), scale(w, circumradius * Math.sin(targetAngles[i]))));
  const targets = groupIds.map((_, i) => targetFor(i));

  const v2 = posOf('v2');
  const v3 = posOf('v3');
  const v4 = posOf('v4');
  const v5 = posOf('v5');
  const v6 = posOf('v6');
  const TOL = 1e-9;
  const deformation = (p: Vec3): Vec3 => {
    if (dist(p, v2) < TOL) return targets[2];
    if (dist(p, v3) < TOL) return targets[3];
    if (dist(p, v4) < TOL) return targets[4];
    if (dist(p, v5) < TOL) return targets[5];
    if (dist(p, v6) < TOL) return targets[6];
    throw new Error(`deriveHeptagonBySplitting: deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };

  const after = splitVertex(s6, 'v1', 'v1a', 'v1b', targets[0], targets[1], deformation);

  const problems: string[] = [];
  if (after.vertices.length !== 7) {
    problems.push(`final state has ${after.vertices.length} vertices, expected 7`);
  } else {
    const n = 7;
    const edgeLens = after.vertices.map((v, i) => dist(v.pos, after.vertices[(i + 1) % n].pos));
    edgeLens.forEach((len, i) => {
      if (Math.abs(len - EDGE) > 1e-9) problems.push(`final heptagon edge ${i} has length ${len.toFixed(9)}, expected ${EDGE}`);
    });
    const radii = after.vertices.map((v) => Math.hypot(...sub(v.pos, centroid)));
    if (Math.max(...radii) - Math.min(...radii) > 1e-9) problems.push('final heptagon is not equilateral about its centroid (not regular)');
  }

  // Derivation-reversibility, the split direction: coalescing v1a/v1b
  // back at v1's original position, with the inverse deformation for
  // the other 5, must reproduce s6 exactly (up to relabeling the
  // recombined vertex -- see splitVertex.test.ts's own reasoning).
  const inverseDeformation = (p: Vec3): Vec3 => {
    if (dist(p, targets[2]) < TOL) return v2;
    if (dist(p, targets[3]) < TOL) return v3;
    if (dist(p, targets[4]) < TOL) return v4;
    if (dist(p, targets[5]) < TOL) return v5;
    if (dist(p, targets[6]) < TOL) return v6;
    throw new Error(`deriveHeptagonBySplitting: inverse deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const mergedBack = coalesce(after, 'v1a', 'v1b', posOf('v1'), inverseDeformation);
  const relabeled: RvcmgState = { ...mergedBack, vertices: mergedBack.vertices.map((v) => (v.id === '(v1a+v1b)' ? { ...v, id: 'v1' } : v)) };
  if (!statesApproximatelyEqual(relabeled, s6)) {
    problems.push('coalescing the split back does not reproduce the original hemi-RD hex interface (derivation-reversibility failed)');
  }

  return { before: s6, after, problems };
}

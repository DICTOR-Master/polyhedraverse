/**
 * The Square-to-RD-H adapter piece: the same hemi-RD hexagonal interface
 * as triangleToRdH.ts, collapsed instead to a real unit square matching
 * a unit-edge cube face. See docs/rvcmg-adapter-pieces-spec.md for the
 * full adapter-piece family this belongs to.
 *
 * Unlike the triangle piece (3 merges, every hex vertex absorbed into
 * one), a square needs only 2 merges (6 -> 5 -> 4): two of the six hex
 * vertices are never coalesced at all. Those two MUST still end up at
 * specific final corner positions to form a real square — this is what
 * a coalescence step's own `deformation` parameter (spec §16's Φ,
 * "applied to all other vertices") is actually for: reshaping the rest
 * of the boundary as part of a coalescence, not merely a pass-through.
 * RVCMG has no separate "reposition without changing vertex count"
 * primitive, so the untouched vertices' final repositioning is carried
 * by the SECOND merge's deformation.
 */

import { dist, type Vec3 } from '../../polyhedra/core';
import { hemiRdInterfaceFrame } from '../hemiRdInterface';
import { coalesce } from '../coalesce';
import { verifyTransition } from '../verify';
import { hemiRdStartState } from './triangleToRdH';
import { assignTargetAngles } from './shared';
import type { RvcmgState, CoalescenceOp } from '../types';
import type { AdapterPieceResult } from './triangleToRdH';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Derives the Square-to-RD-H piece: two `coalesce()` steps, merging
 * (v2,v3) then (v5,v6) — the SAME two "cube-corner + octahedron-
 * direction" edge pairs the triangle piece's own alternate-edge
 * matching would use for two of its three merges, leaving `v1`/`v4`
 * (an exact central-symmetry pair, `v4 == -v1` in this plane, confirmed
 * computationally below rather than assumed from the RD's known
 * inversion symmetry) untouched by any single `coalesce()` call.
 *
 * Target placement, generalizing triangleToRdH.ts's own method to 4
 * groups instead of 3: each of the 4 final corners is either a single
 * untouched vertex or a merged pair; each group's REPRESENTATIVE angle
 * (its own angle, or a pair's averaged angle, in the hex interface's
 * own planar frame) is measured, the 4 groups are sorted by that angle
 * to read off the hexagon's real winding order, and exactly 90°-spaced
 * target angles are assigned in that same order — preserving winding
 * instead of risking an inverted (mirrored) square from an arbitrary
 * fixed assignment. Circumradius `1/sqrt(2)` gives edge length exactly
 * 1, matching a unit-edge cube face.
 */
export function deriveSquareToRdH(): AdapterPieceResult {
  const s6 = hemiRdStartState();
  const { centroid, u, w } = hemiRdInterfaceFrame();

  const angleOf = (p: Vec3): number => {
    const d = sub(p, centroid);
    return Math.atan2(dot(d, w), dot(d, u));
  };
  const posOf = (state: RvcmgState, id: string): Vec3 => state.vertices.find((v) => v.id === id)!.pos;

  const v1 = posOf(s6, 'v1');
  const v4 = posOf(s6, 'v4');
  const v4IsMinusV1 = dist(v4, scale(v1, -1)) < 1e-9;
  if (!v4IsMinusV1) {
    throw new Error('deriveSquareToRdH: v1/v4 are not an exact central-symmetry pair — the assumption this derivation relies on does not hold');
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
  // assignTargetAngles both reads off the hex boundary's own real
  // winding order (preventing an inverted/mirrored result) AND picks
  // the assignment's rotational phase to minimize twist relative to
  // each group's own real position (direct user instruction: "always
  // use closest corresponding corners of RD hex group to match square
  // or other shape for least distortion") — see shared.ts's own comment.
  const angles = groups.map(groupAngle);
  const targetAngles = assignTargetAngles(angles);

  // Direct user instruction (2026-09-16): rotate the whole assignment so
  // RD-H's own LONGEST hex edges (v3-v4 and v6-v1, length 1 vs. the 4
  // short edges' sqrt(3)/2 -- hemiRdInterface.ts's own documented D2h
  // symmetry) end up parallel to the square's own sides, overriding
  // assignTargetAngles's default least-corner-twist phase for this piece
  // specifically (a real, separate design choice, not a derived
  // necessity -- confirmed correct visually and by direct measurement
  // rather than assumed). The (v2,v3)-group corner and the v4 corner are
  // adjacent by construction (indices 1 and 2 in `groups` above, and the
  // hex's own vertices are already in monotonic angular order so ranks
  // match group indices exactly, confirmed computationally), so the
  // square's edge between them is exactly the surviving image of the
  // original v3-v4 edge -- aligning ITS direction with v3-v4's own
  // original direction is the real criterion, not an arbitrary rotation.
  // A uniform phase shift changes only the square's absolute
  // orientation, never its shape (edge lengths / right angles are
  // rotation-invariant), so this can't disturb any of this function's
  // own downstream correctness checks.
  const v3 = posOf(s6, 'v3');
  const longEdgeDir = Math.atan2(dot(sub(v4, v3), w), dot(sub(v4, v3), u));
  const currentEdge1Dir = targetAngles[1] + (3 * Math.PI) / 4; // adjacent-corners-on-a-circle chord-direction formula
  const rotationOffset = longEdgeDir - currentEdge1Dir;
  const alignedTargetAngles = targetAngles.map((a) => a + rotationOffset);

  const EDGE = 1; // unit edge, matching a unit-edge cube face
  const circumradius = EDGE / Math.sqrt(2);
  const targetFor = (groupIndex: number): Vec3 => {
    const theta = alignedTargetAngles[groupIndex];
    return add(centroid, add(scale(u, circumradius * Math.cos(theta)), scale(w, circumradius * Math.sin(theta))));
  };
  const targetV1 = targetFor(0);
  const targetM1 = targetFor(1);
  const targetV4 = targetFor(2);
  const targetM2 = targetFor(3);

  const states: RvcmgState[] = [s6];
  const ops: CoalescenceOp[] = [];

  // Step 1: merge (v2,v3) -> its final corner directly. Every other
  // vertex (v1, v4, v5, v6) stays exactly where it started — the
  // untouched pair's real repositioning happens in step 2 instead.
  const s5 = coalesce(s6, 'v2', 'v3', targetM1);
  ops.push({
    id: 'square-to-rd-h-step1', fromStateId: s6.id, toStateId: s5.id, coalescedPair: ['v2', 'v3'],
    targetPos: targetM1, path: 'symmetric', deformation: (v) => v, inverse: 'square-to-rd-h-step1-inv',
  });
  states.push(s5);

  // Step 2: merge (v5,v6) -> its final corner, AND deform v1/v4 (the
  // only two other ORIGINAL vertices left at this point) to THEIR final
  // corners in the SAME step — the real use of Φ (spec §16), not an
  // identity pass-through. "Every other vertex" at this point is v1,
  // v4, AND the merged (v2+v3) vertex from step 1 — that one is already
  // sitting at its own correct final corner, so it passes through
  // unchanged. Matched by exact position (all three are known exactly
  // at this point), not by id, since coalesce()'s own deformation
  // signature is position-only.
  const TOL = 1e-9;
  const step2Deformation = (p: Vec3): Vec3 => {
    if (dist(p, v1) < TOL) return targetV1;
    if (dist(p, v4) < TOL) return targetV4;
    if (dist(p, targetM1) < TOL) return p; // already correctly placed in step 1
    throw new Error(`deriveSquareToRdH: step2 deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  // The real inverse of step2Deformation (spec §25.6 needs this to check
  // reversibility correctly — separate()'s own default identity would
  // incorrectly leave v1/v4 at their post-deformation corner positions).
  const step2InverseDeformation = (p: Vec3): Vec3 => {
    if (dist(p, targetV1) < TOL) return v1;
    if (dist(p, targetV4) < TOL) return v4;
    if (dist(p, targetM1) < TOL) return p;
    throw new Error(`deriveSquareToRdH: step2 inverse deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const s4 = coalesce(s5, 'v5', 'v6', targetM2, step2Deformation);
  ops.push({
    id: 'square-to-rd-h-step2', fromStateId: s5.id, toStateId: s4.id, coalescedPair: ['v5', 'v6'],
    targetPos: targetM2, path: 'symmetric', deformation: step2Deformation, inverse: 'square-to-rd-h-step2-inv',
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
    // Edge-length-equal alone doesn't rule out a rhombus (core.ts's own
    // documented lesson from the Johnson-solids batches) — check a real
    // right angle too.
    const e1 = sub(final.vertices[1].pos, final.vertices[0].pos);
    const e2 = sub(final.vertices[3].pos, final.vertices[0].pos);
    const cosAngle = dot(e1, e2) / (Math.hypot(...e1) * Math.hypot(...e2));
    if (Math.abs(cosAngle) > 1e-9) problems.push(`final quadrilateral's corner angle is not 90° (cos=${cosAngle.toFixed(9)}) — a rhombus, not a real square`);
  }

  return { states, ops, problems };
}

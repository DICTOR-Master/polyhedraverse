/**
 * The Golden-rhombus-to-RD-H adapter piece: the same hemi-RD hexagonal
 * interface as the other pieces, collapsed instead to a real rhombus
 * matching the rhombic triacontahedron's own face (diagonal ratio
 * exactly φ:1 — the golden ratio, confirmed computationally from the
 * registry below, not assumed). The first NON-regular target polygon in
 * the family: a rhombus has 2-fold, not 4-fold, symmetry, so its final-
 * shape check and its per-corner radius are genuinely different from
 * the square piece's, not just a parameter swap.
 *
 * Structurally identical to squareToRdH.ts otherwise: same 2-merge
 * sequence (6 -> 5 -> 4), same untouched-vertex-pair
 * (`v1`/`v4`, exact central-symmetry partners) repositioned via the
 * second merge's own deformation.
 */

import { dist, type Vec3 } from '../../polyhedra/core';
import { POLYHEDRA } from '../../polyhedra/index';
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
 * The rhombic triacontahedron's own rhombus, measured directly from the
 * registry (never hand-copied): edge length `1/phi` and diagonal ratio
 * exactly `phi` in RT's own circumradius-1 frame. Rescaled here to unit
 * edge length (multiply by `phi`) — the same shared-scale convention
 * every adapter piece uses — giving half-diagonals `phi/sqrt(phi^2+1)`
 * (long) and `1/sqrt(phi^2+1)` (short) for a UNIT-EDGE rhombus with the
 * real RT proportions.
 */
const RT_FACE_MEASURED = (() => {
  const rt = POLYHEDRA.RHOMBIC_TRIACONTAHEDRON;
  const face = rt.faces[0];
  const pts = face.map((i) => rt.vertices[i]);
  const edge = dist(pts[0], pts[1]);
  const diagLong = dist(pts[0], pts[2]);
  const diagShort = dist(pts[1], pts[3]);
  return { edge, ratio: diagLong / diagShort };
})();

export const GOLDEN_RATIO_MEASURED: number = RT_FACE_MEASURED.ratio;

const EDGE = 1; // unit edge, matching a unit-edge rhombic-triacontahedron face
const HALF_DIAG_LONG = EDGE / Math.sqrt(GOLDEN_RATIO_MEASURED ** 2 + 1) * GOLDEN_RATIO_MEASURED;
const HALF_DIAG_SHORT = EDGE / Math.sqrt(GOLDEN_RATIO_MEASURED ** 2 + 1);

/**
 * Derives the Golden-rhombus-to-RD-H piece. Same merge pairing as the
 * square piece — `(v2,v3)` and `(v5,v6)`, leaving `v1`/`v4` untouched —
 * but the two roles (the untouched-vertex pair vs. the two merged
 * pairs) are no longer interchangeable the way a square's 4 equal
 * corners are: one role sits on the LONG diagonal, the other on the
 * SHORT one. Assigned by least distortion (measured, not guessed): `v1`
 * (and its central-symmetry partner `v4`) already sit at radius 1 from
 * the hex's own centroid in this scale, which is closer to the long
 * half-diagonal (`~0.851`) than the short one (`~0.526`) — so `v1`/`v4`
 * get the long diagonal, `(v2,v3)`/`(v5,v6)` get the short one.
 */
export function deriveGoldenRhombusToRdH(): AdapterPieceResult {
  const s6 = hemiRdStartState();
  const { centroid, u, w } = hemiRdInterfaceFrame();

  const angleOf = (p: Vec3): number => {
    const d = sub(p, centroid);
    return Math.atan2(dot(d, w), dot(d, u));
  };
  const posOf = (state: RvcmgState, id: string): Vec3 => state.vertices.find((v) => v.id === id)!.pos;

  const v1 = posOf(s6, 'v1');
  const v4 = posOf(s6, 'v4');
  if (dist(v4, scale(v1, -1)) > 1e-9) {
    throw new Error('deriveGoldenRhombusToRdH: v1/v4 are not an exact central-symmetry pair');
  }

  type Group = { kind: 'single'; id: string; radius: number } | { kind: 'pair'; idA: string; idB: string; radius: number };
  const groups: Group[] = [
    { kind: 'single', id: 'v1', radius: HALF_DIAG_LONG },
    { kind: 'pair', idA: 'v2', idB: 'v3', radius: HALF_DIAG_SHORT },
    { kind: 'single', id: 'v4', radius: HALF_DIAG_LONG },
    { kind: 'pair', idA: 'v5', idB: 'v6', radius: HALF_DIAG_SHORT },
  ];
  const groupAngle = (g: Group): number => (g.kind === 'single' ? angleOf(posOf(s6, g.id)) : (angleOf(posOf(s6, g.idA)) + angleOf(posOf(s6, g.idB))) / 2);
  const targetAngles = assignTargetAngles(groups.map(groupAngle));

  const targetFor = (groupIndex: number): Vec3 => {
    const theta = targetAngles[groupIndex];
    const r = groups[groupIndex].radius;
    return add(centroid, add(scale(u, r * Math.cos(theta)), scale(w, r * Math.sin(theta))));
  };
  const targetV1 = targetFor(0);
  const targetM1 = targetFor(1);
  const targetV4 = targetFor(2);
  const targetM2 = targetFor(3);

  const states: RvcmgState[] = [s6];
  const ops: CoalescenceOp[] = [];

  const s5 = coalesce(s6, 'v2', 'v3', targetM1);
  ops.push({
    id: 'golden-rhombus-to-rd-h-step1', fromStateId: s6.id, toStateId: s5.id, coalescedPair: ['v2', 'v3'],
    targetPos: targetM1, path: 'symmetric', deformation: (v) => v, inverse: 'golden-rhombus-to-rd-h-step1-inv',
  });
  states.push(s5);

  const TOL = 1e-9;
  const step2Deformation = (p: Vec3): Vec3 => {
    if (dist(p, v1) < TOL) return targetV1;
    if (dist(p, v4) < TOL) return targetV4;
    if (dist(p, targetM1) < TOL) return p;
    throw new Error(`deriveGoldenRhombusToRdH: step2 deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const step2InverseDeformation = (p: Vec3): Vec3 => {
    if (dist(p, targetV1) < TOL) return v1;
    if (dist(p, targetV4) < TOL) return v4;
    if (dist(p, targetM1) < TOL) return p;
    throw new Error(`deriveGoldenRhombusToRdH: step2 inverse deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const s4 = coalesce(s5, 'v5', 'v6', targetM2, step2Deformation);
  ops.push({
    id: 'golden-rhombus-to-rd-h-step2', fromStateId: s5.id, toStateId: s4.id, coalescedPair: ['v5', 'v6'],
    targetPos: targetM2, path: 'symmetric', deformation: step2Deformation, inverse: 'golden-rhombus-to-rd-h-step2-inv',
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
      if (Math.abs(len - EDGE) > 1e-9) problems.push(`final rhombus edge ${i} has length ${len.toFixed(9)}, expected ${EDGE}`);
    });
    const diag1 = dist(final.vertices[0].pos, final.vertices[2].pos);
    const diag2 = dist(final.vertices[1].pos, final.vertices[3].pos);
    const ratio = Math.max(diag1, diag2) / Math.min(diag1, diag2);
    if (Math.abs(ratio - GOLDEN_RATIO_MEASURED) > 1e-9) {
      problems.push(`final rhombus diagonal ratio is ${ratio.toFixed(9)}, expected phi (${GOLDEN_RATIO_MEASURED.toFixed(9)})`);
    }
    const d1v = sub(final.vertices[2].pos, final.vertices[0].pos);
    const d2v = sub(final.vertices[3].pos, final.vertices[1].pos);
    const cosBetweenDiagonals = dot(d1v, d2v) / (Math.hypot(...d1v) * Math.hypot(...d2v));
    if (Math.abs(cosBetweenDiagonals) > 1e-9) problems.push(`final rhombus diagonals are not perpendicular (cos=${cosBetweenDiagonals.toFixed(9)})`);
  }

  return { states, ops, problems };
}

/**
 * RVCMG v2 — shared derivation for the rhombus adapter pieces
 * (Golden-Rhombus-to-U-Hex, RD-Native-Rhombus-to-U-Hex): structurally
 * identical, differing only in which Catalan solid's own rhombic face is
 * the target. Mirrors `kiteToRdH.ts`'s own relationship to
 * `diKiteToRdH.ts`/`dhKiteToRdH.ts`.
 *
 * v1's `goldenRhombusToRdH.ts` tie-broke "which hex group gets the long
 * vs short diagonal role" by an existing radius asymmetry: `v1`/`v4`
 * already sat at a different radius from centroid than the merged
 * pairs, on RD's own D2h-asymmetric hex. That signal doesn't exist here
 * — the new universal hex is a PERFECT regular hexagon, so `v1`/`v4`
 * and the two merged-pair midpoints all start at very nearly the same
 * radius (the pair midpoints are slightly closer to centroid than a
 * hexagon's own circumradius, chord-midpoint geometry, but nowhere near
 * the pronounced difference v1 relied on). Uses `fitTargetPolygon`
 * (`./shared.ts`, already generalized for exactly this "which
 * non-interchangeable target corner does each hex group get" problem by
 * the kite pieces) instead: tries all 4 cyclic role assignments, scores
 * each by real 2D squared position error after its own best-fit
 * rotation, and picks the lowest — measured directly, not assumed from
 * a heuristic that no longer applies.
 */

import { dist, type Vec3 } from '../../polyhedra/core';
import { CATALAN_ADDITIONS } from '../../polyhedra/catalan';
import { universalHexInterfaceFrame } from '../universalHexInterface';
import { coalesce } from '../coalesce';
import { verifyTransition } from '../verify';
import { uHexStartState } from './triangleToUHex';
import { fitTargetPolygon, type AngleFitGroup, type TargetCorner } from './shared';
import type { RvcmgState, CoalescenceOp } from '../types';
import type { AdapterPieceResult } from './triangleToUHex';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export interface RhombusFaceMeasured {
  edge: number;
  /** diagLong / diagShort, measured directly from the registry — never assumed. */
  ratio: number;
}

/**
 * Measures a Catalan solid's own rhombic face directly from the
 * registry (never hand-copied), the same way
 * `goldenRhombusToRdH.ts`'s own `RT_FACE_MEASURED` did.
 */
export function measureRhombusFace(catalanId: string): RhombusFaceMeasured {
  const spec = CATALAN_ADDITIONS[catalanId];
  const face = spec.faces[0];
  const pts = face.map((i) => spec.vertices[i]);
  const edge = dist(pts[0], pts[1]);
  const diagLong = dist(pts[0], pts[2]);
  const diagShort = dist(pts[1], pts[3]);
  return { edge, ratio: diagLong / diagShort };
}

export interface RhombusPieceOptions {
  catalanId: string;
  pieceName: string;
}

/**
 * Derives a rhombus adapter piece. Same merge pairing as
 * squareToUHex.ts — `(v2,v3)` and `(v5,v6)`, leaving `v1`/`v4`
 * untouched — but which of the 4 hex groups plays which of the
 * rhombus's 2 non-interchangeable roles (long-diagonal corner,
 * short-diagonal corner) is resolved by `fitTargetPolygon`'s measured
 * distortion, not assumed.
 */
export function deriveRhombusToUHex({ catalanId, pieceName }: RhombusPieceOptions): AdapterPieceResult {
  const measured = measureRhombusFace(catalanId);
  const EDGE = measured.edge;
  const halfDiagLong = (EDGE / Math.sqrt(measured.ratio ** 2 + 1)) * measured.ratio;
  const halfDiagShort = EDGE / Math.sqrt(measured.ratio ** 2 + 1);

  const targetCorners: TargetCorner[] = [
    { relativeAngle: 0, radius: halfDiagLong },
    { relativeAngle: Math.PI / 2, radius: halfDiagShort },
    { relativeAngle: Math.PI, radius: halfDiagLong },
    { relativeAngle: (3 * Math.PI) / 2, radius: halfDiagShort },
  ];

  const s6 = uHexStartState();
  const { centroid, u, w } = universalHexInterfaceFrame();

  const angleOf = (p: Vec3): number => {
    const d = sub(p, centroid);
    return Math.atan2(dot(d, w), dot(d, u));
  };
  const radiusOf = (p: Vec3): number => Math.hypot(...sub(p, centroid));
  const posOf = (state: RvcmgState, id: string): Vec3 => state.vertices.find((v) => v.id === id)!.pos;
  const midpoint = (a: Vec3, b: Vec3): Vec3 => scale(add(a, b), 0.5);

  const v1 = posOf(s6, 'v1');
  const v4 = posOf(s6, 'v4');
  if (dist(v4, scale(v1, -1)) > 1e-9) {
    throw new Error(`deriveRhombusToUHex(${pieceName}): v1/v4 are not an exact central-symmetry pair`);
  }
  const m1Ref = midpoint(posOf(s6, 'v2'), posOf(s6, 'v3'));
  const m2Ref = midpoint(posOf(s6, 'v5'), posOf(s6, 'v6'));

  const groups: AngleFitGroup[] = [
    { angle: angleOf(v1), radius: radiusOf(v1) },
    { angle: angleOf(m1Ref), radius: radiusOf(m1Ref) },
    { angle: angleOf(v4), radius: radiusOf(v4) },
    { angle: angleOf(m2Ref), radius: radiusOf(m2Ref) },
  ];
  const { targetAngles, targetRadii, cornerIndexForGroup } = fitTargetPolygon(groups, targetCorners);
  const targetFor = (i: number): Vec3 => add(centroid, add(scale(u, targetRadii[i] * Math.cos(targetAngles[i])), scale(w, targetRadii[i] * Math.sin(targetAngles[i]))));
  const targetV1 = targetFor(0);
  const targetM1 = targetFor(1);
  const targetV4 = targetFor(2);
  const targetM2 = targetFor(3);

  const states: RvcmgState[] = [s6];
  const ops: CoalescenceOp[] = [];

  const s5 = coalesce(s6, 'v2', 'v3', targetM1);
  ops.push({
    id: `${pieceName}-step1`, fromStateId: s6.id, toStateId: s5.id, coalescedPair: ['v2', 'v3'],
    targetPos: targetM1, path: 'symmetric', deformation: (v) => v, inverse: `${pieceName}-step1-inv`,
  });
  states.push(s5);

  const TOL = 1e-9;
  const step2Deformation = (p: Vec3): Vec3 => {
    if (dist(p, v1) < TOL) return targetV1;
    if (dist(p, v4) < TOL) return targetV4;
    if (dist(p, targetM1) < TOL) return p;
    throw new Error(`deriveRhombusToUHex(${pieceName}): step2 deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const step2InverseDeformation = (p: Vec3): Vec3 => {
    if (dist(p, targetV1) < TOL) return v1;
    if (dist(p, targetV4) < TOL) return v4;
    if (dist(p, targetM1) < TOL) return p;
    throw new Error(`deriveRhombusToUHex(${pieceName}): step2 inverse deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const s4 = coalesce(s5, 'v5', 'v6', targetM2, step2Deformation);
  ops.push({
    id: `${pieceName}-step2`, fromStateId: s5.id, toStateId: s4.id, coalescedPair: ['v5', 'v6'],
    targetPos: targetM2, path: 'symmetric', deformation: step2Deformation, inverse: `${pieceName}-step2-inv`,
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
    // fitTargetPolygon is free to pick ANY of the 4 cyclic shifts, so
    // output vertex `i` does not necessarily hold measured-corner role
    // `i` — check the ACTUAL assigned role via `cornerIndexForGroup`,
    // the same discipline kiteToRdH.ts's own verification uses.
    const edgeLenBetweenCorners = (kA: number, kB: number): number => {
      const a = targetCorners[kA];
      const b = targetCorners[kB];
      return Math.sqrt(Math.max(0, a.radius ** 2 + b.radius ** 2 - 2 * a.radius * b.radius * Math.cos(a.relativeAngle - b.relativeAngle)));
    };
    const edgeLens = final.vertices.map((v, i) => dist(v.pos, final.vertices[(i + 1) % 4].pos));
    edgeLens.forEach((len, i) => {
      const kA = cornerIndexForGroup[i];
      const kB = cornerIndexForGroup[(i + 1) % 4];
      if ((kB - kA + 4) % 4 !== 1) {
        problems.push(`final rhombus: output edge ${i} connects non-adjacent measured corners ${kA}->${kB} — winding was not preserved`);
        return;
      }
      const expected = edgeLenBetweenCorners(kA, kB);
      if (Math.abs(len - expected) > 1e-9) problems.push(`final rhombus edge ${i} (measured-corner ${kA}->${kB}) has length ${len.toFixed(9)}, expected ${expected.toFixed(9)}`);
    });
    const diag1 = dist(final.vertices[0].pos, final.vertices[2].pos);
    const diag2 = dist(final.vertices[1].pos, final.vertices[3].pos);
    const ratio = Math.max(diag1, diag2) / Math.min(diag1, diag2);
    if (Math.abs(ratio - measured.ratio) > 1e-9) problems.push(`final rhombus diagonal ratio is ${ratio.toFixed(9)}, expected ${measured.ratio.toFixed(9)}`);
    const d1v = sub(final.vertices[2].pos, final.vertices[0].pos);
    const d2v = sub(final.vertices[3].pos, final.vertices[1].pos);
    const cosBetween = dot(d1v, d2v) / (Math.hypot(...d1v) * Math.hypot(...d2v));
    if (Math.abs(cosBetween) > 1e-9) problems.push(`final rhombus diagonals are not perpendicular (cos=${cosBetween.toFixed(9)})`);
  }

  return { states, ops, problems };
}

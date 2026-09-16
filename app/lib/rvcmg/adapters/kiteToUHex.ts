/**
 * RVCMG v2 — shared derivation for the two kite adapter pieces
 * (DI-Kite-to-U-Hex, DH-Kite-to-U-Hex): direct port of `kiteToRdH.ts`
 * onto the new universal hex interface. Structurally unchanged — the
 * kite pieces already used `fitTargetPolygon` (no radius-asymmetry
 * heuristic to drop, unlike the rhombus pieces), so this is a pure
 * source-hex swap.
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
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(...a));

export interface KiteFaceMeasured {
  edgeShort: number;
  edgeLong: number;
  corners: { r: number; theta: number }[];
}

/** Identical to `kiteToRdH.ts`'s own `measureKiteFace` — not duplicated logic drift, just re-declared here since v1's adapters/ files are being kept as an archived, standalone set (see project memory on the archive plan). */
export function measureKiteFace(catalanId: string): KiteFaceMeasured {
  const spec = CATALAN_ADDITIONS[catalanId];
  const face = spec.faces[0];
  const pts = face.map((i) => spec.vertices[i]);
  const centroid: Vec3 = [0, 0, 0];
  for (const p of pts) {
    centroid[0] += p[0] / 4;
    centroid[1] += p[1] / 4;
    centroid[2] += p[2] / 4;
  }
  const edgeShort = dist(pts[0], pts[1]);
  const edgeLong = dist(pts[1], pts[2]);
  const normal = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
  const u = norm(sub(pts[0], centroid));
  const w = cross(normal, u);
  const corners = pts.map((p) => {
    const d = sub(p, centroid);
    return { r: Math.hypot(...d), theta: Math.atan2(dot(d, w), dot(d, u)) };
  });
  return { edgeShort, edgeLong, corners };
}

export interface KitePieceOptions {
  catalanId: string;
  pieceName: string;
}

export function deriveKiteToUHex({ catalanId, pieceName }: KitePieceOptions): AdapterPieceResult {
  const measured = measureKiteFace(catalanId);
  const targetCorners: TargetCorner[] = measured.corners.map((c) => ({ relativeAngle: c.theta, radius: c.r }));

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
    throw new Error(`deriveKiteToUHex(${pieceName}): step2 deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const step2InverseDeformation = (p: Vec3): Vec3 => {
    if (dist(p, targetV1) < TOL) return v1;
    if (dist(p, targetV4) < TOL) return v4;
    if (dist(p, targetM1) < TOL) return p;
    throw new Error(`deriveKiteToUHex(${pieceName}): step2 inverse deformation received an unexpected vertex position ${JSON.stringify(p)}`);
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
        problems.push(`final kite: output edge ${i} connects non-adjacent measured corners ${kA}->${kB} -- winding was not preserved`);
        return;
      }
      const expected = edgeLenBetweenCorners(kA, kB);
      if (Math.abs(len - expected) > 1e-9) problems.push(`final kite edge ${i} (measured-corner ${kA}->${kB}) has length ${len.toFixed(9)}, expected ${expected.toFixed(9)}`);
    });

    const outputIndexForCorner = (k: number): number => cornerIndexForGroup.indexOf(k);
    const side1 = outputIndexForCorner(1);
    const side3 = outputIndexForCorner(3);
    const cen: Vec3 = [0, 0, 0];
    for (const v of final.vertices) {
      cen[0] += v.pos[0] / 4;
      cen[1] += v.pos[1] / 4;
      cen[2] += v.pos[2] / 4;
    }
    const radii = final.vertices.map((v) => dist(v.pos, cen));
    if (Math.abs(radii[side1] - radii[side3]) > 1e-9) problems.push(`final kite's two side corners are not equidistant from the centroid (${radii[side1].toFixed(9)} vs ${radii[side3].toFixed(9)}) -- not a true kite`);
    const angleAt = (k: number): number => {
      const n = 4;
      const prev = final.vertices[(k - 1 + n) % n].pos;
      const curr = final.vertices[k].pos;
      const next = final.vertices[(k + 1) % n].pos;
      const e1 = sub(prev, curr);
      const e2 = sub(next, curr);
      return Math.acos(dot(e1, e2) / (Math.hypot(...e1) * Math.hypot(...e2)));
    };
    if (Math.abs(angleAt(side1) - angleAt(side3)) > 1e-9) problems.push(`final kite's two side corners have unequal interior angles (${((angleAt(side1) * 180) / Math.PI).toFixed(6)}° vs ${((angleAt(side3) * 180) / Math.PI).toFixed(6)}°) -- not a true kite`);
  }

  return { states, ops, problems };
}

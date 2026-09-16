/**
 * RVCMG v2 — Pentagon-to-U-Hex: the new universal hex interface
 * collapsed to a real regular pentagon, matching a unit-edge
 * dodecahedron face. Same 1-merge structure as v1's `pentagonToRdH.ts`.
 *
 * v1 picked one of RD's two "long" hex edges to merge, for a documented
 * reason (its two long edges were exact inversion-symmetric images of
 * each other, so either was an equally valid, non-arbitrary choice). On
 * the new hex there is no long/short distinction at all — every
 * adjacent pair is symmetric-equivalent by the hex's own full 6-fold
 * symmetry — so merging `(v3,v4)` here is a genuinely arbitrary choice
 * among 6 equally valid ones, kept only for naming consistency with the
 * v1 piece it replaces.
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

export function derivePentagonToUHex(): AdapterPieceResult {
  const s6 = uHexStartState();
  const { centroid, u, w } = universalHexInterfaceFrame();

  const angleOf = (p: Vec3): number => {
    const d = sub(p, centroid);
    return Math.atan2(dot(d, w), dot(d, u));
  };
  const posOf = (id: string): Vec3 => s6.vertices.find((v) => v.id === id)!.pos;

  type Group = { kind: 'single'; id: string } | { kind: 'pair'; idA: string; idB: string };
  const groups: Group[] = [
    { kind: 'single', id: 'v1' },
    { kind: 'single', id: 'v2' },
    { kind: 'pair', idA: 'v3', idB: 'v4' },
    { kind: 'single', id: 'v5' },
    { kind: 'single', id: 'v6' },
  ];
  const groupAngle = (g: Group): number => (g.kind === 'single' ? angleOf(posOf(g.id)) : (angleOf(posOf(g.idA)) + angleOf(posOf(g.idB))) / 2);
  const finalAngles = assignTargetAngles(groups.map(groupAngle));

  const EDGE = 1; // unit edge, matching a unit-edge dodecahedron face
  const circumradius = EDGE / (2 * Math.sin(Math.PI / 5));
  const targetFor = (groupIndex: number): Vec3 => {
    const theta = finalAngles[groupIndex];
    return add(centroid, add(scale(u, circumradius * Math.cos(theta)), scale(w, circumradius * Math.sin(theta))));
  };

  const targetV1 = targetFor(0);
  const targetV2 = targetFor(1);
  const targetM = targetFor(2);
  const targetV5 = targetFor(3);
  const targetV6 = targetFor(4);

  const v1 = posOf('v1');
  const v2 = posOf('v2');
  const v5 = posOf('v5');
  const v6 = posOf('v6');

  const TOL = 1e-9;
  const deformation = (p: Vec3): Vec3 => {
    if (dist(p, v1) < TOL) return targetV1;
    if (dist(p, v2) < TOL) return targetV2;
    if (dist(p, v5) < TOL) return targetV5;
    if (dist(p, v6) < TOL) return targetV6;
    throw new Error(`derivePentagonToUHex: deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const inverseDeformation = (p: Vec3): Vec3 => {
    if (dist(p, targetV1) < TOL) return v1;
    if (dist(p, targetV2) < TOL) return v2;
    if (dist(p, targetV5) < TOL) return v5;
    if (dist(p, targetV6) < TOL) return v6;
    throw new Error(`derivePentagonToUHex: inverse deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };

  const s5 = coalesce(s6, 'v3', 'v4', targetM, deformation);
  const op: CoalescenceOp = {
    id: 'pentagon-to-uhex-step1', fromStateId: s6.id, toStateId: s5.id, coalescedPair: ['v3', 'v4'],
    targetPos: targetM, path: 'symmetric', deformation, inverse: 'pentagon-to-uhex-step1-inv',
  };

  const states: RvcmgState[] = [s6, s5];
  const ops: CoalescenceOp[] = [op];

  const problems: string[] = verifyTransition(op, s6, s5, { inverseDeformation }).map((p) => `step1: ${p}`);

  const final = s5;
  if (final.vertices.length !== 5) {
    problems.push(`final state has ${final.vertices.length} vertices, expected 5`);
  } else {
    const edgeLens = final.vertices.map((v, i) => dist(v.pos, final.vertices[(i + 1) % 5].pos));
    edgeLens.forEach((len, i) => {
      if (Math.abs(len - EDGE) > 1e-9) problems.push(`final pentagon edge ${i} has length ${len.toFixed(9)}, expected ${EDGE}`);
    });
    const radii = final.vertices.map((v) => Math.hypot(...sub(v.pos, centroid)));
    const rMin = Math.min(...radii);
    const rMax = Math.max(...radii);
    if (rMax - rMin > 1e-9) problems.push(`final pentagon is not equilateral about its centroid: radii range [${rMin.toFixed(9)}, ${rMax.toFixed(9)}]`);
    const angleAt = (k: number): number => {
      const n = final.vertices.length;
      const prev = final.vertices[(k - 1 + n) % n].pos;
      const curr = final.vertices[k].pos;
      const next = final.vertices[(k + 1) % n].pos;
      const e1 = sub(prev, curr);
      const e2 = sub(next, curr);
      return Math.acos(dot(e1, e2) / (Math.hypot(...e1) * Math.hypot(...e2)));
    };
    const interiorAngles = final.vertices.map((_, k) => angleAt(k));
    const expectedInterior = (3 * Math.PI) / 5; // 108 degrees, a regular pentagon's own interior angle
    interiorAngles.forEach((a, i) => {
      if (Math.abs(a - expectedInterior) > 1e-9) problems.push(`final pentagon corner ${i} has interior angle ${((a * 180) / Math.PI).toFixed(6)}°, expected 108°`);
    });
  }

  return { states, ops, problems };
}

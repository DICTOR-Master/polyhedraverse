/**
 * Shared derivation for the two kite adapter pieces (DI-kite-to-RD-H,
 * DH-kite-to-RD-H) — structurally identical, differing only in which
 * Catalan solid's own face geometry is the target. Factored out rather
 * than duplicated, matching triangleToRdH.ts/squareToRdH.ts's own
 * relationship to shared.ts.
 *
 * The first pieces with NO central symmetry to exploit: a kite has only
 * a single mirror axis (through the two corners where its two distinct
 * edge lengths meet), not the `v4 == -v1` point symmetry every prior
 * piece (square, pentagon, golden-rhombus) relied on. This is also the
 * first target polygon whose 4 corners are genuinely NOT
 * interchangeable (different radii from centroid, non-uniform angular
 * spacing) — `assignTargetAngles` assumes a uniform-radius, evenly-
 * spaced target and can't place these corners correctly;
 * `fitTargetPolygon` (shared.ts) generalizes it for exactly this case.
 */

import { dist, type Vec3 } from '../../polyhedra/core';
// Imports directly from catalan.ts, not the combined `polyhedra/index.ts`
// -- see hemiRdInterface.ts's own comment on the real circular-import
// bug this avoids. Both real callers (diKiteToRdH.ts,
// dhKiteToRdH.ts) pass a Catalan solid id, so catalan.ts's own registry
// covers every real `catalanId` this function is ever called with.
import { CATALAN_ADDITIONS } from '../../polyhedra/catalan';
import { hemiRdInterfaceFrame } from '../hemiRdInterface';
import { coalesce } from '../coalesce';
import { verifyTransition } from '../verify';
import { hemiRdStartState } from './triangleToRdH';
import { fitTargetPolygon, type AngleFitGroup, type TargetCorner } from './shared';
import type { RvcmgState, CoalescenceOp } from '../types';
import type { AdapterPieceResult } from './triangleToRdH';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(...a));

export interface KiteFaceMeasured {
  /** The two distinct edge lengths (a kite is NOT equilateral, unlike every prior target). */
  edgeShort: number;
  edgeLong: number;
  /** The 4 corners' own (radius, angle) in the face's own planar frame — corner 0 is where the two SHORT edges meet, corner 2 where the two LONG edges meet, matching real winding order. */
  corners: { r: number; theta: number }[];
}

/**
 * Measures a Catalan solid's own kite face directly from the registry
 * (never hand-copied): edge lengths, and each corner's own polar
 * position in the face's own planar frame (`u` toward corner 0,
 * `w = normal x u`).
 */
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

/**
 * Derives a kite adapter piece. Same merge pairing as squareToRdH.ts/
 * goldenRhombusToRdH.ts — `(v2,v3)` and `(v5,v6)`, leaving `v1`/`v4`
 * untouched — but which of the 4 hex groups plays which of the kite's
 * 4 (non-interchangeable) corner roles is now a real choice
 * `fitTargetPolygon` resolves by least total distortion, not assumed
 * from symmetry the way the rhombus piece's role assignment was.
 *
 * Scale: NOT rescaled at all -- uses `measured`'s own real, current
 * radii directly. An earlier version rescaled so the kite's own short
 * edge was exactly 1 (matching the "shared unit-edge convention" every
 * non-Catalan piece uses); a real bug, caught computationally
 * (2026-09-15) the same way goldenRhombusToRdH.ts's own EDGE=1 bug was:
 * direct `facesCongruent` testing against the live registry found zero
 * matches, because DELTOIDAL_ICOSITETRAHEDRON/HEXECONTAHEDRON are
 * Catalan solids (circumradius-1 normalized, not unit-edge --
 * `docs/catalan-solids-spec.md`), so a short-edge-1 kite is the wrong
 * absolute size to ever match either one. Fixed by keeping `measured`'s
 * own real scale untouched -- an adapter piece's target face must match
 * its target shape's CURRENT real scale, not an assumed convention.
 */
export function deriveKiteToRdH({ catalanId, pieceName }: KitePieceOptions): AdapterPieceResult {
  const measured = measureKiteFace(catalanId);
  const targetCorners: TargetCorner[] = measured.corners.map((c) => ({ relativeAngle: c.theta, radius: c.r }));

  const s6 = hemiRdStartState();
  const { centroid, u, w } = hemiRdInterfaceFrame();

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
    throw new Error(`deriveKiteToRdH(${pieceName}): step2 deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const step2InverseDeformation = (p: Vec3): Vec3 => {
    if (dist(p, targetV1) < TOL) return v1;
    if (dist(p, targetV4) < TOL) return v4;
    if (dist(p, targetM1) < TOL) return p;
    throw new Error(`deriveKiteToRdH(${pieceName}): step2 inverse deformation received an unexpected vertex position ${JSON.stringify(p)}`);
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
    // `fitTargetPolygon` is free to pick ANY of the 4 cyclic shifts
    // (whichever minimizes distortion), so output vertex `i` does NOT
    // necessarily hold measured-corner role `i` — `cornerIndexForGroup`
    // says which role it actually got. An earlier version of this check
    // assumed a fixed [short,long,long,short] position pattern and
    // produced spurious failures whenever a non-zero shift (a
    // perfectly valid, still-a-kite result) was chosen instead.
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

    // Mirror symmetry check: the two "side" roles (measured corners 1
    // and 3) must be equidistant from the centroid and have equal
    // interior angles -- the real defining property of a kite beyond
    // just its edge-length pattern (a general quadrilateral could share
    // that pattern without being a true kite). Located by their actual
    // assigned role, not a hardcoded output index.
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

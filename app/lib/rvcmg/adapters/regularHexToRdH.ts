/**
 * The Regular-Hexagon-to-RD-H adapter piece: the real (non-regular)
 * hemi-RD hex interface reshaped into a genuine REGULAR hexagon of edge
 * 1 — matching any unit-edge Archimedean solid with real regular
 * hexagonal faces (truncated tetrahedron, truncated octahedron,
 * truncated cuboctahedron, ...). Added "for the moment at least" (direct
 * user request, 2026-09-15) — a real, useful piece in its own right, NOT
 * a return to the earlier "regular hexagon" misunderstanding this
 * project expunged elsewhere (see docs/rvcmg-adapter-pieces-spec.md):
 * this one intentionally targets a genuine regular hexagon as its own
 * distinct destination shape, exactly the way every other piece targets
 * its own distinct destination shape. Which specific hexagon-faced
 * Archimedean solid it's named after is left open for now — every
 * unit-edge-normalized one shares the exact same regular hexagon.
 *
 * Structurally different from every other piece: same vertex count on
 * both ends (6 -> 6), not a reduction. RVCMG has no single primitive
 * for "reshape without changing count" (spec V1: the primitive acts on
 * vertices via coalescence, not free repositioning), so this is built
 * as a real composite transformation (spec §8) — a genuine, non-
 * synthetic demonstration of the "S6(a) <-> S6(b)" same-vertex-count
 * state-graph edge spec §10/Stage 5 names as a first-class case
 * (stateGraph.test.ts only ever exercised that case with a synthetic
 * placeholder op, not a real geometric one): coalesce (v1,v2) together
 * [6 -> 5], immediately split the result back apart at the two REAL
 * target corner positions [5 -> 6], deforming v3..v6 to their own
 * final corners in the first step (they don't need to move again in
 * the second).
 */

import { dist, type Vec3 } from '../../polyhedra/core';
import { hemiRdInterfaceFrame } from '../hemiRdInterface';
import { coalesce } from '../coalesce';
import { separate } from '../separate';
import { splitVertex } from '../splitVertex';
import { verifyTransition } from '../verify';
import { statesApproximatelyEqual } from '../types';
import { hemiRdStartState } from './triangleToRdH';
import { assignTargetAngles } from './shared';
import type { RvcmgState, CoalescenceOp } from '../types';
import type { AdapterPieceResult } from './triangleToRdH';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function deriveRegularHexToRdH(): AdapterPieceResult {
  const s6 = hemiRdStartState();
  const { centroid, u, w } = hemiRdInterfaceFrame();

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

  // Step 1 (coalesce, 6 -> 5): merge v1,v2 at a transient position
  // (their own two final targets' midpoint -- reasonable and non-
  // arbitrary, though it doesn't need to be exact since it's replaced
  // outright in step 2), deforming v3..v6 to their REAL final corners
  // now, since they never move again after this.
  const transientM = scale(add(targetV1, targetV2), 0.5);
  const step1Deformation = (p: Vec3): Vec3 => {
    if (dist(p, v3) < TOL) return targetV3;
    if (dist(p, v4) < TOL) return targetV4;
    if (dist(p, v5) < TOL) return targetV5;
    if (dist(p, v6) < TOL) return targetV6;
    throw new Error(`deriveRegularHexToRdH: step1 deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const step1InverseDeformation = (p: Vec3): Vec3 => {
    if (dist(p, targetV3) < TOL) return v3;
    if (dist(p, targetV4) < TOL) return v4;
    if (dist(p, targetV5) < TOL) return v5;
    if (dist(p, targetV6) < TOL) return v6;
    throw new Error(`deriveRegularHexToRdH: step1 inverse deformation received an unexpected vertex position ${JSON.stringify(p)}`);
  };
  const s5 = coalesce(s6, 'v1', 'v2', transientM, step1Deformation);
  const op1: CoalescenceOp = {
    id: 'regular-hex-to-rd-h-step1', fromStateId: s6.id, toStateId: s5.id, coalescedPair: ['v1', 'v2'],
    targetPos: transientM, path: 'symmetric', deformation: step1Deformation, inverse: 'regular-hex-to-rd-h-step1-inv',
  };

  const problems: string[] = verifyTransition(op1, s6, s5, { inverseDeformation: step1InverseDeformation }).map((p) => `step1: ${p}`);

  // Step 2 (splitVertex, 5 -> 6): split the merged vertex back apart at
  // its two REAL final corners. v3..v6 are already at their final
  // positions from step 1 -- identity deformation, no further movement.
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

  // Derivation-reversibility of the whole composite: undo the split
  // (coalesce v1r/v2r back), then undo the coalesce (separate() -- this
  // one WAS a genuine coalesce product, so separate() applies directly).
  const undoSplit = coalesce(s6Regular, 'v1r', 'v2r', transientM);
  // Relabel BOTH the id and sourceIds back to what the real step-1
  // coalesce actually produced ('v1'/'v2') -- undoSplit's own coalesce
  // call only knows about 'v1r'/'v2r' (this composite's own transient
  // names), so its sourceIds say that, not the true original pair. Only
  // fixing `id` and leaving `sourceIds` as ['v1r','v2r'] would make the
  // next separate() call restore the WRONG (though positionally
  // correct) ids -- confirmed live, not a hypothetical.
  const undoSplitRelabeled: RvcmgState = {
    ...undoSplit,
    vertices: undoSplit.vertices.map((v) => (v.id === '(v1r+v2r)' ? { ...v, id: mergedId, sourceIds: ['v1', 'v2'] } : v)),
  };
  if (!statesApproximatelyEqual(undoSplitRelabeled, s5)) {
    problems.push('undoing step 2 (coalescing v1r/v2r back) does not reproduce the post-step-1 state');
  }
  const undoCoalesce = separate(undoSplitRelabeled, mergedId, [posOf(s6, 'v1'), posOf(s6, 'v2')], step1InverseDeformation);
  if (!statesApproximatelyEqual(undoCoalesce, s6)) {
    problems.push('undoing step 1 (separating v1/v2 back) does not reproduce the original hemi-RD hex interface');
  }

  return { states: [s6, s5, s6Regular], ops: [op1], problems };
}

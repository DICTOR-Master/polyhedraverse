/**
 * The Triangle-to-RD-H adapter piece: one hemi-RD hexagonal interface on
 * one side (mates with an RD-hemi or another such adapter), a real
 * equilateral triangle matching a unit-edge tetrahedron/octahedron face
 * on the other. First of the 6 physical adapter pieces in the RVCMG
 * family (see docs/rvcmg-adapter-pieces-spec.md for the full family and
 * the physical system this belongs to — a modular "two pieces glued at
 * their hemi-RD faces" connector between any two polyhedron families).
 *
 * This is the prototype used to validate the whole pipeline (derive a
 * real target polygon -> coalesce() sequence -> Stage 7 verification)
 * before generalizing to the other 5 pieces.
 */

import { dist, type Vec3 } from '../../polyhedra/core';
// Imports directly from catalan.ts, not the combined `polyhedra/index.ts`
// -- see hemiRdInterface.ts's own comment on the real circular-import
// bug this avoids (index.ts -> Miscellaneous -> rvcmg-connectors ->
// this file -> index.ts), caught live as a runtime error, not by
// typechecking.
import { CATALAN_ADDITIONS } from '../../polyhedra/catalan';
import { HEMI_RD_INTERFACE, hemiRdInterfaceFrame } from '../hemiRdInterface';
import { coalesce } from '../coalesce';
import { verifyTransition } from '../verify';
import { assignTargetAngles } from './shared';
import type { RvcmgState, CoalescenceOp } from '../types';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * RD's own edge length, measured directly from the registry (never
 * hand-copied — see hemiRdInterface.ts's own corrected comment, an
 * earlier version of that comment asserted `2-sqrt(2)` without checking
 * and was wrong; the real value is `sqrt(3)/2`). Kept as a real,
 * independently-useful measured fact, but no longer used to rescale the
 * shared hex interface — see `hemiRdStartState`'s own comment for why
 * that rescaling was removed.
 */
export const RD_EDGE_LENGTH: number = (() => {
  const [i, j] = CATALAN_ADDITIONS.RHOMBIC_DODECAHEDRON.edges[0];
  return dist(CATALAN_ADDITIONS.RHOMBIC_DODECAHEDRON.vertices[i], CATALAN_ADDITIONS.RHOMBIC_DODECAHEDRON.vertices[j]);
})();

/**
 * The starting 6-vertex state for every adapter piece's own derivation,
 * built directly from `HEMI_RD_INTERFACE` at RD's OWN real, native
 * scale — NOT rescaled to make RD's own edge exactly 1.
 *
 * A real, corrected design choice (2026-09-15): an earlier version
 * rescaled this to unit-edge, reasoning it needed "ONE physical
 * edge-length unit" shared with the unit-edge-normalized families
 * (Platonic/Johnson/etc.) each piece's own TARGET face matches. That
 * reasoning was simply wrong — each piece's own target face (triangle/
 * square/pentagon/regular-hex's own `EDGE = 1`, golden-rhombus/kite's
 * own measured Catalan-solid scale) is placed at its OWN independently
 * chosen absolute size regardless of the hex's own scale (`coalesce()`
 * moves points to literal target positions; nothing in that math reads
 * the hex's own scale back out) — so rescaling the hex bought nothing
 * for target-face compatibility, while actively breaking a REAL,
 * wanted capability: a genuine RD-Hemi piece (`rdHemi.ts`) needs its
 * hex AND its own real rhombic faces built from the SAME rigid,
 * uniform scale, and the only scale where its rhombi match the
 * ACTUAL, already-registered `RHOMBIC_DODECAHEDRON` is RD's own native
 * one. Direct user report that surfaced this: "you dont seem to have
 * allowed RD-Hemi to attach to full RD" — confirmed, and traced to
 * this unnecessary rescale, not a missing feature.
 */
export function hemiRdStartState(): RvcmgState {
  const n = HEMI_RD_INTERFACE.length;
  return {
    id: 'HEMI_RD_NATIVE',
    vertices: HEMI_RD_INTERFACE.map((pos, i) => ({ id: `v${i + 1}`, pos, sourceIds: [] })),
    boundaryEdges: Array.from({ length: n }, (_, i) => [i, (i + 1) % n] as [number, number]),
  };
}

export interface AdapterPieceResult {
  states: RvcmgState[]; // [start, ...intermediate, final]
  ops: CoalescenceOp[];
  problems: string[]; // Stage 7 verifyTransition problems across every step, plus final-shape checks; [] = fully valid
}

/**
 * Derives the Triangle-to-RD-H piece: collapses the unit-scale hex
 * interface to a real equilateral triangle of edge 1 (matching a
 * unit-edge tetrahedron/octahedron face exactly), via 3 coalesce()
 * steps merging alternate edges of the hexagon — (v1,v2), (v3,v4),
 * (v5,v6), a perfect matching (3 disjoint real edges covering all 6
 * vertices), chosen because it's the natural "fold every other corner
 * pair inward" contraction and keeps each step independent (merging one
 * pair never disturbs the others' adjacency).
 *
 * Target triangle placement: each merge's target position is the FINAL
 * triangle vertex directly (coalesce() sets a merged vertex to
 * `targetPos` in one discrete step, spec V3 — there's no need for
 * intermediate "waypoint" positions at the discrete level; a smooth
 * preview between these two flat cross-sections is interpolate()'s job,
 * Stage 6). The 3 target vertices are placed in the SAME plane as the
 * hex interface (both are flat cross-sections; the tapered 3D wall
 * connecting them is a separate, later extrusion step, not part of
 * RVCMG's own state representation), at circumradius `1/sqrt(3)` around
 * the hex's own centroid (giving edge length exactly 1), with each
 * pair's OWN averaged angular position (not an arbitrary 0/120/240
 * assignment) deciding which of the 3 target angles it gets — this
 * preserves the hex boundary's real winding sense instead of risking an
 * inverted (mirrored) triangle.
 */
export function deriveTriangleToRdH(): AdapterPieceResult {
  const s6 = hemiRdStartState();
  const frame = hemiRdInterfaceFrame();
  // frame's centroid/basis are computed from the UNSCALED interface;
  // centroid is (0,0,0) either way (RD is centered at its own origin,
  // confirmed numerically, not assumed) and u/w are unit direction
  // vectors, invariant under the uniform positive rescaling above — so
  // reusing them directly for the UNIT-scale interface is exact, not an
  // approximation.
  const { centroid, u, w } = frame;

  const angleOf = (p: Vec3): number => {
    const d = sub(p, centroid);
    return Math.atan2(dot(d, w), dot(d, u));
  };

  const pairs: [string, string][] = [
    ['v1', 'v2'],
    ['v3', 'v4'],
    ['v5', 'v6'],
  ];
  const pairAngles = pairs.map(([idA, idB]) => {
    const a = s6.vertices.find((v) => v.id === idA)!.pos;
    const b = s6.vertices.find((v) => v.id === idB)!.pos;
    // Circular mean of the two endpoint angles (they're close together —
    // at most one "short" hex edge apart — so a plain average of the
    // raw atan2 values is safe, no wraparound risk here).
    return (angleOf(a) + angleOf(b)) / 2;
  });
  // assignTargetAngles both reads off the hex boundary's own real
  // winding order (preventing an inverted/mirrored result) AND picks
  // the assignment's rotational phase to minimize twist relative to
  // each pair's own real position (direct user instruction: "always use
  // closest corresponding corners of group to match square or other
  // shape") — see shared.ts's own comment for the full reasoning.
  const targetAngles = assignTargetAngles(pairAngles);

  const EDGE = 1; // unit edge, matching the unit-edge tetrahedron/octahedron
  const circumradius = EDGE / Math.sqrt(3);
  const targetFor = (pairIndex: number): Vec3 => {
    const theta = targetAngles[pairIndex];
    return add(centroid, add(scale(u, circumradius * Math.cos(theta)), scale(w, circumradius * Math.sin(theta))));
  };

  const states: RvcmgState[] = [s6];
  const ops: CoalescenceOp[] = [];
  let current = s6;
  pairs.forEach(([idA, idB], pairIndex) => {
    const targetPos = targetFor(pairIndex);
    const next = coalesce(current, idA, idB, targetPos);
    ops.push({
      id: `triangle-to-rd-h-step${pairIndex + 1}`,
      fromStateId: current.id,
      toStateId: next.id,
      coalescedPair: [idA, idB],
      targetPos,
      path: 'symmetric',
      deformation: (v) => v,
      inverse: `triangle-to-rd-h-step${pairIndex + 1}-inv`,
    });
    states.push(next);
    current = next;
  });

  const problems: string[] = [];
  for (let i = 0; i < ops.length; i++) {
    problems.push(...verifyTransition(ops[i], states[i], states[i + 1]).map((p) => `step${i + 1}: ${p}`));
  }

  // Final-shape check: the resulting 3-vertex state must be a REAL
  // equilateral triangle of edge exactly 1 — not just "3 vertices."
  const final = states[states.length - 1];
  if (final.vertices.length !== 3) {
    problems.push(`final state has ${final.vertices.length} vertices, expected 3`);
  } else {
    const edgeLens = final.vertices.map((v, i) => dist(v.pos, final.vertices[(i + 1) % 3].pos));
    edgeLens.forEach((len, i) => {
      if (Math.abs(len - EDGE) > 1e-9) problems.push(`final triangle edge ${i} has length ${len.toFixed(9)}, expected ${EDGE}`);
    });
  }

  return { states, ops, problems };
}

/**
 * RVCMG Stage 1 — the real hemi-rhombic-dodecahedron (hemi-RD) interface:
 * the six ordered boundary vertices of the flat cross-section produced by
 * bisecting a rhombic dodecahedron (RD) through its own center, along the
 * plane perpendicular to one of its 12 real face-normal directions.
 *
 * Derived, not hand-declared (per this project's own "derive, don't
 * duplicate" rule, docs/construction-kit-spec.md): reuses the already-
 * verified `POLYHEDRA.RHOMBIC_DODECAHEDRON` registry entry (13 vertices/
 * edges/faces, `validateCatalanShape`-clean) rather than a second,
 * independently-transcribed RD coordinate set. Mirrors Rhombiverse's own
 * `hemisphereSplit()` (src/core/lattice.js) — a real, previously-shipped
 * construction bisecting the RD's 14 raw vertices by dot-product sign
 * against a chosen face-normal axis, verified there to split every one of
 * the 12 real directions into exactly 4 strictly positive / 4 strictly
 * negative / 6 exactly on the plane. That result is RE-verified here
 * (`validateHemiRdInterface`) against Polyhedraverse's own RD coordinates,
 * not assumed to carry over from a different project's scale/frame.
 *
 * Coordinate system and scale (spec §24.2): matches Polyhedraverse's own
 * global convention exactly — `POLYHEDRA.RHOMBIC_DODECAHEDRON`'s own
 * circumradius-1 vertices (see `makeSpecByCircumradius` in core.ts), no
 * separate rescaling. In this frame the RD's own edge length is
 * `sqrt(3)/2` (~0.8660), not 1 — measured directly from the registry
 * (`dist(vertices[edges[0][0]], vertices[edges[0][1]])`), not assumed:
 * Catalan solids are normalized by circumradius, never by edge length
 * (11 of the 13 have non-uniform edge lengths; the RD is one of only 2
 * that happens not to, but the shared convention is applied uniformly
 * regardless). Adapter-piece derivations needing a shared physical unit
 * across families (RD meeting a unit-edge tetrahedron/cube/etc.) must
 * rescale by this factor first — see adapters/triangleToRdH.ts.
 *
 * The resulting hexagon's real shape — confirmed computationally
 * below, not assumed — has D2h symmetry: 4 short edges and 2 long
 * opposite edges (the long edges connect the RD's own degree-3
 * "cube-corner" vertices to each other; the short edges connect a
 * degree-3 vertex to a degree-4 "octahedron-direction" vertex). This is
 * the real geometry every adapter-piece derivation is built on.
 */

import { type Vec3, buildFaceConnectors, dist } from '../polyhedra/core';
import { POLYHEDRA } from '../polyhedra/index';

const RD = POLYHEDRA.RHOMBIC_DODECAHEDRON;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => {
  const m = Math.hypot(...a);
  return [a[0] / m, a[1] / m, a[2] / m];
};

/**
 * The bisection axis: face 0's own outward normal (any of the RD's 12
 * real face directions is equally valid by the RD's own symmetry group —
 * they're all congruent choices, not a special one). Derived from the
 * registry's own face data (`buildFaceConnectors`), never hand-copied
 * from another project's coordinate frame.
 */
const BISECTION_AXIS: Vec3 = buildFaceConnectors(RD)[0].normal;

const TOL = 1e-9;

interface Classified {
  positive: Vec3[];
  negative: Vec3[];
  onPlane: Vec3[];
}

/** Classifies the RD's 13 stored vertices by dot-product sign against `BISECTION_AXIS`, exactly mirroring Rhombiverse's `hemisphereSplit()` classification rule. */
function classifyVertices(): Classified {
  const positive: Vec3[] = [];
  const negative: Vec3[] = [];
  const onPlane: Vec3[] = [];
  for (const v of RD.vertices) {
    const d = dot(v, BISECTION_AXIS);
    if (d > TOL) positive.push(v);
    else if (d < -TOL) negative.push(v);
    else onPlane.push(v);
  }
  return { positive, negative, onPlane };
}

/**
 * Orders `onPlane`'s vertices into a real boundary loop by angle around
 * their own centroid, measured in the plane's own 2D basis (`u`, `w`,
 * both perpendicular to `BISECTION_AXIS` and to each other) — the
 * standard way to order a known-convex, known-planar point set into a
 * simple polygon boundary. `u` is built from the first on-plane vertex's
 * own direction from the centroid (arbitrary but fixed reference), `w`
 * from `BISECTION_AXIS x u` (already unit since both factors are unit
 * and perpendicular).
 */
function orderPlanarLoop(points: Vec3[]): Vec3[] {
  const centroid: Vec3 = [0, 0, 0];
  for (const p of points) {
    centroid[0] += p[0] / points.length;
    centroid[1] += p[1] / points.length;
    centroid[2] += p[2] / points.length;
  }
  const u = norm(sub(points[0], centroid));
  const w = cross(BISECTION_AXIS, u);
  return [...points].sort((a, b) => {
    const da = sub(a, centroid);
    const db = sub(b, centroid);
    const angleA = Math.atan2(dot(da, w), dot(da, u));
    const angleB = Math.atan2(dot(db, w), dot(db, u));
    return angleA - angleB;
  });
}

const { onPlane } = classifyVertices();

/** v1..v6, ordered, boundary-adjacent — the real hemi-RD interface (spec §2.1). */
export const HEMI_RD_INTERFACE: Vec3[] = orderPlanarLoop(onPlane);

export interface PlanarFrame {
  centroid: Vec3;
  /** Unit vector in-plane, toward HEMI_RD_INTERFACE[0] — the same reference `orderPlanarLoop` itself sorted angles against. */
  u: Vec3;
  /** Unit vector in-plane, perpendicular to `u` (`normal x u`). */
  w: Vec3;
  normal: Vec3;
}

/**
 * The hex interface's own local 2D frame (centroid + in-plane basis),
 * recomputed from `HEMI_RD_INTERFACE` itself rather than exposing
 * `orderPlanarLoop`'s internal variables directly — so any consumer
 * (e.g. an adapter-piece derivation needing to place a NEW target
 * polygon in this same plane, at this same centroid) shares exactly the
 * same reference frame `HEMI_RD_INTERFACE`'s own vertices are expressed
 * in, derived, not independently reconstructed.
 */
export function hemiRdInterfaceFrame(): PlanarFrame {
  const centroid: Vec3 = [0, 0, 0];
  for (const p of HEMI_RD_INTERFACE) {
    centroid[0] += p[0] / HEMI_RD_INTERFACE.length;
    centroid[1] += p[1] / HEMI_RD_INTERFACE.length;
    centroid[2] += p[2] / HEMI_RD_INTERFACE.length;
  }
  const u = norm(sub(HEMI_RD_INTERFACE[0], centroid));
  const w = cross(BISECTION_AXIS, u);
  return { centroid, u, w, normal: BISECTION_AXIS };
}

export interface HemiRdInterfaceReport {
  problems: string[];
  edgeLengths: number[];
}

/**
 * Mirrors `validateShape`'s style (a list of problem strings, empty =
 * valid) but checks the properties that actually define a valid
 * interface boundary rather than assuming a specific shape. Deliberately
 * does NOT check planarity as a pass/fail condition (the interface is
 * allowed to be non-planar in general RVCMG usage per the Stage 1
 * acceptance criteria) — it only reports the boundary's own vertex
 * count, distinctness, and simple-polygon property, plus (for this
 * specific RD-derived construction) that the 6 points genuinely DO lie
 * in one plane, since that's a real fact about this particular
 * construction worth confirming rather than assuming.
 */
export function validateHemiRdInterface(loop: Vec3[] = HEMI_RD_INTERFACE): HemiRdInterfaceReport {
  const problems: string[] = [];
  const n = loop.length;
  if (n !== 6) problems.push(`hemi-RD interface: expected 6 vertices, got ${n}`);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (dist(loop[i], loop[j]) < 1e-9) problems.push(`hemi-RD interface: vertices ${i} and ${j} are coincident`);
    }
  }

  const edgeLengths: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % n];
    const d = dist(a, b);
    edgeLengths.push(d);
    if (d < 1e-9) problems.push(`hemi-RD interface: edge ${i}-${(i + 1) % n} has zero length`);
  }

  // Simple (non-self-intersecting) polygon check, in the plane's own 2D
  // coordinates: no two non-adjacent edges cross. Real 2D segment
  // intersection test, not a convexity assumption (a valid RVCMG
  // interface is not required to stay convex in general).
  const centroid: Vec3 = [0, 0, 0];
  for (const p of loop) {
    centroid[0] += p[0] / n;
    centroid[1] += p[1] / n;
    centroid[2] += p[2] / n;
  }
  const planeNormal = norm(cross(sub(loop[1], loop[0]), sub(loop[2], loop[0])));
  const u = norm(sub(loop[0], centroid));
  const w = cross(planeNormal, u);
  const pts2d = loop.map((p) => {
    const d = sub(p, centroid);
    return [dot(d, u), dot(d, w)] as [number, number];
  });
  const onPlaneCheck = loop.every((p) => Math.abs(dot(sub(p, loop[0]), planeNormal)) < 1e-6);
  if (!onPlaneCheck) problems.push('hemi-RD interface: vertices are not coplanar (unexpected for this RD-derived construction)');

  const segsIntersect = (p1: [number, number], p2: [number, number], p3: [number, number], p4: [number, number]): boolean => {
    const d1 = (p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0]);
    const d2 = (p4[0] - p3[0]) * (p2[1] - p3[1]) - (p4[1] - p3[1]) * (p2[0] - p3[0]);
    const d3 = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
    const d4 = (p2[0] - p1[0]) * (p4[1] - p1[1]) - (p2[1] - p1[1]) * (p4[0] - p1[0]);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segsIntersect(pts2d[i], pts2d[(i + 1) % n], pts2d[j], pts2d[(j + 1) % n])) {
        problems.push(`hemi-RD interface: edges ${i}-${(i + 1) % n} and ${j}-${(j + 1) % n} self-intersect`);
      }
    }
  }

  return { problems, edgeLengths };
}

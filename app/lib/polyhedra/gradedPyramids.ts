/**
 * Graded pyramids: a regular-n-gon base (unit edge) topped by an apex
 * whose height is derived from a TARGET APEX ANGLE (the interior angle
 * of each lateral triangular face, at the apex) rather than a single
 * fixed height — a face-attach add-on family, genuinely different from
 * RVCMG's own vertex-coalescence math (this is a classic "base polygon
 * + apex at some height" construction, the same shape as a Johnson-
 * solid pyramid, just with the height left as a free, graded parameter
 * instead of fixed at the one value that makes every lateral face
 * equilateral).
 *
 * Direct user request (2026-09-15): a "miscellaneous" family of
 * irregular add-on pieces including graded pyramids (grade 1 = low,
 * 2 = standard/regular height — matches whatever regular-faced pyramid
 * already exists for that base — 3 = tall, 4 = sharp/star-solid-like;
 * no grade 0, the scale starts at 1) on various base shapes. This file
 * prototypes the REGULAR-polygon-base
 * case (triangular base first, per direct instruction, to validate the
 * apex-angle-to-height math before generalizing to square/pentagon/
 * hexagon and later to IRREGULAR bases (golden rhombus, kite, the real
 * hemi-RD hexagon), which need a different approach entirely since
 * their lateral faces aren't all congruent — not yet started).
 *
 * The math: for a regular n-gon base of edge 1, its own circumradius is
 * `R = 1 / (2*sin(pi/n))`. A lateral face is an isosceles triangle with
 * base edge 1 and two equal slant sides of length `L`; the apex angle
 * `theta` (opposite that base edge) relates to `L` via
 * `1 = 2*L*sin(theta/2)`, so `L = 1 / (2*sin(theta/2))`. The apex sits
 * directly above the base's own centroid at height `h`, where
 * `L^2 = h^2 + R^2` (a right triangle formed by the apex, the centroid,
 * and one base vertex) — so `h = sqrt(L^2 - R^2)`.
 *
 * **Real, verified constraint**: this only has a real solution when
 * `L > R`, i.e. `theta < 360/n` degrees — beyond that the pyramid is
 * geometrically impossible (the apex would have to sit BELOW the base
 * plane to reach that shallow an angle, or the base itself isn't
 * planar-consistent with it). At `theta = 360/n` exactly, `h = 0` (the
 * apex collapses onto the base's own centroid — confirmed directly:
 * for a TRIANGULAR base this is 120 degrees, and it is not a
 * coincidence that `n >= 6` therefore makes the well-known "regular
 * hexagonal pyramid with equilateral triangle sides" construction
 * IMPOSSIBLE (`360/6 = 60` degrees is exactly the equilateral-triangle
 * apex angle needed, i.e. right at the degenerate limit) — this is
 * the real reason no Johnson solid or convex deltahedron is a regular-
 * faced hexagonal pyramid.
 */

import { type Vec3, centerVertices, dist, buildConnectors, type PolyhedronSpec } from './core';

/**
 * Default grading scale, proposed and documented as an adjustable
 * default (not a forced convention). Numbered 1-4 (no grade 0), direct
 * user renumbering (2026-09-15):
 *
 * - Grade 2 (standard): fixed at the base's own "all lateral faces
 *   equilateral" angle (`60` degrees always, since a unit-edge
 *   equilateral triangle's own apex angle is 60 regardless of which
 *   base shape it's attached to) so it reproduces whatever regular-
 *   faced pyramid already exists in the registry for that base (D4 for
 *   a triangular base, J1 for square, J2 for pentagonal).
 * - Grade 1 (low): "about half of grade 2's height" (direct user
 *   description) — a statement about HEIGHT, not a fixed angle. The
 *   angle achieving that height is genuinely DIFFERENT per base shape
 *   (`gradeApexAngleDeg` below derives it via `apexAngleForHeight`),
 *   NOT a single reusable number: for a triangular base it works out to
 *   exactly 90 degrees (a clean milestone — the two slant edges
 *   perpendicular at the apex), but reusing that literal 90 for a
 *   SQUARE base is a real bug this project shipped and caught —
 *   90 degrees is exactly the square base's own degenerate limit
 *   (`360/4`), so it crashed outright rather than silently building a
 *   slightly-wrong shape. Always compute this per base via
 *   `gradeApexAngleDeg`, never hard-code an angle for grade 1.
 * - Grade 3 (tall): 40 degrees (fixed, base-agnostic — verified below
 *   to stay comfortably under every currently-supported base's own
 *   degenerate limit, not merely assumed safe).
 * - Grade 4 (highest/sharpest): 20 degrees — a deliberately sharp,
 *   star-polyhedra-evoking angle, the user's own "sharp tall like star
 *   solids type" description (same base-agnostic-but-verified status
 *   as grade 3).
 */
const FIXED_GRADE_ANGLES: Record<number, number> = { 2: 60, 3: 40, 4: 20 };

/**
 * Resolves a grade's real apex angle for a specific base shape `n`.
 * Grade 1 is DERIVED (half of grade 2's own height for this exact `n`,
 * converted back to an angle) rather than looked up from a fixed table
 * — see this file's own grading-scale comment for why a fixed number
 * doesn't generalize across base shapes.
 */
export function gradeApexAngleDeg(n: number, grade: number): number {
  if (grade === 1) {
    const standardHeight = apexHeightForAngle(n, FIXED_GRADE_ANGLES[2]);
    return apexAngleForHeight(n, standardHeight / 2);
  }
  const angle = FIXED_GRADE_ANGLES[grade];
  if (angle === undefined) throw new Error(`gradeApexAngleDeg: unknown grade ${grade}`);
  return angle;
}

export const GRADE_NUMBERS: number[] = [1, 2, 3, 4];

/** The degenerate apex-angle limit (degrees) for a regular n-gon base, beyond which no real pyramid exists. */
export function degenerateApexAngleDeg(n: number): number {
  return 360 / n;
}

/** A regular n-gon base's own circumradius, unit edge length. */
export function regularPolygonCircumradius(n: number): number {
  return 1 / (2 * Math.sin(Math.PI / n));
}

/** The apex height for a regular n-gon (unit edge) base and a target apex angle (degrees). Throws if the angle is at or beyond the degenerate limit. */
export function apexHeightForAngle(n: number, apexAngleDeg: number): number {
  const limit = degenerateApexAngleDeg(n);
  if (apexAngleDeg >= limit) {
    throw new Error(`apexHeightForAngle: ${apexAngleDeg}° is at or beyond the degenerate limit (${limit}°) for a regular ${n}-gon base`);
  }
  const R = regularPolygonCircumradius(n);
  const L = 1 / (2 * Math.sin((apexAngleDeg * Math.PI) / 180 / 2));
  return Math.sqrt(L * L - R * R);
}

/**
 * The inverse of `apexHeightForAngle`: the apex angle (degrees) that
 * gives a regular n-gon (unit edge) base a specific target height.
 * Needed because "grade 1 = about half of grade 2's height" (direct
 * user description) is a statement about HEIGHT, not angle — and the
 * angle that achieves a given height is genuinely different per base
 * shape `n` (a real bug this project shipped and caught: reusing
 * triangular base's own derived 90° angle directly as a fixed number
 * for a SQUARE base crashed outright, because 90° is exactly the
 * square base's own degenerate limit — `360/4` — not a coincidence
 * worth losing by treating one base's derived angle as if it were a
 * universal constant).
 */
export function apexAngleForHeight(n: number, height: number): number {
  const R = regularPolygonCircumradius(n);
  const L = Math.sqrt(height * height + R * R);
  return (2 * Math.asin(1 / (2 * L)) * 180) / Math.PI;
}

/**
 * Builds a graded pyramid on a regular n-gon (unit edge) base. Returns
 * a real `PolyhedronSpec`-shaped object (vertices/edges/faces/
 * connectors), centered per this registry's own convention, but is
 * NOT added to the shared `POLYHEDRA` registry here — this is the
 * prototype construction, not yet wired into the family/registry
 * system (see gradedPyramids.test.ts for verification, and
 * docs/rvcmg-adapter-pieces-spec.md's own "Outstanding" notes for the
 * planned "Miscellaneous" family this belongs to).
 */
export function buildGradedPyramid(n: number, apexAngleDeg: number, id: string, name: string): PolyhedronSpec {
  const h = apexHeightForAngle(n, apexAngleDeg);
  const baseRaw: Vec3[] = Array.from({ length: n }, (_, k) => {
    const theta = (2 * Math.PI * k) / n;
    const R = regularPolygonCircumradius(n);
    return [R * Math.cos(theta), R * Math.sin(theta), 0] as Vec3;
  });
  const apexRaw: Vec3 = [0, 0, h];
  const vertices = centerVertices([...baseRaw, apexRaw]);
  const apexIndex = n;

  const edges: [number, number][] = [];
  for (let k = 0; k < n; k++) edges.push([k, (k + 1) % n]);
  for (let k = 0; k < n; k++) edges.push([k, apexIndex]);

  // Base face wound so its outward normal points AWAY from the apex
  // (downward); lateral faces wound outward per the standard "apex,
  // base[k], base[k+1]" order, matching this registry's own outward-
  // winding convention elsewhere (e.g. deltahedra.ts's own faces).
  const faces: number[][] = [Array.from({ length: n }, (_, k) => n - 1 - k)];
  for (let k = 0; k < n; k++) faces.push([apexIndex, k, (k + 1) % n]);

  return { id, name, faceCount: n + 1, vertices, edges, faces, connectors: buildConnectors(vertices, edges) };
}

/** Re-checks base edges = 1, lateral edges all equal, and the achieved apex angle matches the requested one — mirrors `validateShape`'s style. */
export function validateGradedPyramid(spec: PolyhedronSpec, n: number, expectedApexAngleDeg: number, tol = 1e-9): string[] {
  const problems: string[] = [];
  for (let k = 0; k < n; k++) {
    const d = dist(spec.vertices[k], spec.vertices[(k + 1) % n]);
    if (Math.abs(d - 1) > tol) problems.push(`${spec.id}: base edge ${k} length ${d.toFixed(9)} != 1`);
  }
  const apexIndex = n;
  const slantLengths = Array.from({ length: n }, (_, k) => dist(spec.vertices[k], spec.vertices[apexIndex]));
  const slant0 = slantLengths[0];
  slantLengths.forEach((L, k) => {
    if (Math.abs(L - slant0) > tol) problems.push(`${spec.id}: slant edge ${k} length ${L.toFixed(9)} != slant edge 0 (${slant0.toFixed(9)})`);
  });
  // Measured apex angle, from real vectors, not assumed from the formula alone.
  const a = spec.vertices[0];
  const b = spec.vertices[1];
  const apex = spec.vertices[apexIndex];
  const v1: Vec3 = [a[0] - apex[0], a[1] - apex[1], a[2] - apex[2]];
  const v2: Vec3 = [b[0] - apex[0], b[1] - apex[1], b[2] - apex[2]];
  const cos = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (Math.hypot(...v1) * Math.hypot(...v2));
  const measuredAngleDeg = (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
  if (Math.abs(measuredAngleDeg - expectedApexAngleDeg) > 1e-6) {
    problems.push(`${spec.id}: measured apex angle ${measuredAngleDeg.toFixed(6)}° != requested ${expectedApexAngleDeg}°`);
  }
  return problems;
}

/**
 * RVCMG v2 shared interface — a small, universal regular hexagon,
 * replacing the RD-native hex (`hemiRdInterface.ts`) as every adapter
 * piece's shared mating face.
 *
 * Why this exists (direct user finding, 2026-09-16, recorded in full in
 * project memory): the RD-native hex reaches vertices out to
 * circumradius 1.0, while a unit-edge equilateral triangle's own
 * circumradius is only 0.577 — the old hex was never going to fit
 * inside the tightest target case. It also only has D2h (2-fold)
 * symmetry, which can't align cleanly with a triangle's 3-fold
 * symmetry.
 *
 * Sizing (direct user decision, 2026-09-17): circumradius = edge =
 * sqrt(2)/2, exactly matching a unit-edge SQUARE's own circumradius.
 * For unit-edge regular polygons, circumradius = 1/(2*sin(pi/n)):
 * triangle 0.5774, square 0.7071, pentagon 0.8507. sqrt(2)/2 sits
 * between the old hex's native scale (1.0) and the tight "hexagram"
 * hex you get by rotating a unit triangle 60° and intersecting it with
 * itself (circumradius exactly 1/3) — the user's own framing for where
 * the right size should fall. At this size, the triangle taper is a
 * mild 0.82x, the square taper is exactly 1.0x (zero taper), and the
 * pentagon taper is a mild 1.20x — no dramatic waisting toward any of
 * the three, which was the actual design goal, not merely "smaller
 * than before."
 *
 * Unlike `HEMI_RD_INTERFACE`, this hex is NOT derived from any existing
 * polyhedron — it's a plain, freestanding regular hexagon, built
 * directly rather than classified/ordered out of a bisected solid.
 * That also means it has full 6-fold symmetry (no distinguishable long/
 * short edges), so adapter derivations built on it need none of the
 * D2h-specific edge-alignment logic the RD-native pieces needed.
 */

import type { Vec3 } from '../polyhedra/core';

/** = edge length, for a regular hexagon. sqrt(2)/2 — see this file's own header for the derivation. */
export const HEX_CIRCUMRADIUS = Math.SQRT2 / 2;

/** v1..v6, evenly spaced 60 degrees apart, counterclockwise, starting at angle 0 — a plain regular hexagon in the z=0 plane. */
export const UNIVERSAL_HEX_INTERFACE: Vec3[] = Array.from({ length: 6 }, (_, i) => {
  const theta = (i * Math.PI) / 3;
  return [HEX_CIRCUMRADIUS * Math.cos(theta), HEX_CIRCUMRADIUS * Math.sin(theta), 0] as Vec3;
});

export interface PlanarFrame {
  centroid: Vec3;
  /** Unit vector in-plane, toward UNIVERSAL_HEX_INTERFACE[0]. */
  u: Vec3;
  /** Unit vector in-plane, perpendicular to `u`. */
  w: Vec3;
  normal: Vec3;
}

/**
 * The hex's own local 2D frame — trivial by construction (built directly
 * in the z=0 plane, centered at the origin), but exposed with the same
 * shape as `hemiRdInterfaceFrame()` so adapter derivations can share one
 * calling convention across both hex families.
 */
export function universalHexInterfaceFrame(): PlanarFrame {
  return { centroid: [0, 0, 0], u: [1, 0, 0], w: [0, 1, 0], normal: [0, 0, 1] };
}

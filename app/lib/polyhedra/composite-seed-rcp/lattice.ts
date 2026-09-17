/**
 * Composite-Seed RCP investigation, Stage 1 — the RD (rhombic
 * dodecahedron) cell-centre lattice Λ_RD, its 12 real centre-to-centre
 * offsets Δ_RD, facet-centroid offsets, and facet normals. Per
 * `claude_Composite_Seed_RCP_Investigation_Plan.md` Stage 1 and
 * `docs/composite-seed-rcp/audit.md` sections 2–3, and Appendix A items
 * 1–4 of `docs/composite-seed-rcp/hypothesis.md`.
 *
 * COORDINATE NORMALIZATION — stated once; every exported quantity below
 * is DERIVED from this one source, nothing hand-retyped a second time
 * (the whole point of "make the RD consistent dims all round"): this
 * module reuses `POLYHEDRA.RHOMBIC_DODECAHEDRON` directly (catalan.ts,
 * built via `makeSpecByCircumradius` — circumradius 1) rather than
 * restating RD vertex coordinates itself. This is the scale every other
 * registered Polyhedraverse solid already uses, and is exactly HALF the
 * hypothesis doc's own stated `(±1,±1,±1)` / `(±2,0,0)` realization
 * (hypothesis.md §2.1, audit.md §2.3) — picked because it's the scale
 * the Stage 0 reference RCP engine (`radialProjection.ts`) and the rest
 * of this repo already operate in, not because the hypothesis doc's own
 * doubled scale is wrong.
 *
 * A consequence of THIS specific choice, checked in
 * scripts/verify-composite-seed-lattice.ts rather than assumed: the RD's
 * inradius at circumradius 1 comes out to exactly √2/2, which makes
 * every one of the 12 real centre-to-centre offsets Δ_RD (each
 * `2·inradius` along that face's own outward unit normal) collapse to
 * an EXACT integer vector of the form `(±1,±1,0)` — the same literal
 * numbers as Rhombiverse's own unscaled `NEIGHBOR_OFFSETS` lattice
 * (`src/core/lattice.js:141–145`) and its FCC parity rule
 * `(x+y+z) % 2 === 0` (`lattice.js:160–162`). This is not leaned on
 * blindly — the verify script confirms it numerically for all 12
 * offsets, and confirms two adjacent cells placed at that exact offset
 * genuinely share 4 real coincident vertices (their common face), not
 * merely that the inradius arithmetic works out.
 *
 * These Δ_RD offsets are ⟨110⟩-type directions (two nonzero, equal-
 * magnitude coordinates) — hypothesis.md §2.1 explicitly warns these
 * must be kept distinct from the ⟨111⟩ directions (all three
 * coordinates nonzero) used by the octahedral/tetrahedral boundary
 * classes in `rcpMap.ts`. Nothing in this file uses a ⟨111⟩ direction;
 * that distinction is `rcpMap.ts`'s concern, not this lattice's.
 */

import type { Vec3 } from '../core';
import { buildFaceConnectors } from '../core';
import { POLYHEDRA } from '../index';

const RD_SPEC = POLYHEDRA.RHOMBIC_DODECAHEDRON;

/** This module's fixed scale — see file header. Every other exported constant here is measured at this circumradius, not re-normalized elsewhere. */
export const RD_CIRCUMRADIUS = 1;

/**
 * The RD's own inradius (perpendicular distance from centre to each of
 * its 12 rhombic faces) at circumradius 1 — MEASURED from the
 * registered shape's real face data (face centroid dotted with its own
 * outward unit normal — valid for ANY point on the plane, not just the
 * centroid, since a plane's own unit normal dotted with any point on it
 * always returns that plane's fixed signed distance from the origin),
 * not hand-typed. Cross-checked for uniformity across all 12 faces: a
 * non-uniform result would mean the registered shape isn't actually
 * face-transitive, which would invalidate every other export in this
 * file.
 */
export const RD_INRADIUS: number = (() => {
  const connectors = buildFaceConnectors(RD_SPEC);
  const radii = connectors.map((fc) => fc.pos[0] * fc.normal[0] + fc.pos[1] * fc.normal[1] + fc.pos[2] * fc.normal[2]);
  const r0 = radii[0];
  if (radii.some((r) => Math.abs(r - r0) > 1e-9)) {
    throw new Error('RHOMBIC_DODECAHEDRON is not uniform-inradius — composite-seed-rcp/lattice.ts assumptions are invalid');
  }
  return r0;
})();

export interface RdFacet {
  faceIndex: number;
  /** Outward unit normal, local space — same convention as core.ts's FaceConnector. One of the 12 ⟨110⟩-type directions. */
  normal: Vec3;
  /** Δ_RD's entry for this facet: the offset from this cell's own centre to the ADJACENT cell's centre across it — `2·RD_INRADIUS` along `normal`. */
  centreOffset: Vec3;
  /** f_i (Appendix A item 3): offset from this cell's own centre to this facet's own real centroid (the actual average of its 4 vertices, not assumed equal to `centreOffset / 2` — checked in the verify script). */
  centroidOffset: Vec3;
}

/**
 * The 12 real RD facets, each carrying its own outward normal (Appendix
 * A item 4), centre-to-centre offset (Δ_RD, item 2), and centroid offset
 * (item 3) — built directly from `buildFaceConnectors(RD_SPEC)`, one
 * entry per registered face, in the registry's own face order.
 */
export const RD_FACETS: RdFacet[] = buildFaceConnectors(RD_SPEC).map((fc) => ({
  faceIndex: fc.faceIndex,
  normal: fc.normal,
  centreOffset: [fc.normal[0] * 2 * RD_INRADIUS, fc.normal[1] * 2 * RD_INRADIUS, fc.normal[2] * 2 * RD_INRADIUS] as Vec3,
  centroidOffset: fc.pos,
}));

/** Δ_RD (Appendix A item 2): the 12 real centre-to-centre offsets, in `RD_FACETS`' own order. */
export const DELTA_RD: Vec3[] = RD_FACETS.map((f) => f.centreOffset);

/** ν_i (Appendix A item 4): the 12 real facet outward unit normals, in `RD_FACETS`' own order. */
export const RD_FACET_NORMALS: Vec3[] = RD_FACETS.map((f) => f.normal);

/**
 * Λ_RD (Appendix A item 1): the RD cell-centre lattice. An RD honeycomb's
 * cell centres form a face-centred-cubic (FCC) lattice — the RD IS the
 * Voronoi cell of an FCC lattice point (hypothesis.md §1.1, §2.1: "the
 * Voronoi cell associated with face-centred-cubic packing"). At this
 * module's circumradius-1 scale, Λ_RD is exactly the set of integer
 * points `(x,y,z)` with `x+y+z` even — the standard FCC parity rule,
 * and (per the file header) the same literal integers as Rhombiverse's
 * own lattice, not merely an analogous one.
 */
export function isLatticePoint(x: number, y: number, z: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) && (x + y + z) % 2 === 0;
}

/**
 * Every Λ_RD point within a closed axis-aligned box `[-L, L]^3` — a
 * finite superset of every boundary-selection region `rcpMap.ts` needs
 * (its L∞/L1/tetrahedral bounds are each themselves confined to this
 * box for the same `L`), so `rcpMap.ts`'s selection functions filter
 * this box rather than each re-deriving their own enumeration.
 */
export function latticePointsInBox(L: number): Vec3[] {
  const r = Math.floor(L + 1e-9);
  const pts: Vec3[] = [];
  for (let x = -r; x <= r; x++) {
    for (let y = -r; y <= r; y++) {
      for (let z = -r; z <= r; z++) {
        if (isLatticePoint(x, y, z)) pts.push([x, y, z]);
      }
    }
  }
  return pts;
}

export function keyOf3(v: Vec3): string {
  return `${v[0]},${v[1]},${v[2]}`;
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function dotVec3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

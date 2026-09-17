/**
 * Composite-Seed RCP investigation, Stage 1 — the map
 * `𝓡: 𝒜_RD → 𝒮_eff` (hypothesis.md §2.2, Appendix A item 6) from a
 * finite RD aggregate to its effective boundary representation, plus
 * the three boundary-selection functions `S_cube(L)`, `S_oct(L)`,
 * `S_tet(L)` (hypothesis.md §5.1–§5.3, Appendix A item 5).
 *
 * This file does NOT reimplement the RCP reference engine's own
 * reflection math — per the investigation plan's explicit instruction
 * ("built on the Stage 0 reference RCP engine's actual d, m₀, R_m
 * definitions... do not invent a parallel definition"), the actual
 * seed-embedding depth / bisecting-mirror / reflection-operator formulas
 * live in `../radialProjection.ts` (`bisectingMirror`, `reflectionMatrix`,
 * the `depth = inradius / tan(theta/2)` line) and are reused from there
 * once a later stage needs to lift an effective seed INTO the 4D
 * representation. Stage 1's job here is only the 3D side: producing a
 * genuine `𝒮_eff` (exposed facet centroids + exposed facet normals, per
 * boundary class) from a finite RD aggregate — see audit.md §1.2 for
 * why `buildCellComplex()` itself cannot be called on a composite seed
 * directly (it requires a single uniform inradius; an aggregate has
 * none).
 */

import type { Vec3 } from '../core';
import { DELTA_RD, RD_FACETS, isLatticePoint, keyOf3, addVec3, dotVec3, latticePointsInBox } from './lattice';

export interface BoundaryClass {
  name: string;
  /**
   * The RAW (unnormalized) integer target direction defining this
   * class's own half-space constraint — e.g. cube's `+x` class is
   * `[1,0,0]`, octahedron's `(+++)` class is `[1,1,1]`. Deliberately not
   * pre-normalized: `S_cube`/`S_oct`/`S_tet` below compare this directly
   * against integer lattice coordinates at the SAME `L` scale used by
   * `|x|∞ ≤ L` / `|x|1 ≤ L`, so normalizing here would silently rescale
   * `L` differently per family. Unit normals (needed for Stage 3's
   * angular residual, a different quantity) are derived from these where
   * needed, not stored here.
   */
  direction: Vec3;
}

// ---------------------------------------------------------------------
// Boundary-class direction families (hypothesis.md §2.1's own warning:
// ⟨100⟩, ⟨111⟩-all-eight, and ⟨111⟩-sign-restricted-four are three
// genuinely different direction families — keep them textually separate
// rather than deriving one from another).
// ---------------------------------------------------------------------

/** The 6 ⟨100⟩ face-normal directions of a cube (hypothesis.md §5.1: "six principal directional classes"). */
export const CUBE_BOUNDARY_CLASSES: BoundaryClass[] = [
  { name: '+x', direction: [1, 0, 0] },
  { name: '-x', direction: [-1, 0, 0] },
  { name: '+y', direction: [0, 1, 0] },
  { name: '-y', direction: [0, -1, 0] },
  { name: '+z', direction: [0, 0, 1] },
  { name: '-z', direction: [0, 0, -1] },
];

/** All 8 sign combinations of ⟨111⟩ (hypothesis.md §5.2: "eight boundary classes correspond to the sign-restricted diagonal directions" — here unrestricted, all 8, matching the octahedron's own 8 faces). */
export const OCT_BOUNDARY_CLASSES: BoundaryClass[] = [
  [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
  [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
].map((direction) => ({ name: `(${direction.map((s) => (s > 0 ? '+' : '-')).join('')})`, direction: direction as Vec3 }));

/**
 * The 4 even-parity ⟨111⟩ sign combinations (hypothesis.md §5.3's own
 * explicit list: "(1,1,1), (1,-1,-1), (-1,1,-1), (-1,-1,1)") — the
 * EVEN-number-of-minus-signs half of the 8 total ⟨111⟩ combinations, one
 * of the two sign-alternating vertex classes a cube splits into. Used
 * here as FACE-outward-normal directions of a regular tetrahedron, not
 * vertex directions: the standard cube-inscribed-tetrahedron duality is
 * that one parity class gives one tetrahedron's VERTICES while the
 * COMPLEMENTARY (odd-parity) class gives that same tetrahedron's face
 * outward normals, and vice versa for the other inscribed tetrahedron —
 * so this even-parity set, used as face normals below in `S_tet`, is
 * the tetrahedron whose vertices are the odd-parity set, not the one
 * whose vertices are these same four directions. This is NOT derived by
 * parametrizing `OCT_BOUNDARY_CLASSES` (deliberately its own literal
 * list, per the investigation plan's Stage 1 acceptance criterion that
 * `S_tet` must not be built by parametrizing `S_cube`/`S_oct`) — using
 * "the other 4" would produce the antipodal tetrahedron, a genuinely
 * different (though congruent) solid.
 */
export const TET_BOUNDARY_CLASSES: BoundaryClass[] = [
  { name: '(+++)', direction: [1, 1, 1] },
  { name: '(+--)', direction: [1, -1, -1] },
  { name: '(-++)', direction: [-1, 1, -1] },
  { name: '(--+)', direction: [-1, -1, 1] },
];

// ---------------------------------------------------------------------
// Boundary-selection functions (Appendix A item 5).
// ---------------------------------------------------------------------

/** `S_cube(L)`: `|x|∞ ≤ L` on Λ_RD (hypothesis.md §5.1). */
export function sCube(L: number): Vec3[] {
  return latticePointsInBox(L).filter(([x, y, z]) => Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) <= L + 1e-9);
}

/** `S_oct(L)`: `|x|1 ≤ L` on Λ_RD (hypothesis.md §5.2). */
export function sOct(L: number): Vec3[] {
  return latticePointsInBox(L).filter(([x, y, z]) => Math.abs(x) + Math.abs(y) + Math.abs(z) <= L + 1e-9);
}

/**
 * `S_tet(L)`: intersection of the 4 half-spaces `n·x ≤ L` for each of
 * `TET_BOUNDARY_CLASSES`' own 4 raw directions — the direct lattice
 * analogue of how a regular tetrahedron is itself the intersection of 4
 * half-spaces (exactly as a cube is 6 half-spaces and an octahedron is
 * 8), built from this family's OWN 4 directions rather than reusing
 * `S_cube`/`S_oct`'s logic with a substituted direction set (per the
 * investigation plan's Stage 1 acceptance criterion — this function's
 * own derivation, not a shared parametrization).
 *
 * Genuinely NOT centrally symmetric, unlike `S_cube`/`S_oct` — this is
 * the real, structural difference hypothesis.md §5.3/§13 warns the
 * tetrahedral case must not paper over: a tetrahedron selected this way
 * has 4 boundary classes, not 6 or 8, and (checked in the verify script)
 * the aggregate itself is not symmetric under `x -> -x` etc. the way the
 * cube/octahedron selections are.
 */
export function sTet(L: number): Vec3[] {
  return latticePointsInBox(L).filter((p) => TET_BOUNDARY_CLASSES.every((bc) => dotVec3(bc.direction, p) <= L + 1e-9));
}

// ---------------------------------------------------------------------
// The map R: A_RD -> S_eff (Appendix A item 6, hypothesis.md §2.2).
// ---------------------------------------------------------------------

export interface EffectiveSeedClass {
  name: string;
  direction: Vec3;
  /** C_i (hypothesis.md §2.2): the real 3D positions of every exposed facet's own centroid assigned to this class. */
  centroids: Vec3[];
  /** N_i (hypothesis.md §2.2): the corresponding exposed facet's own outward unit normal (a ⟨110⟩ direction) — same index/order as `centroids`. */
  normals: Vec3[];
}

export interface EffectiveSeed {
  classes: EffectiveSeedClass[];
}

/**
 * `𝓡(𝒜_RD)`: for each cell in `aggregate` and each of its 12 real
 * facets, the facet is EXPOSED iff the adjacent cell across it (its own
 * centre plus that facet's `centreOffset`) is not itself part of the
 * aggregate. An exposed facet is assigned to boundary class `i` iff
 * that neighbour position ACTUALLY VIOLATES class `i`'s own half-space
 * constraint — `boundaryClasses[i].direction · neighbourPosition > L`
 * — i.e. the class is genuinely the reason that neighbour was excluded,
 * checked against the real bound `L` the aggregate was itself selected
 * with, not against a "which class scores highest overall" heuristic.
 *
 * An earlier version of this function used exactly that heuristic (max
 * projection among ALL classes, no `L`) and looked plausible — every
 * facet still landed in some class — but was WRONG, caught only by
 * actually measuring the resulting angle-to-target distribution rather
 * than trusting the code's own comment: at L=3, the cube's own `+x`
 * class came back with a 3-way mixed distribution (45°/90°/135°, 224/
 * 132/60 facets) instead of a clean single value, because a facet whose
 * real exposure reason was e.g. the `+y` constraint could still win
 * `+x`'s own projection score simply from its cell's high `x` baseline
 * — a real classification bug, not a few honest edge-case corner
 * facets (scripts/verify-composite-seed-lattice.ts's `[preview only]`
 * checks are what caught it, per this session's own "be careful of
 * figures derived from a different-context calculation" instruction).
 * Requiring genuine violation against the real `L` fixes this: a facet
 * can now correctly land in 1, 2, or 3 classes (a true corner), but
 * never in a class its neighbour doesn't actually violate.
 *
 * This equivalence (`neighbour excluded` <=> `some class's constraint
 * violated at this L`) holds when `aggregate` was itself produced by
 * selecting on exactly these same `boundaryClasses`' constraints at the
 * SAME `L` (i.e. calling this with `sCube(L)`/`CUBE_BOUNDARY_CLASSES`,
 * `sOct(L)`/`OCT_BOUNDARY_CLASSES`, or `sTet(L)`/`TET_BOUNDARY_CLASSES`
 * as matched pairs, same `L` both places) — every registered selection
 * function is defined as the intersection of exactly its own listed
 * boundary classes' half-spaces, so any excluded neighbour must violate
 * at least one of them; a mismatched aggregate/class/L combination can
 * silently produce an orphaned exposed facet (assigned to no class),
 * which is deliberately NOT masked here — callers should treat that as
 * a signal the pairing is wrong, not filter it away.
 */
export function buildEffectiveSeed(aggregate: Vec3[], boundaryClasses: BoundaryClass[], L: number): EffectiveSeed {
  const inSet = new Set(aggregate.map(keyOf3));
  const classes: EffectiveSeedClass[] = boundaryClasses.map((bc) => ({
    name: bc.name,
    direction: bc.direction,
    centroids: [],
    normals: [],
  }));

  for (const c of aggregate) {
    for (const facet of RD_FACETS) {
      const neighbour = addVec3(c, facet.centreOffset);
      if (inSet.has(keyOf3(neighbour))) continue; // shared with another aggregate cell -- not exposed

      const centroid = addVec3(c, facet.centroidOffset);
      boundaryClasses.forEach((bc, i) => {
        if (dotVec3(bc.direction, neighbour) > L + 1e-9) {
          classes[i].centroids.push(centroid);
          classes[i].normals.push(facet.normal);
        }
      });
    }
  }

  return { classes };
}

// Re-exported so callers of this file don't need a second import from
// lattice.ts just to sanity-check a lattice point by hand.
export { isLatticePoint, DELTA_RD };

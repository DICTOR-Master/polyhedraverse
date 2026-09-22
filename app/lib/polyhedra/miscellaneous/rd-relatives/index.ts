/**
 * "rd-relatives", a new sub-group of the "Miscellaneous" family (see the
 * family's own index.ts one level up): 2 real solids directly related
 * to the Rhombic Dodecahedron (RHOMBIC_DODECAHEDRON, catalan.ts) --
 * ported over from a sibling project (Rhombiverse) where both already
 * shipped as real, independently placeable lattice pieces, verified
 * there before this port (exact flush-fit against a real RD, confirmed
 * both mathematically and against that app's own live geometry).
 *
 * - ELONGATED_DODECAHEDRON: the 4th of Fedorov's 5 real parallelohedra
 *   (Cube, Hexagonal Prism, Rhombic Dodecahedron, Elongated
 *   Dodecahedron, Truncated Octahedron -- the only convex shapes that
 *   tile 3D space by translation alone). Take an RD, cut it through its
 *   own equator (the 4 rhombic faces whose plane passes through center),
 *   insert a square prism of height `h = sqrt(3) * half` between the
 *   two halves. The 8 remaining rhombic faces are untouched RD faces,
 *   just shifted outward; the 4 cut faces each merge with one new prism
 *   side into a single flat HEXAGON. `h` is the one non-arbitrary value:
 *   exactly the height that makes all 6 edges of each new hexagon equal
 *   length, and that length is EXACTLY RD's own edge length -- so this
 *   whole shape is genuinely uniform-edge (18 vertices, 28 edges, 12
 *   faces: 8 rhombi + 4 hexagons -- matches the standard cited count
 *   exactly, verified independently via a real scipy.spatial.ConvexHull
 *   on these exact 18 points, not assumed from the construction alone).
 *
 * - RHOMBOHEDRON: RD is the zonotope (Minkowski sum) of a cube's own 4
 *   body-diagonal directions, which always decomposes into exactly
 *   C(4,3) = 4 congruent rhombohedra (anchor at one cube corner,
 *   opposite corner is RD's own center, edges run to the 3 adjacent
 *   octahedral points matching that corner's own sign pattern). A real,
 *   strict rhombohedron -- verified directly: all 3 generating edge
 *   vectors have the identical length, so (being translates of those
 *   same 3 vectors) all 12 edges of the resulting parallelepiped do too,
 *   and the real convex hull confirms exactly 6 rhombic faces, V-E+F=2.
 *
 * Both vertex/edge/face arrays below were generated the same way this
 * project's own Catalan-solid batches were (see catalan.ts's own
 * header): real coordinates from the construction above, a genuine
 * scipy.spatial.ConvexHull to find the true faces (merging coplanar
 * triangles into real n-gons), outward CCW winding confirmed by normal
 * direction vs. each face's own centroid offset from the shape center,
 * and each face's own vertex 0 canonicalized to a consistent geometric
 * role (least-frequent interior angle, tie-broken toward the largest --
 * for the Rhombohedron's own rhombi that's always the acute corner,
 * matching RHOMBIC_DODECAHEDRON's own convention one file over).
 *
 * Deliberately built WITHOUT makeSpec/makeSpecByCircumradius, unlike
 * every sibling file in this registry -- real bug caught before
 * shipping, not a stylistic choice: both of those rescale (edge->1, or
 * circumradius->1) INDEPENDENTLY per shape, which breaks the one
 * property that actually matters here -- these two shapes' rhombic
 * faces must be the literal SAME size as RHOMBIC_DODECAHEDRON's own
 * real face for facesCongruent() (core.ts) to recognize them as
 * attachable to a real RD, since it compares ABSOLUTE edge lengths, not
 * ratios. The raw vertices below already share RD's own real
 * coordinate scale by construction (same half=0.5/octahedral=1
 * convention RHOMBIC_DODECAHEDRON's own VERTS use one file over -- both
 * shapes are literally cut from RD's own real geometry, not an
 * independent re-derivation at an arbitrary scale) -- confirmed
 * directly: facesCongruent(RHOMBOHEDRON face, RHOMBIC_DODECAHEDRON
 * face) is true with these exact numbers, false after either rescale.
 */

import { type Vec3, type PolyhedronSpec, buildConnectors } from '../../core';

// ---------------------------------------------------------------------------
// RHOMBOHEDRON
// ---------------------------------------------------------------------------

const VERTS_RHOMBOHEDRON: Vec3[] = [
  [0.25, 0.25, 0.25],
  [-0.25, -0.25, 0.75],
  [-0.25, 0.75, -0.25],
  [-0.75, 0.25, 0.25],
  [0.75, -0.25, -0.25],
  [0.25, -0.75, 0.25],
  [0.25, 0.25, -0.75],
  [-0.25, -0.25, -0.25],
];
const EDGES_RHOMBOHEDRON: [number, number][] = [
  [0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7],
];
const FACES_RHOMBOHEDRON: number[][] = [
  [4, 5, 7, 6], [1, 3, 7, 5], [0, 1, 5, 4], [7, 3, 2, 6], [0, 2, 3, 1], [6, 2, 0, 4],
];

// ---------------------------------------------------------------------------
// ELONGATED_DODECAHEDRON
// ---------------------------------------------------------------------------

const VERTS_ELONGATED_DODECAHEDRON: Vec3[] = [
  [0.0, 0.0, 1.4330127018922192],
  [0.0, 0.0, -1.4330127018922192],
  [-0.5, -0.5, -0.9330127018922193],
  [-0.5, -0.5, 0.9330127018922193],
  [-0.5, 0.5, -0.9330127018922193],
  [-0.5, 0.5, 0.9330127018922193],
  [0.5, -0.5, -0.9330127018922193],
  [0.5, -0.5, 0.9330127018922193],
  [0.5, 0.5, -0.9330127018922193],
  [0.5, 0.5, 0.9330127018922193],
  [1.0, 0.0, 0.4330127018922193],
  [1.0, 0.0, -0.4330127018922193],
  [-1.0, 0.0, 0.4330127018922193],
  [-1.0, 0.0, -0.4330127018922193],
  [0.0, 1.0, 0.4330127018922193],
  [0.0, 1.0, -0.4330127018922193],
  [0.0, -1.0, 0.4330127018922193],
  [0.0, -1.0, -0.4330127018922193],
];
const EDGES_ELONGATED_DODECAHEDRON: [number, number][] = [
  [0, 3], [0, 5], [0, 7], [0, 9], [1, 2], [1, 4], [1, 6], [1, 8], [2, 13], [2, 17], [3, 12], [3, 16],
  [4, 13], [4, 15], [5, 12], [5, 14], [6, 11], [6, 17], [7, 10], [7, 16], [8, 11], [8, 15], [9, 10],
  [9, 14], [10, 11], [12, 13], [14, 15], [16, 17],
];
const FACES_ELONGATED_DODECAHEDRON: number[][] = [
  [6, 17, 2, 1], [4, 1, 2, 13], [6, 1, 8, 11], [8, 1, 4, 15],
  [7, 16, 17, 6, 11, 10], [3, 12, 13, 2, 17, 16],
  [7, 0, 3, 16], [8, 15, 14, 9, 10, 11], [9, 0, 7, 10], [4, 13, 12, 5, 14, 15], [3, 0, 5, 12], [9, 14, 5, 0],
];

// ---------------------------------------------------------------------------
// registry
// ---------------------------------------------------------------------------

// Every face on both shapes is a real, planar, flush-fitting port (the
// whole reason these exist -- see this file's own header) -- not a
// construction artifact the way a graded pyramid's pointed lateral face
// is, so (matching quad-prisms' own precedent, one directory over) all
// of them stay open for attachment, not gated down to `isRegularFace`
// (Miscellaneous family's own default -- see ShapeViewer.tsx's
// eligibility policy) -- ElongDodeca's own hexagons in particular are
// equilateral but NOT equiangular (verified: interior angles alternate
// 109.47/125.26 degrees, not a true regular hexagon), so `isRegularFace`
// would incorrectly exclude every one of them without this override.
export const RD_RELATIVES_ADDITIONS: Record<string, PolyhedronSpec> = {
  RHOMBOHEDRON: {
    id: 'RHOMBOHEDRON',
    name: 'rhombohedron',
    faceCount: FACES_RHOMBOHEDRON.length,
    vertices: VERTS_RHOMBOHEDRON,
    edges: EDGES_RHOMBOHEDRON,
    faces: FACES_RHOMBOHEDRON,
    connectors: buildConnectors(VERTS_RHOMBOHEDRON, EDGES_RHOMBOHEDRON),
    attachableFaceIndices: FACES_RHOMBOHEDRON.map((_, i) => i),
  },
  ELONGATED_DODECAHEDRON: {
    id: 'ELONGATED_DODECAHEDRON',
    name: 'elongated dodecahedron',
    faceCount: FACES_ELONGATED_DODECAHEDRON.length,
    vertices: VERTS_ELONGATED_DODECAHEDRON,
    edges: EDGES_ELONGATED_DODECAHEDRON,
    faces: FACES_ELONGATED_DODECAHEDRON,
    connectors: buildConnectors(VERTS_ELONGATED_DODECAHEDRON, EDGES_ELONGATED_DODECAHEDRON),
    attachableFaceIndices: FACES_ELONGATED_DODECAHEDRON.map((_, i) => i),
  },
};

export const RD_RELATIVES_ADDITION_IDS: string[] = Object.keys(RD_RELATIVES_ADDITIONS);

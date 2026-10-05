/**
 * The regular nine (direct request 2026-10-01, from Kaleidohedra's two-way
 * target search): every space-filler with all edges equal whose faces are
 * only squares, regular hexagons and 60 degree rhombi (each two
 * equilateral triangles). There are exactly nine. Five were already here
 * (the cube, the hexagonal prism, the truncated octahedron, the Bain
 * rhombic dodecahedron and the regular-hexagon elongated dodecahedron);
 * these are the other four, edge 1, each a zonohedron of its edge
 * directions:
 *
 * - RHOMBOHEDRON_60: three directions at 60 degrees to each other. Six 60
 *   degree rhombi, volume sqrt2/2: exactly a regular octahedron with a
 *   regular tetrahedron on two opposite faces.
 * - RHOMBIC_PRISM_60: a 60 degree rhombus stood straight up. Two rhombi,
 *   four squares, volume sqrt3/2.
 * - LEANING_SQUARE_PRISM: a square leaned so its sides are 60 degree
 *   rhombi. Two squares, four rhombi, volume sqrt2/2.
 * - LEANING_HEX_PRISM_60: a regular hexagon leaned at right angles to one
 *   pair of sides, so those sides stay square and the other four are 60
 *   degree rhombi. Volume 3/sqrt2.
 *
 * All four tile space by translation. verify-regular-nine checks all nine.
 */

import { type Vec3, type PolyhedronSpec, buildConnectors } from '../../core';
import { centred, edgesOf, zonohedron } from '../../convexBuild';

const S3 = Math.sqrt(3);

function spec(id: string, name: string, shape: { vertices: Vec3[]; faces: number[][] }): PolyhedronSpec {
  const vertices = centred(shape.vertices);
  const edges = edgesOf(shape.faces);
  return {
    id,
    name,
    faceCount: shape.faces.length,
    vertices,
    edges,
    faces: shape.faces,
    connectors: buildConnectors(vertices, edges),
    // Every face attaches (Miscellaneous otherwise allows regular faces only).
    attachableFaceIndices: shape.faces.map((_, i) => i),
  };
}

const U: Vec3 = [1, 0, 0];
const V60: Vec3 = [0.5, S3 / 2, 0];
const X120: Vec3 = [-0.5, S3 / 2, 0];

export const REGULAR_NINE_ADDITIONS: Record<string, PolyhedronSpec> = {
  RHOMBOHEDRON_60: spec('RHOMBOHEDRON_60', '60° rhombohedron', zonohedron([U, V60, [0.5, S3 / 6, Math.sqrt(2 / 3)]])),
  RHOMBIC_PRISM_60: spec('RHOMBIC_PRISM_60', '60° rhombic prism', zonohedron([U, V60, [0, 0, 1]])),
  LEANING_SQUARE_PRISM: spec('LEANING_SQUARE_PRISM', 'Leaning square prism', zonohedron([U, [0, 1, 0], [0.5, 0.5, Math.SQRT1_2]])),
  LEANING_HEX_PRISM_60: spec('LEANING_HEX_PRISM_60', '60° leaning hexagonal prism', zonohedron([U, V60, X120, [0, 1 / S3, Math.sqrt(2 / 3)]])),
};

export const REGULAR_NINE_ADDITION_IDS: string[] = Object.keys(REGULAR_NINE_ADDITIONS);

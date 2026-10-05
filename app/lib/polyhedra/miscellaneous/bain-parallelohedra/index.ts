/**
 * The Bain parallelohedra (direct request 2026-10-01, from Kaleidohedra).
 * Stretch a body-centred cubic lattice by sqrt 2 along one axis and it
 * becomes face-centred cubic (the Bain stretch). The same stretch turns
 * the rhombic dodecahedron's four edge directions into four of length 1
 * meeting at 60 degrees four times and 90 degrees twice. Edge 1 throughout:
 *
 * - BAIN_RD: those four directions. 4 squares and 8 rhombi of 60 degrees
 *   (a known form of the rhombic dodecahedron: a cuboctahedron with
 *   square pyramids on top and bottom).
 * - REGULAR_HEX_ED: plus a fifth direction along an unstretched axis. It
 *   lies at 60 degrees to two pairs of the others, in their planes, so
 *   the four hexagons are regular: 4 regular hexagons, 4 squares and 4
 *   rhombi of 60 degrees, every face made of regular polygons.
 * - BAIN_ED: plus a fifth direction along the stretched axis instead, at
 *   45 degrees to all four: 8 rhombi of 60 degrees and 4 hexagons with
 *   corners 135, 135, 90, 135, 135, 90 (a square with two opposite
 *   corners cut at 45 degrees).
 *
 * All three tile space by translation (Fedorov types: rhombic dodecahedron,
 * elongated dodecahedron). Kaleidohedra's verify-kaleido checks the faces;
 * verify-bain-parallelohedra checks these solids.
 */

import { type Vec3, type PolyhedronSpec, buildConnectors } from '../../core';
import { centred, edgesOf, zonohedron } from '../../convexBuild';

const R2 = Math.SQRT2;

/** The four stretched rhombic-dodecahedron directions, length 1. */
export const BAIN_DIRECTIONS: Vec3[] = [[1, 1, R2], [1, -1, -R2], [-1, 1, -R2], [-1, -1, R2]].map((v) => v.map((x) => x / 2) as Vec3);

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

export const BAIN_PARALLELOHEDRA_ADDITIONS: Record<string, PolyhedronSpec> = {
  BAIN_RD: spec('BAIN_RD', 'Bain rhombic dodecahedron', zonohedron(BAIN_DIRECTIONS)),
  REGULAR_HEX_ED: spec('REGULAR_HEX_ED', 'Regular-hexagon elongated dodecahedron', zonohedron([...BAIN_DIRECTIONS, [1, 0, 0]])),
  BAIN_ED: spec('BAIN_ED', 'Bain elongated dodecahedron', zonohedron([...BAIN_DIRECTIONS, [0, 0, 1]])),
};

export const BAIN_PARALLELOHEDRA_ADDITION_IDS: string[] = Object.keys(BAIN_PARALLELOHEDRA_ADDITIONS);

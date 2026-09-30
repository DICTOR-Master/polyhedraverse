/**
 * 3D+ Bridges (direct decisions 2026-09-30): 3D shapes that cross a
 * dimensional boundary, each a shadow (projection), slice (section),
 * building block (cell) or corner (vertex figure) of a higher polytope.
 * Membership is mostly shapes that already live in other families; the
 * one shape new here is the rhombic icosahedron, the 5-cube's shadow.
 * Each member's bridge is described in the shape details panel
 * (i18n key `bridge.<id>`).
 */
import { type PolyhedronSpec, buildConnectors } from './core';
import { GOLDEN_AXES } from './goldenAxes';
import { edgesOf, zonohedron } from './convexBuild';

// Five of the six golden axes, the same five goldenZonohedron(5) builds its
// rhombic icosahedron from, so its 20 golden rhombi match the golden
// rhombohedra's and the rhombic triacontahedron's faces.
const RI = zonohedron(GOLDEN_AXES.slice(0, 5));
const RI_EDGES = edgesOf(RI.faces);

export const BRIDGE_ADDITIONS: Record<string, PolyhedronSpec> = {
  RHOMBIC_ICOSAHEDRON: {
    id: 'RHOMBIC_ICOSAHEDRON',
    name: 'rhombic icosahedron',
    faceCount: RI.faces.length,
    vertices: RI.vertices,
    edges: RI_EDGES,
    faces: RI.faces,
    connectors: buildConnectors(RI.vertices, RI_EDGES),
    attachableFaceIndices: RI.faces.map((_, i) => i),
  },
};
export const BRIDGE_ADDITION_IDS = Object.keys(BRIDGE_ADDITIONS);

/**
 * Every member of 3D+ Bridges, by section (direct decision 2026-09-30: the
 * 4D-capable cells are a section here, not a family of their own). A shape
 * with several bridges sits under its main one; its details list them all.
 * - cells: the cells of the regular 4D polytopes (the tetrahedron also as
 *   the grade-2 pyramid, which has its exact angles), the square pyramid
 *   (two make each octahedral cell of the 24-cell in rhombic stacking) and
 *   the truncated octahedron (a cell of the omnitruncated 5-cell);
 * - shadows: projections of the tesseract, 24-cell, 5-cube and 6-cube, and
 *   the tiles of the 5D and 6D quasicrystals;
 * - slices: sections of a 4D polytope;
 * - corners: vertex figures.
 */
export const BRIDGE_SECTIONS: { id: 'cells' | 'shadows' | 'slices' | 'corners'; ids: string[] }[] = [
  { id: 'cells', ids: ['D4', 'PYRAMID_TRI_G2', 'CUBE', 'D8', 'DODECAHEDRON', 'J1_SQUARE_PYRAMID', 'TRUNCATED_OCTAHEDRON'] },
  { id: 'shadows', ids: ['RHOMBIC_DODECAHEDRON', 'RHOMBIC_ICOSAHEDRON', 'RHOMBIC_TRIACONTAHEDRON', 'GOLDEN_RHOMBOHEDRON_PROLATE', 'GOLDEN_RHOMBOHEDRON_OBLATE', 'PENROSE_PRISM_THICK', 'PENROSE_PRISM_THIN'] },
  { id: 'slices', ids: ['CUBOCTAHEDRON'] },
  { id: 'corners', ids: ['D20'] },
];
export const BRIDGES_3D_IDS = BRIDGE_SECTIONS.flatMap((sec) => sec.ids);

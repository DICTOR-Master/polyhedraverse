/**
 * DICTO's Zometool parallelohedra (direct request 2026-09-30): a leaning
 * regular-hexagonal prism DICTO built from medium blue Zometool struts, and
 * the two blocks it splits into. Names credit DICTO; each shape's details
 * credit Zometool.
 *
 * All four edge directions are blue-strut directions (the solid's 2-fold
 * axes), edge 1: u, v, w lie in the hexagon's plane at 60 degrees to each
 * other, and the lean d is at 90 degrees to u and 72 degrees to v and w.
 * So the prism has two regular hexagons, two squares and four 72/108
 * degree rhombi (the Penrose thick rhombus), and leans ~20.9 degrees from
 * upright, with sin = 2 cos 72 / sqrt 3 = (phi - 1) / sqrt 3. It is a
 * hexagonal-prism parallelohedron (one of Fedorov's five types), sheared.
 *
 * Its three blocks are the parallelepipeds on each pair of hexagon
 * directions with d: (u,v,d) and (u,w,d) are the same piece (every
 * parallelepiped is centrally symmetric, so its mirror image is itself
 * turned round), with a pair each of squares, 60 degree and 72 degree
 * rhombi; (v,w,d) has 60 degree rhombi and two pairs of 72 degree
 * rhombi. All three are parallelohedra too. The prism is equally a
 * rhombic dodecahedron's four-direction zonohedron with three directions
 * flattened into one plane, which is how DICTO first found a block, from
 * a distorted RD.
 *
 * Every face attaches: the squares to the cube, the hexagons to the
 * hexagonal prism, the 72 degree rhombi to the thick Penrose rhombus
 * prism (Aperiodic Sets), the 60 degree rhombi to each other.
 */

import { type Vec3, type PolyhedronSpec, buildConnectors } from '../../core';
import { centred, edgesOf, outward, zonohedron } from '../../convexBuild';

const S3 = Math.sqrt(3);
const C72 = Math.cos((72 * Math.PI) / 180);

/** The four edge directions: u, v, w in the hexagon's plane; d the lean. */
export const ZOME_DIRECTIONS: { u: Vec3; v: Vec3; w: Vec3; d: Vec3 } = (() => {
  const y = (2 * C72) / S3;
  return { u: [1, 0, 0], v: [0.5, S3 / 2, 0], w: [-0.5, S3 / 2, 0], d: [0, y, Math.sqrt(1 - y * y)] };
})();

function leaningPrism(): { vertices: Vec3[]; faces: number[][] } {
  const { d } = ZOME_DIRECTIONS;
  // A regular hexagon of edge 1 whose sides run along u, v and w.
  const hex: Vec3[] = Array.from({ length: 6 }, (_, k) => {
    const a = (60 * k * Math.PI) / 180; // corners at 0, 60, ... degrees: sides along 120, 180, ... = u, v, w
    return [Math.cos(a), Math.sin(a), 0] as Vec3;
  });
  const vertices: Vec3[] = [...hex, ...hex.map((p) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]] as Vec3)];
  const faces: number[][] = [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11]];
  for (let k = 0; k < 6; k++) {
    const j = (k + 1) % 6;
    const e = [hex[j][0] - hex[k][0], hex[j][1] - hex[k][1], hex[j][2] - hex[k][2]];
    // Start each side at an acute corner, as the Penrose rhombi do, so face attach lines up.
    const acuteAtK = e[0] * d[0] + e[1] * d[1] + e[2] * d[2] > 1e-12;
    faces.push(acuteAtK ? [k, j, j + 6, k + 6] : [j, j + 6, k + 6, k]);
  }
  const c = centred(vertices);
  return { vertices: c, faces: outward(c, faces) };
}

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

const { u, v, w, d } = ZOME_DIRECTIONS;

/**
 * DICTO's skewed rhombic dodecahedron (direct request 2026-09-30): v, w, d
 * plus one more blue direction x, at 60 degrees to v and d and 72 to w, so
 * the four meet at 60 degrees three times and 72 three times. Twelve
 * rhombi (six of 60, six of 72 degrees), volume phi^2 at edge 1: it splits
 * into two all-rhombus blocks (phi/2) and two flattened rhombohedra (1/2).
 * It tiles space as a sheared FCC (Rhombiverse's DICTO FCC). x solves
 * x.v = -cos 60, x.w = cos 72, x.d = cos 60 (unit length).
 */
export const ZOME_X: Vec3 = (() => {
  const c60 = 0.5, c72 = Math.cos((72 * Math.PI) / 180);
  // In the frame of v, w, d: solve the three dot products (Cramer's rule).
  const det = (a: Vec3, b: Vec3, c: Vec3) => a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  const rows = [v, w, d], r = [-c60, c72, c60];
  const D = det(v, w, d);
  const col = (k: number) => rows.map((row, i) => row.map((x, j) => (j === k ? r[i] : x)) as Vec3);
  return [0, 1, 2].map((k) => { const m = col(k); return det(m[0], m[1], m[2]) / D; }) as Vec3;
})();

/**
 * DICTO's skewed ED (Kaleidoverse DISCOVERIES.md #7, direct request
 * 2026-10-01): two ways to extend the skewed RD (v, w, d, ZOME_X) by a
 * fifth edge direction, the same way the regular-hexagon ED extends the
 * Bain RD. Found in Kaleidoverse by matching the skewed RD's Gram matrix
 * against every already-catalogued equal-edge elongated-dodecahedron cell's
 * 4-direction sub-sets (geometry-targets.json); exactly two contain it:
 * TARGETS.md #16 (4 rhombi 60, 4 rhombi 72, 2 hexagons 36/36/72, 2 regular
 * hexagons; volume phi^2 + 2) and #18 (6 rhombi 60, 2 rhombi 72, 4 hexagons
 * 36/72/72; volume phi^3 + 1/2). Each direction below is that fifth
 * direction, carried over exactly (orthogonal alignment, not re-derived)
 * from Kaleidoverse's `src/geometry-extensions/dicto-fcc.js`.
 */
export const DICTO_SKEWED_ED_16_DIRECTION: Vec3 = [0.30901699435345675, -0.7557613140236112, -0.5773502691494736];
export const DICTO_SKEWED_ED_18_DIRECTION: Vec3 = [0.5000000002805582, 0.6454972241403993, -0.5773502687416553];

export const ZOME_PARALLELOHEDRA_ADDITIONS: Record<string, PolyhedronSpec> = {
  DICTO_LEANING_HEX_PRISM: spec('DICTO_LEANING_HEX_PRISM', 'DICTO leaning hexagonal prism', leaningPrism()),
  DICTO_SQUARE_FACED_BLOCK: spec('DICTO_SQUARE_FACED_BLOCK', 'DICTO square-faced block', zonohedron([u, v, d])),
  DICTO_ALL_RHOMBUS_BLOCK: spec('DICTO_ALL_RHOMBUS_BLOCK', 'DICTO all-rhombus block', zonohedron([v, w, d])),
  DICTO_SKEWED_RD: spec('DICTO_SKEWED_RD', 'DICTO skewed rhombic dodecahedron', zonohedron([v, w, d, ZOME_X])),
  DICTO_FLATTENED_RHOMBOHEDRON: spec('DICTO_FLATTENED_RHOMBOHEDRON', 'DICTO flattened rhombohedron', zonohedron([v, w, ZOME_X])),
  DICTO_SKEWED_ED_16: spec('DICTO_SKEWED_ED_16', 'DICTO skewed elongated dodecahedron (16)', zonohedron([v, w, d, ZOME_X, DICTO_SKEWED_ED_16_DIRECTION])),
  DICTO_SKEWED_ED_18: spec('DICTO_SKEWED_ED_18', 'DICTO skewed elongated dodecahedron (18)', zonohedron([v, w, d, ZOME_X, DICTO_SKEWED_ED_18_DIRECTION])),
};

export const ZOME_PARALLELOHEDRA_ADDITION_IDS: string[] = Object.keys(ZOME_PARALLELOHEDRA_ADDITIONS);

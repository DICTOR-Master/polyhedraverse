/**
 * The six icosahedral 5-fold axes, each 1/phi long (the rhombic
 * triacontahedron's edge). Every golden zonohedron is built from some of
 * them: the golden rhombohedra (3), Bilinski dodecahedron (4), rhombic
 * icosahedron (5) and rhombic triacontahedron (6). Plain numbers, no THREE,
 * so both the shape registry and goldenBuilds.ts can share them.
 */
import type { Vec3 } from './core';

const PHI = (1 + Math.sqrt(5)) / 2;
const axis = (x: number, y: number, z: number): Vec3 => {
  const k = 1 / (PHI * Math.hypot(x, y, z));
  return [x * k, y * k, z * k];
};
export const GOLDEN_AXES: Vec3[] = [axis(0, 1, PHI), axis(0, -1, PHI), axis(1, PHI, 0), axis(-1, PHI, 0), axis(PHI, 0, 1), axis(-PHI, 0, 1)];

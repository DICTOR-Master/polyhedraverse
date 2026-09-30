/**
 * The Stellations family (direct decisions 2026-09-30): face-attach
 * pieces that stellate the Platonic and Catalan solids, each made to sit
 * on one face (see build.ts for the sizes). Only the base attaches: the
 * other faces are stellation surfaces or the seams between neighbouring
 * pieces. A solid gets only the stellations it really has (the
 * tetrahedron and cube none, just the flat piece; the octahedron one).
 * The two scalene-faced Catalans (the disdyakis solids) have mirror-image
 * faces, so their pieces come left- and right-handed.
 *
 * The geometry is generated once (scripts/generate-stellations.ts)
 * rather than solved on every page load.
 */

import { type PolyhedronSpec, buildConnectors } from '../core';
import { DELTAHEDRA } from '../deltahedra';
import { PLATONIC_ADDITIONS } from '../platonic';
import { CATALAN_ADDITIONS } from '../catalan';
import { STELLATION_PIECES } from './pieces.generated';

const SIZE_LABEL: Record<number, string> = {
  1: 'flat',
  2: 'first stellation',
  3: 'second stellation',
  4: 'third stellation',
};

// Registry names of the stellated solids (D4/D8/D20 are Deltahedra ids).
const SOLID_NAME: Record<string, string> = {
  D4: 'tetrahedron',
  CUBE: 'cube',
  D8: 'octahedron',
  DODECAHEDRON: 'dodecahedron',
  D20: 'icosahedron',
};

// What one piece on every face builds, where the result has a name of its own.
const BUILDS: Record<string, string> = {
  D4_1: 'cube',
  CUBE_1: 'rhombic dodecahedron',
  D8_1: 'rhombic dodecahedron',
  D8_2: 'stella octangula',
  DODECAHEDRON_1: 'rhombic triacontahedron',
  DODECAHEDRON_2: 'small stellated dodecahedron',
  DODECAHEDRON_3: 'great dodecahedron',
  DODECAHEDRON_4: 'great stellated dodecahedron',
  D20_1: 'rhombic triacontahedron',
  D20_2: 'small triambic icosahedron',
  D20_3: 'compound of five octahedra',
  RHOMBIC_DODECAHEDRON_2: "Escher's solid",
};

/** The display name of a stellated solid: its Platonic name, or its registry name. */
export function stellatedSolidName(solid: string): string {
  const spec = DELTAHEDRA[solid] ?? PLATONIC_ADDITIONS[solid] ?? CATALAN_ADDITIONS[solid];
  return SOLID_NAME[solid] ?? spec.name.replaceAll('_', ' ');
}

/** The named solid that one piece on every face builds, if it has a name. */
export function stellationBuilds(id: string): string | undefined {
  const p = STELLATION_PIECES[id];
  return p && BUILDS[`${p.solid}_${p.size}`];
}

export const STELLATION_ADDITIONS: Record<string, PolyhedronSpec> = Object.fromEntries(
    Object.entries(STELLATION_PIECES).map(([id, p]) => {
      const edges: [number, number][] = [];
      const seen = new Set<string>();
      for (const f of p.faces) for (let i = 0; i < f.length; i++) {
        const a = f[i], b = f[(i + 1) % f.length];
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        if (!seen.has(key)) { seen.add(key); edges.push(a < b ? [a, b] : [b, a]); }
      }
      const builds = BUILDS[`${p.solid}_${p.size}`];
      const name = `${stellatedSolidName(p.solid)} stellation ${p.size} (${SIZE_LABEL[p.size]}${builds ? `: ${builds}` : ''}${p.hand ? `, ${p.hand}` : ''})`;
      const spec: PolyhedronSpec = {
        id,
        name,
        faceCount: p.faces.length,
        vertices: p.vertices,
        edges,
        faces: p.faces,
        connectors: buildConnectors(p.vertices, edges),
        attachableFaceIndices: [p.baseFace],
      };
      return [id, spec];
    }),
);

export const STELLATION_IDS: string[] = Object.keys(STELLATION_PIECES);

/** The stellated solid, size and (for scalene faces) hand of a stellation piece. */
export function stellationInfo(id: string): { solid: string; size: number; hand?: 'left' | 'right' } | undefined {
  const p = STELLATION_PIECES[id];
  return p && { solid: p.solid, size: p.size, ...(p.hand ? { hand: p.hand } : {}) };
}

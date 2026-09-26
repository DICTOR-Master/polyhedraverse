/**
 * The golden zonohedra as ready-made builds (File menu): the Bilinski
 * dodecahedron (2 prolate + 2 oblate golden rhombohedra), the rhombic
 * icosahedron (5 + 5) and the rhombic triacontahedron (10 + 10), for seeing
 * how the pieces fit before building by hand (golden rhombohedra hit dead
 * ends easily: their faces can't show which way a gap closes).
 *
 * Construction: the zonotope tiling of the first 4, 5 or 6 icosahedral
 * 5-fold axes -- one rhombohedron per triple of axes, placed by the
 * standard lifting rule (generic heights) -- then each piece is the
 * registry's own prolate/oblate spec turned onto its triple. Pieces are
 * joined by face connections along a spanning tree of shared faces.
 * scripts/verify-aperiodic-sets.ts checks the result is named correctly.
 */
import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three';
import { POLYHEDRA, type PolyhedronSpec } from './polyhedra';
import type { Assembly, AssemblyConnection, AssemblyNode } from './assembly';

const PHI = (1 + Math.sqrt(5)) / 2;
const axis = (x: number, y: number, z: number) => new Vector3(x, y, z).normalize().multiplyScalar(1 / PHI);
const AXES = [axis(0, 1, PHI), axis(0, -1, PHI), axis(1, PHI, 0), axis(-1, PHI, 0), axis(PHI, 0, 1), axis(-PHI, 0, 1)];
const HEIGHTS = [0.31, 0.77, 0.12, 0.58, 0.93, 0.44];
const V = (a: number[]) => new Vector3(a[0], a[1], a[2]);
const det3 = (a: Vector3, b: Vector3, c: Vector3) => a.dot(b.clone().cross(c));
const det4 = (m: number[][]) => new Matrix4().set(...(m.flat() as [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number])).determinant();

// The rotation taking a spec's corner-0 edges onto a triple (any order and
// signs), or null.
function rotationFor(spec: PolyhedronSpec, triple: Vector3[]): Quaternion | null {
  const e = [1, 2, 4].map((m) => V(spec.vertices[m]).sub(V(spec.vertices[0])));
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const p of perms) for (let s = 0; s < 8; s++) {
    const t = p.map((i, k) => triple[i].clone().multiplyScalar(s & (1 << k) ? -1 : 1));
    const A = new Matrix3().set(e[0].x, e[1].x, e[2].x, e[0].y, e[1].y, e[2].y, e[0].z, e[1].z, e[2].z);
    const B = new Matrix3().set(t[0].x, t[1].x, t[2].x, t[0].y, t[1].y, t[2].y, t[0].z, t[1].z, t[2].z);
    const R = B.multiply(A.invert());
    const I = R.clone().multiply(R.clone().transpose()).elements;
    if (I.every((x, i) => Math.abs(x - ([0, 4, 8].includes(i) ? 1 : 0)) < 1e-9) && R.determinant() > 0) {
      return new Quaternion().setFromRotationMatrix(new Matrix4().setFromMatrix3(R));
    }
  }
  return null;
}

export const GOLDEN_BUILDS = [
  { axes: 4, name: 'Bilinski dodecahedron' },
  { axes: 5, name: 'Rhombic icosahedron' },
  { axes: 6, name: 'Rhombic triacontahedron' },
] as const;

export function goldenZonohedronNodes(k: number): AssemblyNode[] {
  const P = POLYHEDRA.GOLDEN_RHOMBOHEDRON_PROLATE, O = POLYHEDRA.GOLDEN_RHOMBOHEDRON_OBLATE;
  const nodes: AssemblyNode[] = [];
  for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) for (let c = b + 1; c < k; c++) {
    const T = [a, b, c];
    const s = Math.sign(det3(AXES[a], AXES[b], AXES[c]));
    const base = new Vector3();
    for (let l = 0; l < k; l++) {
      if (T.includes(l)) continue;
      const m = [...T, l].map((i) => [AXES[i].x, AXES[i].y, AXES[i].z, HEIGHTS[i]]);
      if (Math.sign(det4(m)) * s > 0) base.add(AXES[l]);
    }
    const triple = T.map((i) => AXES[i]);
    const spec = [P, O].find((sp) => rotationFor(sp, triple))!;
    const q = rotationFor(spec, triple)!;
    const centre = base.clone().add(triple[0].clone().add(triple[1]).add(triple[2]).multiplyScalar(0.5));
    nodes.push({ id: `golden-${nodes.length + 1}`, shape: spec.id, transform: { position: [centre.x, centre.y, centre.z], quaternion: [q.x, q.y, q.z, q.w] } } as AssemblyNode);
  }
  return nodes;
}

// World-space centre of each face of a placed node.
function faceCentres(n: AssemblyNode): Vector3[] {
  const spec = POLYHEDRA[n.shape];
  const q = new Quaternion(...n.transform.quaternion), p = V(n.transform.position);
  return spec.faces.map((f) => f.reduce((s, i) => s.add(V(spec.vertices[i]).applyQuaternion(q).add(p)), new Vector3()).divideScalar(f.length));
}

export function goldenZonohedron(k: number): Assembly {
  const nodes = goldenZonohedronNodes(k);
  const centres = nodes.map(faceCentres);
  // Face connections along a spanning tree of shared faces (from piece 1).
  const connections: AssemblyConnection[] = [];
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    for (let j = 0; j < nodes.length; j++) {
      if (seen.has(j)) continue;
      for (let fa = 0; fa < centres[i].length; fa++) {
        const fb = centres[j].findIndex((c) => c.distanceTo(centres[i][fa]) < 1e-6);
        if (fb < 0) continue;
        connections.push({ nodeA: nodes[i].id, vertexA: fa, nodeB: nodes[j].id, vertexB: fb, kind: 'face' });
        seen.add(j);
        queue.push(j);
        break;
      }
    }
  }
  return { nodes, connections };
}

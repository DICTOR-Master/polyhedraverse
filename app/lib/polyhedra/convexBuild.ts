/**
 * Small helpers for the few shapes whose corners are computed rather than
 * written out (the Penrose rhombus prisms, the rhombic icosahedron):
 * centre a convex solid on the origin, wind every face anticlockwise seen
 * from outside (the registry's convention), and read the edges off the
 * faces.
 */
import type { Vec3 } from './core';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function centred(vertices: Vec3[]): Vec3[] {
  const c = vertices.reduce<Vec3>((s, v) => [s[0] + v[0] / vertices.length, s[1] + v[1] / vertices.length, s[2] + v[2] / vertices.length], [0, 0, 0]);
  return vertices.map((v) => sub(v, c));
}

/** Faces (each a cycle of corner indices, either way round) wound outward,
 *  for a convex solid centred on the origin. A face that needs turning
 *  keeps its first corner (face attach lines faces up from it; golden
 *  rhombi start at an acute corner). */
export function outward(vertices: Vec3[], faces: number[][]): number[][] {
  return faces.map((f) => {
    const n = cross(sub(vertices[f[1]], vertices[f[0]]), sub(vertices[f[2]], vertices[f[1]]));
    const mid = f.reduce<Vec3>((s, i) => [s[0] + vertices[i][0], s[1] + vertices[i][1], s[2] + vertices[i][2]], [0, 0, 0]);
    return dot(n, mid) > 0 ? f : [f[0], ...f.slice(1).reverse()];
  });
}

export function edgesOf(faces: number[][]): [number, number][] {
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const f of faces) for (let i = 0; i < f.length; i++) {
    const a = Math.min(f[i], f[(i + 1) % f.length]), b = Math.max(f[i], f[(i + 1) % f.length]);
    if (!seen.has(`${a},${b}`)) { seen.add(`${a},${b}`); out.push([a, b]); }
  }
  return out;
}

/** A zonohedron: every rhombic face spans two generators and sits where
 *  the others push it (each generator counted +-1/2 by which side of the
 *  face plane it points). Generators must be in general position. */
export function zonohedron(gens: Vec3[]): { vertices: Vec3[]; faces: number[][] } {
  const vertices: Vec3[] = [];
  const index = (p: Vec3) => {
    const key = p.map((x) => x.toFixed(9)).join();
    let i = vertices.findIndex((v) => v.map((x) => x.toFixed(9)).join() === key);
    if (i < 0) { vertices.push(p); i = vertices.length - 1; }
    return i;
  };
  const faces: number[][] = [];
  for (let i = 0; i < gens.length; i++) for (let j = i + 1; j < gens.length; j++) {
    for (const s of [1, -1]) {
      const n = cross(gens[i], gens[j]).map((x) => x * s) as Vec3;
      const c = gens.reduce<Vec3>((acc, g, k) => {
        if (k === i || k === j) return acc;
        const t = Math.sign(dot(n, g)) / 2;
        return [acc[0] + g[0] * t, acc[1] + g[1] * t, acc[2] + g[2] * t];
      }, [0, 0, 0]);
      const at = (a: number, b: number): Vec3 => [0, 1, 2].map((d) => c[d] + (a * gens[i][d] + b * gens[j][d]) / 2) as Vec3;
      // Start at an acute corner: -gi-gj when gi.gj > 0, else +gi-gj.
      const cycle = dot(gens[i], gens[j]) > 0 ? [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)] : [at(1, -1), at(1, 1), at(-1, 1), at(-1, -1)];
      faces.push(cycle.map(index));
    }
  }
  return { vertices, faces: outward(vertices, faces) };
}

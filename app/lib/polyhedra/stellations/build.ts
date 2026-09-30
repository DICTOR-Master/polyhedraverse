/**
 * The four Catalan stellation pieces (direct decisions 2026-09-30, real
 * calculations throughout), each sitting on one face of its Catalan:
 *
 *   1. flat: the pyramid at which each side lies flush with the
 *      neighbouring pyramid's side across the old edge, so pyramids on
 *      every face give a convex solid (h = r tan((pi - delta) / 2));
 *   2. first stellation: the pyramid whose sides lie in the neighbouring
 *      face planes (h = r tan(pi - delta));
 *   3. second stellation, 4. third stellation: that stellation cut into
 *      face pieces (solver.ts).
 *
 * r is the face's inradius and delta the solid's dihedral angle. Every
 * Catalan face has an incircle, whose centre is where the insphere
 * touches it; every side of a pyramid over that point then has the same
 * slope, and the neighbouring face planes all meet above it. Pieces on
 * every face of the solid build it exactly, and one on a single face is
 * a face-attach piece.
 */

import { type Vec3 } from '../core';
import { stellationPiece, type StellationPiece } from './solver';

export const STELLATION_SIZES = [1, 2, 3, 4] as const;
export type StellationSize = (typeof STELLATION_SIZES)[number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));

/** Outward unit normal and distance from the centre of each face of a solid centred on the origin. */
export function facePlanes(vertices: Vec3[], faces: number[][]): { n: Vec3; d: number }[] {
  return faces.map((f) => {
    const n = unit(cross(sub(vertices[f[1]], vertices[f[0]]), sub(vertices[f[2]], vertices[f[0]])));
    const d = dot(n, vertices[f[0]]);
    return d < 0 ? { n: scale(n, -1), d: -d } : { n, d };
  });
}

/** The face's incircle: centre (where the insphere touches it) and radius. */
export function faceIncircle(vertices: Vec3[], faces: number[][], faceIndex: number): { centre: Vec3; r: number } {
  const { n, d } = facePlanes(vertices, faces)[faceIndex];
  const centre = scale(n, d);
  const f = faces[faceIndex];
  const a = vertices[f[0]], b = vertices[f[1]];
  const ab = sub(b, a);
  const r = Math.hypot(...cross(sub(centre, a), ab)) / Math.hypot(...ab);
  return { centre, r };
}

/** The solid's dihedral angle (the same across every edge of a Catalan solid). */
export function dihedralAngle(vertices: Vec3[], faces: number[][], faceIndex: number): number {
  const planes = facePlanes(vertices, faces);
  const f = faces[faceIndex];
  const g = faces.findIndex((h, i) => i !== faceIndex && h.filter((v) => f.includes(v)).length === 2);
  return Math.PI - Math.acos(Math.min(1, dot(planes[faceIndex].n, planes[g].n)));
}

/** Height above the face of the flat (size 1) and first-stellation (size 2) pyramid apex. */
export function pyramidHeight(vertices: Vec3[], faces: number[][], faceIndex: number, size: 1 | 2): number {
  const { r } = faceIncircle(vertices, faces, faceIndex);
  const delta = dihedralAngle(vertices, faces, faceIndex);
  return size === 1 ? r * Math.tan((Math.PI - delta) / 2) : r * Math.tan(Math.PI - delta);
}

/**
 * The piece of the given size on face `faceIndex` of a Catalan solid
 * (vertices centred on the origin), in the solid's own coordinates.
 */
export function stellationPieceOnFace(vertices: Vec3[], faces: number[][], faceIndex: number, size: StellationSize): StellationPiece {
  return baseFirst(size >= 2 ? stellationPiece(vertices, faces, faceIndex, size - 1) : flatPyramid(vertices, faces, faceIndex), vertices[faces[faceIndex][0]]);
}

/**
 * Makes the base face 0 and starts it at the solid's own first corner of
 * that face (going round the other way, as it faces into the solid). Face
 * attach lines faces up from their first corners, so a base starting at
 * another corner (an obtuse one of a rhombus against an acute one, say)
 * would never sit flush.
 */
function baseFirst(piece: StellationPiece, firstCorner: Vec3): StellationPiece {
  const base = piece.faces[piece.baseFace];
  const start = base.findIndex((v) => Math.hypot(...sub(piece.vertices[v], firstCorner)) < 1e-9);
  if (start < 0) throw new Error('stellationPieceOnFace: base lost the face\'s first corner');
  const rotated = [...base.slice(start), ...base.slice(0, start)];
  const others = piece.faces.filter((_, i) => i !== piece.baseFace);
  return { vertices: piece.vertices, faces: [rotated, ...others], baseFace: 0 };
}

function flatPyramid(vertices: Vec3[], faces: number[][], faceIndex: number): StellationPiece {
  const f = faces[faceIndex];
  const { n } = facePlanes(vertices, faces)[faceIndex];
  const { centre } = faceIncircle(vertices, faces, faceIndex);
  const apex = add(centre, scale(n, pyramidHeight(vertices, faces, faceIndex, 1)));
  const k = f.length;
  const pieceVertices = [...f.map((i) => vertices[i]), apex];
  // The base faces into the solid, so it winds the other way round.
  const pieceFaces = [Array.from({ length: k }, (_, i) => (k - i) % k), ...Array.from({ length: k }, (_, i) => [i, (i + 1) % k, k])];
  return { vertices: pieceVertices, faces: pieceFaces, baseFace: 0 };
}

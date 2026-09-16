/**
 * A general right-prism builder over any existing planar n-gon face:
 * two copies of that face (unchanged shape), translated apart along
 * the face's own normal by `height`, joined by n planar lateral
 * rectangle faces. Shared infrastructure for two "Miscellaneous"
 * sub-groups (direct user requests, 2026-09-17):
 * - `miscellaneous/quad-prisms/` — rhombus/kite Catalan-solid faces
 *   (n=4), "prism-like extenders with irregular faces."
 * - `miscellaneous/rvcmg-connectors-v2/` — the U-Hex spacer piece
 *   (n=6), a plain hex-to-hex prism to lengthen a chain of RVCMG v2
 *   adapters "for convenience."
 *
 * No coalescence math needed (unlike the tapered RVCMG adapter pieces,
 * `app/lib/rvcmg/solid.ts`): a translational extrusion of an already-
 * planar polygon always produces planar lateral faces automatically —
 * each lateral face is spanned by one fixed base-edge vector and one
 * fixed translation vector, which is a plane by construction. Because
 * the translation axis is the face's own normal (perpendicular to
 * every in-plane edge), every lateral face is a genuine RECTANGLE
 * regardless of the base polygon's own angles — the angle between any
 * base edge and the (perpendicular) translation vector is always
 * exactly 90°. Setting `height` equal to a given base edge's own
 * length turns THAT lateral face into a genuine SQUARE — for a regular
 * polygon or a rhombus (all edges equal), one `height` makes every
 * lateral face a square; for a kite (2 short + 2 long edges), it makes
 * exactly 2 squares + 2 rectangles depending on which edge length is
 * chosen (direct user confirmation: pick the short edge, extending
 * this project's own precedent in `kiteToRdH.ts`/`kiteToUHex.ts`).
 *
 * **A real, structural limitation, found 2026-09-17 while wiring up
 * branching attachment for these lateral faces**: the app's own
 * face-attach placement (`computeFaceAttach`, mirrored in
 * `scripts/verify-face-attach.ts`) aligns two congruent faces by
 * matching vertex 0's own direction and assuming the rest follow via
 * `incoming[i] <-> target[(n-i)%n]` — a REFLECTION, which is only a
 * valid correspondence when vertex 0 sits on a real mirror axis that
 * passes THROUGH a vertex (`rotateFaceToMirrorAxis`'s own precondition).
 * A genuine (non-square) RECTANGLE's only mirror axes pass through
 * EDGE MIDPOINTS, never a vertex — confirmed directly, not assumed: for
 * edges `[p,q,p,q]` (p != q), `rotateFaceToMirrorAxis`'s own palindrome
 * check fails at every starting index, the same way it already does for
 * a genuinely asymmetric scalene triangle. This means NO vertex-0
 * choice makes two congruent rectangles place correctly under the
 * current formula, for ANY pair, not just a mismatched one — a deeper
 * gap than the rhombus/kite tie-break bug this same file's construction
 * exposed and `core.ts`'s `rotateFaceToMirrorAxis` was fixed for.
 * Caught computationally (`verify:face-attach` on a real kite prism's
 * own two rectangle lateral faces, even against ITSELF), not by
 * inspection. A real fix needs `computeFaceAttach` itself to detect an
 * edge-midpoint axis and use a different correspondence formula — out
 * of scope for this session; the kite pieces instead keep their 2
 * rectangle lateral faces OUT of `attachableFaceIndices` (their 2
 * square lateral faces and both caps stay in), so nothing currently
 * placeable in the app is placed incorrectly. See
 * `miscellaneous/quad-prisms/index.ts`'s own `kitePrism()` for where
 * this is applied.
 */

import { type Vec3, type PolyhedronSpec, buildConnectors, centerVertices, rotateFaceToMirrorAxis } from './core';

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function centroidOf(vs: Vec3[]): Vec3 {
  const c: Vec3 = [0, 0, 0];
  for (const v of vs) {
    c[0] += v[0] / vs.length;
    c[1] += v[1] / vs.length;
    c[2] += v[2] / vs.length;
  }
  return c;
}

/** Mirrors solid.ts's own `ensureOutward` (same precondition: the shape is centered at the origin) — small, deliberate duplicate rather than a cross-module dependency on a RVCMG-specific file for a non-RVCMG construction. */
function ensureOutward(idxs: number[], verts: Vec3[]): number[] {
  const pts = idxs.map((i) => verts[i]);
  const c = centroidOf(pts);
  const n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
  return dot(n, c) < 0 ? idxs.slice().reverse() : idxs;
}

export interface PolygonPrismOptions {
  id: string;
  name: string;
  /** The n real vertices of the base face (n >= 3), in their own winding order, at the source shape's own native scale. */
  faceVertices: Vec3[];
  /** That face's own outward unit normal — the extrusion axis. */
  normal: Vec3;
  /** Extrusion length along `normal` — see this file's own header for how each piece picks this. */
  height: number;
  /**
   * 'caps-only' (default) restricts `attachableFaceIndices` to the two
   * end caps — a plain end-to-end extender. 'all' opens every lateral
   * face up too, for branching (direct user request, 2026-09-17, for
   * the quad-prisms specifically — "add that please for branching
   * possibilities" — but NOT for the U-Hex spacer: "dont bother fr
   * U-Hex", so that piece stays end-to-end only). An explicit array
   * names exact face indices instead — needed for a kite base, whose 2
   * non-square rectangle lateral faces have a REAL, structural placement
   * limitation (see this file's own header) and must stay excluded even
   * though the piece's other faces are open for branching. A per-call
   * choice, not a blanket property of "being a polygon prism."
   */
  attachableFaces?: 'caps-only' | 'all' | number[];
}

export interface PolygonPrismResult {
  spec: PolyhedronSpec;
  problems: string[];
  /** Always 0/1 — the two caps are always pushed first. */
  capFaceIndices: [number, number];
}

export function buildPolygonPrismSolid(opts: PolygonPrismOptions): PolygonPrismResult {
  const problems: string[] = [];
  const n = opts.faceVertices.length;
  if (n < 3) problems.push(`buildPolygonPrismSolid: need at least 3 base vertices, got ${n}`);

  const liftVec = scale(opts.normal, opts.height);
  const rawVertices: Vec3[] = [...opts.faceVertices, ...opts.faceVertices.map((v) => add(v, liftVec))];
  const vertices = centerVertices(rawVertices);

  const faces: number[][] = [];
  faces.push(rotateFaceToMirrorAxis(vertices, ensureOutward(Array.from({ length: n }, (_, i) => i), vertices)));
  faces.push(rotateFaceToMirrorAxis(vertices, ensureOutward(Array.from({ length: n }, (_, i) => i + n), vertices)));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push(rotateFaceToMirrorAxis(vertices, ensureOutward([i, j, j + n, i + n], vertices)));
  }

  const edgeKey = (a: number, b: number): string => (a < b ? `${a},${b}` : `${b},${a}`);
  const seenEdges = new Set<string>();
  const edges: [number, number][] = [];
  for (const face of faces) {
    for (let k = 0; k < face.length; k++) {
      const a = face[k];
      const b = face[(k + 1) % face.length];
      const key = edgeKey(a, b);
      if (!seenEdges.has(key)) {
        seenEdges.add(key);
        edges.push([a, b]);
      }
    }
  }

  // Euler's formula: V=2n, E=3n, F=n+2 for any n, always V-E+F=2.
  const V = vertices.length;
  const E = edges.length;
  const F = faces.length;
  if (V - E + F !== 2) problems.push(`Euler's formula failed: V=${V} E=${E} F=${F}, V-E+F=${V - E + F}, expected 2`);

  // Every lateral face must be a real, planar rectangle: right angles
  // at all 4 corners (not just "opposite sides equal", which a
  // parallelogram already satisfies by construction — this project's
  // own recurring "equal edges alone don't rule out a rhombus" lesson).
  for (let i = 0; i < n; i++) {
    const face = faces[2 + i];
    const pts = face.map((idx) => vertices[idx]);
    for (let k = 0; k < 4; k++) {
      const prev = pts[(k - 1 + 4) % 4];
      const curr = pts[k];
      const next = pts[(k + 1) % 4];
      const e1 = sub(prev, curr);
      const e2 = sub(next, curr);
      const cosAngle = dot(e1, e2) / (Math.hypot(...e1) * Math.hypot(...e2));
      if (Math.abs(cosAngle) > 1e-9) problems.push(`lateral face ${i} corner ${k} is not a right angle (cos=${cosAngle.toFixed(9)})`);
    }
    // Planarity: the 4th point must lie in the plane spanned by the
    // other 3 — guaranteed by the translational-extrusion construction
    // (see this file's own header), re-checked here rather than assumed.
    const faceNormal = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    const planarity = Math.abs(dot(sub(pts[3], pts[0]), faceNormal)) / Math.hypot(...faceNormal);
    if (planarity > 1e-9) problems.push(`lateral face ${i} is not planar (deviation ${planarity.toFixed(9)})`);
  }

  const attachableFaceIndices = Array.isArray(opts.attachableFaces)
    ? opts.attachableFaces
    : opts.attachableFaces === 'all'
      ? Array.from({ length: faces.length }, (_, i) => i)
      : [0, 1];
  const spec: PolyhedronSpec = {
    id: opts.id,
    name: opts.name,
    faceCount: faces.length,
    vertices,
    edges,
    faces,
    connectors: buildConnectors(vertices, edges),
    attachableFaceIndices,
  };

  return { spec, problems, capFaceIndices: [0, 1] };
}

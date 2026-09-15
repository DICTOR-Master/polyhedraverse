/**
 * RVCMG Stage 8 — turning an adapter piece's two flat cross-sections
 * (the hemi-RD hex interface and the shape-specific target polygon,
 * currently coplanar per Stage 0-7's own design: "the tapered 3D wall
 * connecting them is a separate, later extrusion step, not part of
 * RVCMG's own state representation") into one real, closed, placeable
 * `PolyhedronSpec` solid.
 *
 * These 7 connector shapes have no external precedent (confirmed with
 * the user, 2026-09-15) — unlike every other family in this registry,
 * there is no published classification to check this construction
 * against. What CAN be, and is, checked computationally: Euler's
 * formula, every face planar and non-degenerate, every face wound
 * outward consistently, the hex face's edges matching the real hemi-RD
 * interface exactly, and the target face's edges matching whatever that
 * piece's own Stage 0-7 derivation already proved (typically unit
 * edge). The physical neck LENGTH (`wallHeight` below) is a genuinely
 * new design choice with nothing to derive it from — documented as
 * exactly that, not disguised as a derived fact.
 *
 * Approach: lift the target ring's real vertices along the hex
 * interface's own plane normal by `wallHeight`, then connect the two
 * rings with a triangulated wall — never quads, since a quad spanning
 * two differently-shaped/sized/rotated rings has no general guarantee
 * of being planar, while a triangle always is. The correspondence
 * between hex vertices and target vertices needed to build that wall is
 * never hand-declared per piece: it's recovered directly from the
 * target state's own vertex ids via `parseCompoundId` (spec's own
 * "derive, don't duplicate" id-encodes-ancestry design), so a change to
 * any adapter's own merge sequence can never silently desync from this
 * file's wall geometry.
 *
 * Known, accepted residual (2026-09-15): `verify:face-attach`'s full
 * exhaustive sweep found 2 of the ~3.4M checks still failing after
 * every other fix in this file (`rotateFaceToMirrorAxis`,
 * core.ts) — two of the TRIANGLE piece's own scalene wall triangles
 * that happen to be exact mirror images of each other (real, genuinely
 * chiral shapes with no reflective symmetry at all, so no mirror-axis
 * rotation exists to fix). `facesCongruent`'s own doc comment already
 * anticipated this exact case ("first appearing with the scalene-
 * triangle Catalan solids... it only changes behavior once a genuinely
 * chiral 2D face shape exists") — a real, pre-existing limitation of
 * the shared face-attach placement algorithm for chiral pairs, not
 * something this file introduced or can fix by itself. Zero practical
 * impact: both are wall faces, excluded from every RVCMG piece's own
 * `attachableFaceIndices`, so the app can never select or offer either
 * one for a real attach.
 */

import { type Vec3, type PolyhedronSpec, dist, buildConnectors, centerVertices, rotateFaceToMirrorAxis } from '../polyhedra/core';
import type { RvcmgState } from './types';
import { parseCompoundId } from './types';

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

/**
 * Recovers a compound vertex id's original leaf ids (spec's own
 * `parseCompoundId`, applied recursively) — pure string decoding, no
 * dependency on `sourceIds` or on how many intermediate coalesce/
 * separate steps produced this id. Order is preserved left-to-right at
 * every level, which — because `coalesce()` only ever merges ADJACENT
 * boundary vertices and always keeps the merged vertex at the earlier
 * index — means the returned leaf order is exactly the original hex
 * ring's own cyclic order restricted to this arc, not something this
 * function has to re-sort.
 */
function flattenLeaves(id: string): string[] {
  const parsed = parseCompoundId(id);
  return parsed ? [...flattenLeaves(parsed[0]), ...flattenLeaves(parsed[1])] : [id];
}

/** Reverses a face's vertex order if its own computed normal points inward (toward the solid's own centroid) instead of outward -- mirrors starPolyhedra.ts's `ensureOutward`, valid under the same precondition: the shape is centered at the origin. */
function ensureOutward(idxs: number[], verts: Vec3[]): number[] {
  const pts = idxs.map((i) => verts[i]);
  const c = centroidOf(pts);
  const n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
  return dot(n, c) < 0 ? idxs.slice().reverse() : idxs;
}

export interface BuildAdapterSolidOptions {
  id: string;
  name: string;
  /** The hex interface's own plane normal (`hemiRdInterfaceFrame().normal`) -- the axis the target ring is lifted along. */
  normal: Vec3;
  /** New design parameter (Stage 8, no external precedent to derive it from -- see this file's own header): how far the target ring is lifted from the hex plane. */
  wallHeight: number;
}

export interface BuildAdapterSolidResult {
  spec: PolyhedronSpec;
  problems: string[];
  /** Always 0 -- the hex (hemi-RD interface) face is always pushed first. Not inferable from face size alone (the target face is ALSO a triangle for the triangle piece). */
  hexFaceIndex: number;
  /** Always 1 -- the target (shape-specific) face is always pushed second. */
  targetFaceIndex: number;
}

/**
 * Builds the real 3D solid for one adapter piece: `hexState` is the
 * piece's OWN starting 6-vertex hemi-RD state (`states[0]` from its
 * `AdapterPieceResult`), `targetState` its own final state
 * (`states[states.length - 1]`).
 */
export function buildAdapterSolid(hexState: RvcmgState, targetState: RvcmgState, opts: BuildAdapterSolidOptions): BuildAdapterSolidResult {
  const problems: string[] = [];
  const n = hexState.vertices.length;

  const hexIndexById = new Map(hexState.vertices.map((v, i) => [v.id, i]));
  const arcs: number[][] = targetState.vertices.map((v) => {
    const leaves = flattenLeaves(v.id);
    return leaves.map((leafId) => {
      const idx = hexIndexById.get(leafId);
      if (idx === undefined) {
        problems.push(`target vertex "${v.id}"'s leaf "${leafId}" is not one of the hex interface's own vertex ids`);
        return -1;
      }
      return idx;
    });
  });

  // The arcs must exactly, contiguously partition the hex ring in its
  // own cyclic order -- a real structural guarantee of coalesce() (it
  // only ever merges adjacent vertices), re-checked here rather than
  // assumed, since this file's whole wall construction depends on it.
  const flatArcOrder = arcs.flat();
  if (flatArcOrder.length !== n) {
    problems.push(`arcs cover ${flatArcOrder.length} hex vertices total, expected exactly ${n}`);
  }
  const coverage = new Set(flatArcOrder);
  for (let i = 0; i < n; i++) {
    if (!coverage.has(i)) problems.push(`hex vertex ${i} is not covered by any target vertex's arc`);
  }
  if (coverage.size !== flatArcOrder.length) problems.push('a hex vertex is covered by more than one arc');
  const start = flatArcOrder[0];
  for (let i = 0; i < flatArcOrder.length; i++) {
    if (flatArcOrder[i] !== (start + i) % n) {
      problems.push('arcs are not a single contiguous cyclic pass over the hex ring in its own vertex order');
      break;
    }
  }
  if (problems.length > 0) {
    // Can't safely build geometry on top of a broken correspondence.
    return {
      spec: { id: opts.id, name: opts.name, faceCount: 0, vertices: [], edges: [], faces: [], connectors: [] },
      problems,
      hexFaceIndex: 0,
      targetFaceIndex: 1,
    };
  }

  // Raw (pre-centering) vertex list: hex ring first (0..n-1), then the
  // target ring (n..n+m-1), lifted off the shared plane by `wallHeight`
  // along the interface's own real normal.
  const liftVec = scale(opts.normal, opts.wallHeight);
  const rawVertices: Vec3[] = [...hexState.vertices.map((v) => v.pos), ...targetState.vertices.map((v) => add(v.pos, liftVec))];
  const vertices = centerVertices(rawVertices);
  const hexIdx = (i: number) => i;
  const targetIdx = (k: number) => n + k;

  const faces: number[][] = [];

  // The two flat cross-sections, unchanged in shape (each already
  // planar by construction: the hex interface is a real validated
  // planar loop, and the target ring is that same plane's own vertices
  // uniformly shifted along its normal, which preserves planarity) but
  // re-rooted to start at a real mirror-axis vertex
  // (`rotateFaceToMirrorAxis`) -- required by the face-attach placement
  // algorithm (see that function's own doc comment); a rotation only
  // changes which vertex is "index 0," never the winding/outward
  // direction, so this is safe to apply after `ensureOutward` settles
  // that.
  faces.push(rotateFaceToMirrorAxis(vertices, ensureOutward(hexState.vertices.map((_, i) => hexIdx(i)), vertices)));
  faces.push(rotateFaceToMirrorAxis(vertices, ensureOutward(targetState.vertices.map((_, k) => targetIdx(k)), vertices)));

  // The owner (target-vertex index) of each hex vertex, from the
  // now-verified arcs.
  const ownerOf = new Array<number>(n);
  arcs.forEach((arc, k) => arc.forEach((hexI) => (ownerOf[hexI] = k)));

  // The wall: walk the hex ring edge by edge. An edge INTERNAL to one
  // arc (both endpoints collapse to the same target vertex) becomes one
  // "fan" triangle to that vertex. An edge BETWEEN two arcs (a genuine
  // hex-ring edge that survives to the final boundary) becomes the two
  // triangles of the quad region bridging both rings there -- always
  // triangulated, never a quad, so every wall face is planar by
  // construction regardless of how differently shaped/sized/rotated the
  // two rings are.
  // Wall triangles also get `rotateFaceToMirrorAxis` (a no-op for a
  // genuinely scalene one, which is most of them) -- a real case found
  // computationally: some pieces' fan triangles happen to come out
  // isosceles by coincidence, which is enough symmetry for
  // `facesCongruent` to match one to ANOTHER isosceles triangle
  // elsewhere in the registry, and this file's own wall triangles are
  // never hand-authored with a "correct" vertex-0 the way a real target
  // face is -- so the same generic mirror-axis search used for the hex
  // applies here too.
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ownerI = ownerOf[i];
    const ownerJ = ownerOf[j];
    if (ownerI === ownerJ) {
      faces.push(rotateFaceToMirrorAxis(vertices, ensureOutward([hexIdx(i), hexIdx(j), targetIdx(ownerI)], vertices)));
    } else {
      faces.push(rotateFaceToMirrorAxis(vertices, ensureOutward([hexIdx(i), hexIdx(j), targetIdx(ownerI)], vertices)));
      faces.push(rotateFaceToMirrorAxis(vertices, ensureOutward([hexIdx(j), targetIdx(ownerJ), targetIdx(ownerI)], vertices)));
    }
  }

  const edgeKey = (a: number, b: number): string => (a < b ? `${a},${b}` : `${b},${a}`);
  const seenEdges = new Set<string>();
  const edges: [number, number][] = [];
  for (const face of faces) {
    for (let k = 0; k < face.length; k++) {
      const a = face[k];
      const b = face[(k + 1) % face.length];
      const key = edgeKey(a, b);
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      edges.push(a < b ? [a, b] : [b, a]);
    }
  }

  const spec: PolyhedronSpec = {
    id: opts.id,
    name: opts.name,
    faceCount: faces.length,
    vertices,
    edges,
    faces,
    connectors: buildConnectors(vertices, edges),
  };

  return { spec, problems, hexFaceIndex: 0, targetFaceIndex: 1 };
}

/**
 * Mirrors `validateShape`/`validateCatalanShape`'s style for a family
 * where neither "every edge is 1" nor "one uniform insphere radius"
 * applies (a genuinely mixed-edge-length taper, unlike either existing
 * convention -- the kite pieces' own target face has TWO distinct edge
 * lengths, ruling out a single expected-length constant). Checks the
 * properties that actually define a valid adapter solid: Euler's
 * formula, every face planar (all its vertices within `tol` of the
 * plane defined by its own first 3), no degenerate (near-zero-area)
 * face, every face's own winding outward-consistent (already enforced
 * during construction, re-checked here independently rather than
 * trusted), and -- the fact that actually matters physically -- the
 * target face's own edge lengths matching `originalTargetState` (the
 * SAME state passed into `buildAdapterSolid`, before the lift): lifting
 * along a fixed vector can't change in-plane distances, so this is a
 * guard against a future bug in this file rather than a claim that
 * needs a hand-typed expected number per piece.
 */
export function validateAdapterSolid(
  spec: PolyhedronSpec,
  originalTargetState: RvcmgState,
  hexFaceIndex: number,
  targetFaceIndex: number,
  tol = 1e-6,
): string[] {
  const problems: string[] = [];
  const V = spec.vertices.length;
  const F = spec.faces.length;
  const E = spec.edges.length;
  if (V - E + F !== 2) problems.push(`${spec.id}: Euler characteristic V-E+F = ${V - E + F}, expected 2 (V=${V}, E=${E}, F=${F})`);
  if (spec.faces.length !== spec.faceCount) problems.push(`${spec.id}: face count ${spec.faces.length} != faceCount ${spec.faceCount}`);
  const impliedEdges = spec.faces.reduce((sum, f) => sum + f.length, 0) / 2;
  if (spec.edges.length !== impliedEdges) problems.push(`${spec.id}: edge count ${spec.edges.length} != face-implied ${impliedEdges}`);

  const solidCentroid = centroidOf(spec.vertices);
  for (let fi = 0; fi < spec.faces.length; fi++) {
    const face = spec.faces[fi];
    const pts = face.map((i) => spec.vertices[i]);
    const c = centroidOf(pts);
    const planeNormal = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    const area2 = Math.hypot(...planeNormal);
    if (area2 < 1e-12) {
      problems.push(`${spec.id}: face ${fi} [${face.join(',')}] is degenerate (near-zero area)`);
      continue;
    }
    const n = scale(planeNormal, 1 / area2);
    for (let k = 0; k < pts.length; k++) {
      const offPlane = Math.abs(dot(sub(pts[k], pts[0]), n));
      if (offPlane > tol) problems.push(`${spec.id}: face ${fi} vertex ${face[k]} is ${offPlane.toFixed(9)} off its face's own plane`);
    }
    if (dot(n, sub(c, solidCentroid)) < 0) problems.push(`${spec.id}: face ${fi} [${face.join(',')}] winds inward, not outward`);
  }

  // Every face's own edges checked for reasonable length (no accidental
  // near-zero edge slipping through the fan/wall construction above).
  for (const [a, b] of spec.edges) {
    const d = dist(spec.vertices[a], spec.vertices[b]);
    if (d < 1e-9) problems.push(`${spec.id}: edge ${a}-${b} has zero length`);
  }

  // Cap faces are identified by their known construction indices, not
  // guessed by vertex count -- the target cap IS a triangle for the
  // triangle piece, indistinguishable from a wall face by size alone.
  const hexFace = spec.faces[hexFaceIndex];
  if (hexFace.length !== 6) problems.push(`${spec.id}: hex face (index ${hexFaceIndex}) has ${hexFace.length} vertices, expected 6`);
  const targetFace = spec.faces[targetFaceIndex];
  if (targetFace.length !== originalTargetState.vertices.length) {
    problems.push(`${spec.id}: target face has ${targetFace.length} vertices, originalTargetState has ${originalTargetState.vertices.length}`);
  } else {
    // Compared as a sorted multiset, not index-for-index:
    // `rotateFaceToMirrorAxis` may re-root the built face to a different
    // starting vertex than `originalTargetState`'s own array order (both
    // are valid mirror-axis starts for a shape with more than one, e.g.
    // a kite's own 2 equal-but-unequal-to-each-other edge pairs can swap
    // position under a different valid rotation) -- the lift preserves
    // every in-plane distance regardless of which vertex ends up first.
    const built = targetFace.map((v, k) => dist(spec.vertices[v], spec.vertices[targetFace[(k + 1) % targetFace.length]])).sort((a, b) => a - b);
    const original = originalTargetState.vertices
      .map((v, k) => dist(v.pos, originalTargetState.vertices[(k + 1) % originalTargetState.vertices.length].pos))
      .sort((a, b) => a - b);
    built.forEach((l, k) => {
      if (Math.abs(l - original[k]) > 1e-6) {
        problems.push(`${spec.id}: target face edge multiset mismatch: built has ${l.toFixed(9)}, pre-lift state's closest is ${original[k].toFixed(9)}`);
      }
    });
  }

  return problems;
}

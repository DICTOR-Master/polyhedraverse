/**
 * The real, bare RD-Hemi piece (see docs/rvcmg-adapter-pieces-spec.md's
 * own "RD-hemi (bare)" description) — genuinely one real half of the
 * rhombic dodecahedron, NOT a flat hex disk: the real rhombic faces and
 * vertices strictly on one side of the same bisection plane
 * `hemiRdInterface.ts` already uses, closed off by the flat hex cut
 * face. This is the ONE piece in the whole RVCMG family with a real 3D
 * "dome" body (direct user statement, 2026-09-15: "the RD-Hemi is the
 * only one to have a dome polyhedron") — every one of the 7 adapter
 * pieces (`solid.ts`) deliberately keeps its hex end perfectly flat.
 *
 * Derived directly from `POLYHEDRA.RHOMBIC_DODECAHEDRON`'s own real
 * data, never hand-declared: classifying its 14 vertices by the same
 * dot-product sign against the bisection axis `hemiRdInterface.ts`
 * already uses gives 4 strictly positive, 4 strictly negative, and the
 * same 6 on-plane vertices that ARE `HEMI_RD_INTERFACE`. Checking every
 * one of RD's 12 real rhombic faces against that classification
 * (computed below, not assumed) finds exactly 5 lying entirely on the
 * kept (non-negative) side, kept whole, and exactly 2 genuinely
 * straddling both sides — each of those has its two ON-PLANE vertices
 * sitting on a shared diagonal, so cutting along that existing diagonal
 * (not inventing a new one) splits each straddling rhombus into two
 * real triangles, one per side. The kept hemi is therefore: the 6 hex
 * vertices, the 4 positive vertices, 5 whole rhombi, 2 half-rhombus
 * triangles, and the one new hex cap face — 10 vertices, 8 faces.
 *
 * Scale: RD's own real, native scale — NOT rescaled at all. Every
 * adapter piece's own shared hex is ALSO built at this same native
 * scale (`hemiRdStartState`'s own corrected header, 2026-09-15), so
 * this piece's hex face lands exactly on theirs (confirmed below, not
 * assumed) AND its 5 real rhombi (uniform edge length, since RD itself
 * has one) land EXACTLY on `POLYHEDRA.RHOMBIC_DODECAHEDRON`'s own real
 * rhombi too — direct user report that surfaced the earlier, wrongly-
 * rescaled version's real gap: "you dont seem to have allowed RD-Hemi
 * to attach to full RD."
 */

import { type Vec3, type PolyhedronSpec, dist, buildConnectors, centerVertices, rotateFaceToMirrorAxis } from '../polyhedra/core';
import { CATALAN_ADDITIONS } from '../polyhedra/catalan';
import { hemiRdInterfaceFrame } from './hemiRdInterface';
import { hemiRdStartState } from './adapters/triangleToRdH';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const centroidOf = (vs: Vec3[]): Vec3 => {
  const c: Vec3 = [0, 0, 0];
  for (const v of vs) {
    c[0] += v[0] / vs.length;
    c[1] += v[1] / vs.length;
    c[2] += v[2] / vs.length;
  }
  return c;
};
function ensureOutward(idxs: number[], verts: Vec3[]): number[] {
  const pts = idxs.map((i) => verts[i]);
  const c = centroidOf(pts);
  const n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
  return dot(n, c) < 0 ? idxs.slice().reverse() : idxs;
}

export interface BuildRdHemiResult {
  spec: PolyhedronSpec;
  problems: string[];
  /** Index into `spec.faces` of the one rhombus face farthest from the hex (opposite it entirely, touching none of its vertices) -- the "crown," where a real hourglass compound joins two hemis (direct user description, 2026-09-15: "rhombi faces at crown... forms a rhombi waist"). Also included in `attachableFaceIndices` like every other real rhombus here -- not a separate mechanism, just the one a real hourglass build uses. */
  crownFaceIndex: number;
}

export function buildRdHemiSolid(id: string, name: string): BuildRdHemiResult {
  const problems: string[] = [];
  const RD = CATALAN_ADDITIONS.RHOMBIC_DODECAHEDRON;
  const AXIS = hemiRdInterfaceFrame().normal;
  const TOL = 1e-9;
  const classify = (v: Vec3): 1 | -1 | 0 => {
    const d = dot(v, AXIS);
    return d > TOL ? 1 : d < -TOL ? -1 : 0;
  };
  const classes = RD.vertices.map(classify);

  const hexState = hemiRdStartState();

  // Map each on-plane RD vertex index to its slot (0..5) in
  // hemiRdStartState()'s own hex, by position -- never assumed from
  // index order, so this can never silently desync from how every
  // adapter piece's own hex is built.
  const onPlaneToHexSlot = new Map<number, number>();
  RD.vertices.forEach((v, i) => {
    if (classes[i] !== 0) return;
    const slot = hexState.vertices.findIndex((hv) => dist(hv.pos, RD.vertices[i]) < 1e-6);
    if (slot === -1) {
      problems.push(`RD vertex ${i} (on-plane) doesn't match any of hemiRdStartState()'s own 6 hex positions`);
      return;
    }
    onPlaneToHexSlot.set(i, slot);
  });

  const positiveIndices = RD.vertices.map((_, i) => i).filter((i) => classes[i] === 1);
  if (positiveIndices.length !== 4) problems.push(`expected exactly 4 strictly-positive RD vertices, found ${positiveIndices.length}`);
  const positiveSlot = new Map<number, number>(positiveIndices.map((i, k) => [i, 6 + k]));

  // New vertex list: the 6 shared hex vertices (hexState's own
  // positions, byte-for-byte -- guarantees exact hex-to-hex congruence
  // with every adapter piece), then the 4 positive RD vertices.
  const rawVertices: Vec3[] = [...hexState.vertices.map((v) => v.pos), ...positiveIndices.map((i) => RD.vertices[i])];

  const remap = (rdIndex: number): number => {
    const hexSlot = onPlaneToHexSlot.get(rdIndex);
    if (hexSlot !== undefined) return hexSlot;
    const posSlot = positiveSlot.get(rdIndex);
    if (posSlot !== undefined) return posSlot;
    throw new Error(`buildRdHemiSolid: RD vertex ${rdIndex} is neither on-plane nor strictly positive (class ${classes[rdIndex]})`);
  };

  // Classify RD's own 12 real faces: entirely non-negative (kept
  // whole), entirely non-positive (belongs to the OTHER hemi, dropped),
  // or genuinely straddling both signs (split along its own real
  // diagonal connecting its two on-plane vertices -- confirmed below to
  // exist for every straddling face, not assumed).
  const wholeFaces: number[][] = [];
  const halfTriangles: number[][] = [];
  for (const face of RD.faces) {
    const cls = face.map((i) => classes[i]);
    if (cls.every((c) => c >= 0)) {
      wholeFaces.push(face.map(remap));
      continue;
    }
    if (cls.every((c) => c <= 0)) continue; // the other hemi's own whole face
    // Straddling: exactly one +, one -, two on-plane, per RD's own
    // structure (checked, not assumed) -- find the two on-plane
    // vertices (the real diagonal to split along) and the one positive
    // vertex (this hemi's own half).
    const onPlaneVerts = face.filter((i) => classes[i] === 0);
    const posVert = face.filter((i) => classes[i] === 1);
    if (onPlaneVerts.length !== 2 || posVert.length !== 1) {
      problems.push(`face [${face.join(',')}] straddles the bisection plane in an unexpected way (classes ${cls.join('')})`);
      continue;
    }
    halfTriangles.push([posVert[0], onPlaneVerts[0], onPlaneVerts[1]].map(remap));
  }
  if (wholeFaces.length !== 5) problems.push(`expected exactly 5 whole rhombi on this hemi, found ${wholeFaces.length}`);
  if (halfTriangles.length !== 2) problems.push(`expected exactly 2 half-rhombus triangles on this hemi, found ${halfTriangles.length}`);

  if (problems.length > 0) {
    return { spec: { id, name, faceCount: 0, vertices: [], edges: [], faces: [], connectors: [] }, problems, crownFaceIndex: -1 };
  }

  const vertices = centerVertices(rawVertices);
  const hexFaceRaw = hexState.vertices.map((_, i) => i);
  const faces: number[][] = [rotateFaceToMirrorAxis(vertices, ensureOutward(hexFaceRaw, vertices))];
  const rhombusFaceIndices: number[] = [];
  for (const f of wholeFaces) {
    rhombusFaceIndices.push(faces.length);
    faces.push(rotateFaceToMirrorAxis(vertices, ensureOutward(f, vertices)));
  }
  for (const f of halfTriangles) {
    faces.push(rotateFaceToMirrorAxis(vertices, ensureOutward(f, vertices)));
  }

  // The crown: the one whole rhombus touching NONE of the 6 hex
  // vertices at all -- the single face entirely opposite the hex,
  // confirmed by checking directly rather than assuming which of the 5
  // it is.
  const hexIndexSet = new Set(hexFaceRaw);
  const crownCandidates = rhombusFaceIndices.filter((fi) => faces[fi].every((v) => !hexIndexSet.has(v)));
  if (crownCandidates.length !== 1) {
    problems.push(`expected exactly 1 crown rhombus (touching none of the hex's own 6 vertices), found ${crownCandidates.length}`);
    return { spec: { id, name, faceCount: 0, vertices: [], edges: [], faces: [], connectors: [] }, problems, crownFaceIndex: -1 };
  }
  const crownFaceIndex = crownCandidates[0];

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
    id,
    name,
    faceCount: faces.length,
    vertices,
    edges,
    faces,
    connectors: buildConnectors(vertices, edges),
    // Every real rhombus (including the crown) plus the hex are valid
    // ports; the 2 half-rhombus triangles are cut artifacts, never a
    // real attach surface -- same policy as every adapter piece's own
    // wall faces.
    attachableFaceIndices: [0, ...rhombusFaceIndices],
  };

  return { spec, problems: [], crownFaceIndex };
}

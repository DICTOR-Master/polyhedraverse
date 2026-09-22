import { RD_RELATIVES_ADDITIONS, RD_RELATIVES_ADDITION_IDS } from '../app/lib/polyhedra/miscellaneous/rd-relatives';
import { CATALAN_ADDITIONS } from '../app/lib/polyhedra/catalan';
import { dist, facesCongruent, type Vec3 } from '../app/lib/polyhedra/core';

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

const RD = CATALAN_ADDITIONS.RHOMBIC_DODECAHEDRON;

let failed = false;
for (const id of RD_RELATIVES_ADDITION_IDS) {
  const spec = RD_RELATIVES_ADDITIONS[id];
  const problems: string[] = [];

  // Deliberately NOT validateShape (assumes edge length 1) or
  // validateCatalanShape (assumes every face is congruent to every
  // other -- wrong for ELONGATED_DODECAHEDRON's own mixed rhombi +
  // hexagons) -- see this shape's own header for why edge=1
  // normalization was rejected. Real checks instead: Euler's formula,
  // face count, the handshake lemma, and uniform (not necessarily 1)
  // edge length.
  const eulerLhs = spec.vertices.length - spec.edges.length + spec.faces.length;
  if (eulerLhs !== 2) problems.push(`${id}: Euler's formula fails, V-E+F=${eulerLhs}`);
  if (spec.faces.length !== spec.faceCount) problems.push(`${id}: face count ${spec.faces.length} != expected ${spec.faceCount}`);
  const impliedEdges = spec.faces.reduce((sum, f) => sum + f.length, 0) / 2;
  if (spec.edges.length !== impliedEdges) problems.push(`${id}: edge count ${spec.edges.length} != face-implied ${impliedEdges}`);
  const edgeLens = spec.edges.map(([a, b]) => dist(spec.vertices[a], spec.vertices[b]));
  const refLen = edgeLens[0];
  for (let i = 0; i < spec.edges.length; i++) {
    if (Math.abs(edgeLens[i] - refLen) > 1e-6) problems.push(`${id}: edge ${spec.edges[i].join('-')} length ${edgeLens[i].toFixed(8)} != reference ${refLen.toFixed(8)} (not uniform-edge)`);
  }

  // The real, load-bearing reason this shape was built at RD's own
  // absolute scale rather than through makeSpec's usual edge->1
  // rescale (see this file's own header): its rhombic face(s) must be
  // genuinely congruent to RHOMBIC_DODECAHEDRON's own real face, not
  // just similar, so facesCongruent() (the actual function ShapeViewer
  // uses to decide what a real RD can attach to) recognizes the match.
  const rhombusFaceIdx = spec.faces.findIndex((f) => f.length === 4);
  if (rhombusFaceIdx === -1) {
    problems.push(`${id}: expected at least one 4-sided (rhombic) face to cross-check against RHOMBIC_DODECAHEDRON`);
  } else if (!facesCongruent(spec.vertices, spec.faces[rhombusFaceIdx], RD.vertices, RD.faces[0])) {
    problems.push(`${id}: rhombic face [${spec.faces[rhombusFaceIdx].join(',')}] is NOT congruent to a real RHOMBIC_DODECAHEDRON face -- attachment to a real RD would not actually be flush`);
  }

  // Planarity: every vertex of a face must lie on the SAME plane as the
  // face's first 3 vertices (a real geometric fact this shape's own
  // construction guarantees -- not assumed here, checked).
  for (const face of spec.faces) {
    const [a, b, c] = [spec.vertices[face[0]], spec.vertices[face[1]], spec.vertices[face[2]]];
    const normal = cross(sub(b, a), sub(c, a));
    for (const idx of face) {
      const d = dot(normal, sub(spec.vertices[idx], a));
      if (Math.abs(d) > 1e-6) problems.push(`${id}: face [${face.join(',')}] vertex ${idx} is not coplanar (offset ${d.toFixed(8)})`);
    }
  }

  // Outward winding: each face's own Newell normal must point AWAY from
  // the shape's own center (shape is centered at origin by makeSpec).
  for (const face of spec.faces) {
    let n: Vec3 = [0, 0, 0];
    for (let i = 0; i < face.length; i++) {
      const p1 = spec.vertices[face[i]];
      const p2 = spec.vertices[face[(i + 1) % face.length]];
      n = [n[0] + p1[1] * p2[2] - p1[2] * p2[1], n[1] + p1[2] * p2[0] - p1[0] * p2[2], n[2] + p1[0] * p2[1] - p1[1] * p2[0]];
    }
    const centroid: Vec3 = face.reduce((acc: Vec3, idx) => [acc[0] + spec.vertices[idx][0] / face.length, acc[1] + spec.vertices[idx][1] / face.length, acc[2] + spec.vertices[idx][2] / face.length], [0, 0, 0]);
    if (dot(n, centroid) <= 0) problems.push(`${id}: face [${face.join(',')}] is NOT outward-wound (normal points inward)`);
  }

  // Convexity: every vertex not on a face must sit strictly on the
  // INWARD side of that face's own plane (no vertex pokes outside the
  // hull this face bounds).
  for (const face of spec.faces) {
    const [a, b, c] = [spec.vertices[face[0]], spec.vertices[face[1]], spec.vertices[face[2]]];
    const normal = cross(sub(b, a), sub(c, a));
    for (let vi = 0; vi < spec.vertices.length; vi++) {
      if (face.includes(vi)) continue;
      const d = dot(normal, sub(spec.vertices[vi], a));
      if (d > 1e-6) problems.push(`${id}: vertex ${vi} is OUTSIDE face [${face.join(',')}]'s own plane (not convex)`);
    }
  }

  // Every face's own vertex-0 canonicalization should mean every edge
  // around the face is a genuine straight side (no 3 consecutive
  // collinear points -- a real degenerate-polygon check).
  for (const face of spec.faces) {
    for (let i = 0; i < face.length; i++) {
      const prev = spec.vertices[face[(i - 1 + face.length) % face.length]];
      const cur = spec.vertices[face[i]];
      const next = spec.vertices[face[(i + 1) % face.length]];
      const v1 = sub(prev, cur), v2 = sub(next, cur);
      const cosang = dot(v1, v2) / (Math.hypot(...v1) * Math.hypot(...v2));
      if (cosang < -1 + 1e-9) problems.push(`${id}: face [${face.join(',')}] vertex ${face[i]} is degenerate (180 degree interior angle)`);
    }
  }

  if (problems.length === 0) {
    console.log(`${id}: OK (V=${spec.vertices.length} E=${spec.edges.length} F=${spec.faces.length})`);
  } else {
    failed = true;
    console.log(`${id}: FAILED`);
    for (const p of problems) console.log(`  ${p}`);
  }
}
if (failed) process.exit(1);

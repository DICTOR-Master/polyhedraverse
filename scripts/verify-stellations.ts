/**
 * Checks the Stellations family (app/lib/polyhedra/stellations/):
 *
 *   - pieces.generated.ts matches a fresh run of the generator;
 *   - each solid has exactly the stellations it really has: the next size
 *     after its last piece adds nothing;
 *   - every piece is a closed, outward-wound solid whose base is exactly
 *     congruent to its solid's face (and only to faces of its own hand);
 *   - sizes 1 and 2 are pyramids with the apex over the face's incircle
 *     centre; size 1's sides lie flush with the next piece's across each
 *     edge, size 2's in the neighbouring face planes;
 *   - every other face of sizes 3 and 4 lies in a face plane of the solid
 *     or in a seam (a plane through the centre and a base edge);
 *   - volume grows with size;
 *   - independently of the solver: random points in the face's cone are
 *     inside the size-k piece exactly when at most k-1 face planes
 *     separate them from the centre and their cell of the plane
 *     arrangement is bounded (the classical stellation rule);
 *   - the named results: flat pieces on the Platonic solids merge into
 *     the rhombi of the cube, rhombic dodecahedron or rhombic
 *     triacontahedron; the octahedron's first stellation has regular
 *     tetrahedra for spikes; the dodecahedron's and icosahedron's reach
 *     out along the axes of the solids they are named for.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { POLYHEDRA } from '../app/lib/polyhedra';
import { type Vec3, centerVertices, facesCongruent, triangulateFace } from '../app/lib/polyhedra/core';
import { STELLATION_ADDITIONS, stellationBuilds } from '../app/lib/polyhedra/stellations';
import { stellationPieceOnFace, facePlanes, faceIncircle, pyramidHeight, type StellationSize } from '../app/lib/polyhedra/stellations/build';
import { STELLATION_PIECES } from '../app/lib/polyhedra/stellations/pieces.generated';
import { generateStellationSource, STELLATED_SOLIDS } from './stellationSource';
import { describeAssembly } from '../app/lib/assemblyNaming';
import type { AssemblyConnection, AssemblyNode } from '../app/lib/assembly';

let failures = 0;
let checks = 0;
const check = (ok: boolean, msg: string) => {
  checks++;
  if (!ok) {
    failures++;
    console.log(`FAIL ${msg}`);
  }
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => { const n = Math.hypot(...a); return [a[0] / n, a[1] / n, a[2] / n]; };

function volume(vertices: Vec3[], faces: number[][]): number {
  let v = 0;
  for (const f of faces) for (const [a, b, c] of triangulateFace(f, vertices)) v += dot(vertices[a], cross(vertices[b], vertices[c])) / 6;
  return v;
}

function closedAndOriented(faces: number[][]): boolean {
  const directed = new Set<string>();
  for (const f of faces) for (let i = 0; i < f.length; i++) {
    const key = `${f[i]},${f[(i + 1) % f.length]}`;
    if (directed.has(key)) return false;
    directed.add(key);
  }
  for (const key of directed) {
    const [a, b] = key.split(',');
    if (!directed.has(`${b},${a}`)) return false;
  }
  return true;
}

/** Point in a closed mesh, by the parity of crossings along a fixed skew ray. */
function inside(p: Vec3, vertices: Vec3[], faces: number[][]): boolean {
  const dir = unit([0.5773, 0.4123, 0.7049]);
  let hits = 0;
  for (const f of faces) for (const [ia, ib, ic] of triangulateFace(f, vertices)) {
    const a = vertices[ia], b = vertices[ib], c = vertices[ic];
    const e1 = sub(b, a), e2 = sub(c, a), h = cross(dir, e2), det = dot(e1, h);
    if (Math.abs(det) < 1e-14) continue;
    const s = sub(p, a), u = dot(s, h) / det;
    if (u < 0 || u > 1) continue;
    const q = cross(s, e1), v = dot(dir, q) / det;
    if (v < 0 || u + v > 1) continue;
    if (dot(e2, q) / det > 0) hits++;
  }
  return hits % 2 === 1;
}

// 1. The generated file is up to date.
const onDisk = readFileSync(join(__dirname, '..', 'app', 'lib', 'polyhedra', 'stellations', 'pieces.generated.ts'), 'utf8');
check(onDisk === generateStellationSource(), 'pieces.generated.ts is stale: run npx tsx scripts/generate-stellations.ts');

// How many sizes each Platonic solid really has (flat, then its stellations).
const PLATONIC_SIZES: Record<string, number> = { D4: 1, CUBE: 1, D8: 2, DODECAHEDRON: 4, D20: 4 };

for (const solid of STELLATED_SOLIDS) {
  const spec = POLYHEDRA[solid];
  const vertices = centerVertices(spec.vertices);
  const planes = facePlanes(vertices, spec.faces);
  const pieces = Object.entries(STELLATION_PIECES).filter(([, p]) => p.solid === solid);
  const hands = new Set(pieces.map(([, p]) => p.hand ?? '')).size;
  const sizes = [...new Set(pieces.map(([, p]) => p.size))].sort((a, b) => a - b) as StellationSize[];
  check(pieces.length === (PLATONIC_SIZES[solid] ?? 4) * hands, `${solid}: ${pieces.length} pieces`);

  for (const [id, p] of pieces) {
    const piece = STELLATION_ADDITIONS[id];
    check(closedAndOriented(piece.faces), `${id}: not a closed, consistently wound surface`);
    check(volume(piece.vertices, piece.faces) > 0, `${id}: not wound outward`);
    const base = piece.faces[p.baseFace];
    const fits = spec.faces.filter((f) => facesCongruent(piece.vertices, base, vertices, f));
    check(fits.length > 0, `${id}: base fits no face of ${solid}`);
    if (p.hand) check(fits.length === spec.faces.length / 2, `${id}: a ${p.hand} piece fits ${fits.length} of ${spec.faces.length} faces, not half`);
    else check(fits.length === spec.faces.length, `${id}: fits ${fits.length} of ${spec.faces.length} faces`);
    check(piece.attachableFaceIndices?.length === 1 && piece.attachableFaceIndices[0] === p.baseFace, `${id}: only the base should attach`);
  }

  // Geometry in the solid's own frame, on face 0.
  const F = 0;
  const f0 = spec.faces[F];
  const { centre, r } = faceIncircle(vertices, spec.faces, F);
  const nF = planes[F].n;
  const walls = f0.map((v, i) => { let n = unit(cross(vertices[v], vertices[f0[(i + 1) % f0.length]])); if (dot(n, centre) > 0) n = [-n[0], -n[1], -n[2]]; return n; });
  const inCone = (x: Vec3) => walls.every((n) => dot(n, x) < -1e-9) && dot(nF, x) > planes[F].d + 1e-9;
  const built = new Map(sizes.map((size) => [size, stellationPieceOnFace(vertices, spec.faces, F, size)]));
  const last = sizes[sizes.length - 1];
  if (last < 4) {
    // The next size really adds nothing (or has no bounded cells at all).
    let more = false;
    try {
      const next = stellationPieceOnFace(vertices, spec.faces, F, (last + 1) as StellationSize);
      more = volume(next.vertices, next.faces) > volume(built.get(last)!.vertices, built.get(last)!.faces) + 1e-9;
    } catch { /* no bounded cells */ }
    check(!more, `${solid}: size ${last + 1} exists but has no piece`);
  }

  // Incircle: equidistant from every side.
  for (let i = 0; i < f0.length; i++) {
    const a = vertices[f0[i]], ab = sub(vertices[f0[(i + 1) % f0.length]], a);
    check(Math.abs(Math.hypot(...cross(sub(centre, a), ab)) / Math.hypot(...ab) - r) < 1e-9, `${solid}: incircle centre not equidistant from side ${i}`);
  }

  for (const size of ([1, 2] as const).filter((z) => built.has(z))) {
    const pc = built.get(size)!;
    const apexes = pc.vertices.filter((v) => dot(nF, v) > planes[F].d + 1e-9);
    check(apexes.length === 1 && pc.vertices.length === f0.length + 1, `${solid} size ${size}: not a pyramid`);
    const apex = apexes[0];
    const h = dot(nF, apex) - planes[F].d;
    check(Math.abs(h - pyramidHeight(vertices, spec.faces, F, size)) < 1e-9, `${solid} size ${size}: height`);
    check(Math.hypot(...sub(sub(apex, [nF[0] * h, nF[1] * h, nF[2] * h]), centre)) < 1e-9, `${solid} size ${size}: apex not over the incircle centre`);
  }
  // Size 2: each side lies in the plane of the face across that edge.
  if (built.has(2)) {
    const apex = built.get(2)!.vertices.find((v) => dot(nF, v) > planes[F].d + 1e-9)!;
    for (let i = 0; i < f0.length; i++) {
      const a = f0[i], b = f0[(i + 1) % f0.length];
      const g = spec.faces.findIndex((h, j) => j !== F && h.includes(a) && h.includes(b));
      check(Math.abs(dot(planes[g].n, apex) - planes[g].d) < 1e-9, `${solid} size 2: side ${i} not in the neighbouring face plane`);
    }
  }
  // Size 1: each side is flush with the side of the size-1 piece next door.
  {
    const apex = built.get(1)!.vertices.find((v) => dot(nF, v) > planes[F].d + 1e-9)!;
    for (let i = 0; i < f0.length; i++) {
      const a = f0[i], b = f0[(i + 1) % f0.length];
      const g = spec.faces.findIndex((h, j) => j !== F && h.includes(a) && h.includes(b));
      const other = stellationPieceOnFace(vertices, spec.faces, g, 1);
      const apexG = other.vertices.find((v) => dot(planes[g].n, v) > planes[g].d + 1e-9)!;
      const n = unit(cross(sub(vertices[b], vertices[a]), sub(apex, vertices[a])));
      check(Math.abs(dot(n, sub(apexG, vertices[a]))) < 1e-9, `${solid} size 1: side ${i} not flush with the next piece`);
    }
  }
  // Sizes 3 and 4: every face is the base, in a face plane, or in a seam.
  for (const size of ([3, 4] as const).filter((z) => built.has(z))) {
    const pc = built.get(size)!;
    pc.faces.forEach((face, fi) => {
      if (fi === pc.baseFace) return;
      const pts = face.map((v) => pc.vertices[v]);
      const onPlane = (n: Vec3, d: number) => pts.every((q) => Math.abs(dot(n, q) - d) < 1e-7);
      check(planes.some((pl) => onPlane(pl.n, pl.d)) || walls.some((n) => onPlane(n, 0)), `${solid} size ${size}: face ${fi} is in no face plane or seam`);
    });
  }
  // Volume grows with size.
  const vols = sizes.map((z) => volume(built.get(z)!.vertices, built.get(z)!.faces));
  for (let i = 1; i < vols.length; i++) check(vols[i] > vols[i - 1] + 1e-9, `${solid}: size ${i + 1} volume ${vols[i].toFixed(6)} not above size ${i}'s ${vols[i - 1].toFixed(6)}`);

  // Independent check against the stellation rule, by random points.
  const P = planes.length;
  const pairs: Vec3[] = [];
  for (let i = 0; i < P; i++) for (let j = i + 1; j < P; j++) { const c = cross(planes[i].n, planes[j].n); if (Math.hypot(...c) > 1e-9) { pairs.push(unit(c), unit([-c[0], -c[1], -c[2]])); } }
  const bounded = (x: Vec3) => {
    // The cell is unbounded exactly when some direction keeps every plane
    // on the same side; such a direction can be taken on two planes' line.
    const side = planes.map((pl) => (dot(pl.n, x) > pl.d ? 1 : -1));
    return !pairs.some((u) => planes.every((pl, i) => side[i] * dot(pl.n, u) >= -1e-12));
  };
  const reach = Math.max(...built.get(last)!.vertices.map((v) => Math.hypot(...v))) * 1.05;
  const samples = P > 60 ? 800 : 1500;
  let seed = 12345;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let mismatches = 0;
  let tested = 0;
  for (let s = 0; s < samples; s++) {
    // A random point of face 0, pushed out from the centre: always in the cone.
    const w = f0.map(() => -Math.log(rand() + 1e-12));
    const sw = w.reduce((m, q) => m + q, 0);
    const onFace = f0.reduce((m, v, i) => [m[0] + (vertices[v][0] * w[i]) / sw, m[1] + (vertices[v][1] * w[i]) / sw, m[2] + (vertices[v][2] * w[i]) / sw] as Vec3, [0, 0, 0] as Vec3);
    const t = 1 + rand() * (reach / planes[F].d - 1);
    const x: Vec3 = [onFace[0] * t, onFace[1] * t, onFace[2] * t];
    if (!inCone(x) || planes.some((pl) => Math.abs(dot(pl.n, x) - pl.d) < 1e-6)) continue;
    tested++;
    const count = planes.filter((pl) => dot(pl.n, x) > pl.d).length;
    const isBounded = count <= 3 ? bounded(x) : false;
    for (const size of sizes.filter((z) => z >= 2)) {
      const expected = count <= size - 1 && isBounded;
      const pc = built.get(size)!;
      if (inside(x, pc.vertices, pc.faces) !== expected) mismatches++;
    }
  }
  check(tested > 400 || last === 1, `${solid}: only ${tested} random points fell in the cone`);
  check(mismatches === 0, `${solid}: ${mismatches} random points disagree with the stellation rule`);
  console.log(`${solid.padEnd(28)} sizes ${sizes.join(',')} volumes ${vols.map((v) => v.toFixed(4)).join(' < ')}   (${tested} random points)`);
}

// The named results, proved from the pieces themselves.
{
  const solidFrame = (solid: string) => { const spec = POLYHEDRA[solid]; return { spec, vertices: centerVertices(spec.vertices) }; };
  const apexOf = (solid: string, face: number, size: 1 | 2) => {
    const { spec, vertices } = solidFrame(solid);
    const pl = facePlanes(vertices, spec.faces)[face];
    return stellationPieceOnFace(vertices, spec.faces, face, size).vertices.find((v) => dot(pl.n, v) > pl.d + 1e-9)!;
  };
  // Flat pieces on a Platonic solid: across each edge, the two flush sides
  // form a rhombus whose diagonals are in the ratio of the named solid's.
  const RATIO: Record<string, [string, number]> = { D4: ['cube', 1], CUBE: ['rhombic dodecahedron', Math.SQRT2], D8: ['rhombic dodecahedron', Math.SQRT2], DODECAHEDRON: ['rhombic triacontahedron', (1 + Math.sqrt(5)) / 2], D20: ['rhombic triacontahedron', (1 + Math.sqrt(5)) / 2] };
  for (const [solid, [name, ratio]] of Object.entries(RATIO)) {
    const { spec, vertices } = solidFrame(solid);
    const f = spec.faces[0];
    const [a, b] = [f[0], f[1]];
    const g = spec.faces.findIndex((h, j) => j !== 0 && h.includes(a) && h.includes(b));
    const [pF, pG] = [apexOf(solid, 0, 1), apexOf(solid, g, 1)];
    const sides = [pF, pG].flatMap((p) => [Math.hypot(...sub(p, vertices[a])), Math.hypot(...sub(p, vertices[b]))]);
    check(sides.every((x) => Math.abs(x - sides[0]) < 1e-9), `${solid} flat: the merged face is not a rhombus`);
    const d1 = Math.hypot(...sub(vertices[a], vertices[b])), d2 = Math.hypot(...sub(pF, pG));
    check(Math.abs(Math.max(d1, d2) / Math.min(d1, d2) - ratio) < 1e-9, `${solid} flat: diagonals ${Math.max(d1, d2) / Math.min(d1, d2)} are not the ${name}'s ${ratio}`);
    check(stellationBuilds(`STELLATION_${solid}_1`) === name, `${solid} flat: named ${stellationBuilds(`STELLATION_${solid}_1`)}, not ${name}`);
  }
  // The octahedron's first stellation: every spike a regular tetrahedron.
  {
    const { spec, vertices } = solidFrame('D8');
    const apex = apexOf('D8', 0, 2);
    const edges = spec.faces[0].map((v) => Math.hypot(...sub(apex, vertices[v])));
    const base = Math.hypot(...sub(vertices[spec.faces[0][0]], vertices[spec.faces[0][1]]));
    check(edges.every((e) => Math.abs(e - base) < 1e-9), 'D8 first stellation: spikes are not regular tetrahedra');
  }
  // The dodecahedron's and icosahedron's stellations reach out furthest
  // along the axes of the solids they are named for: the small stellated
  // dodecahedron's points over the face centres, the great dodecahedron's
  // corners (an icosahedron's) likewise, the great stellated
  // dodecahedron's (a dodecahedron's) along the dodecahedron's own
  // corners, and the compound of five octahedra's (an icosidodecahedron's)
  // along the icosahedron's edge midpoints.
  const AXES: [string, number, 'face' | 'vertex' | 'edge'][] = [['DODECAHEDRON', 2, 'face'], ['DODECAHEDRON', 3, 'face'], ['DODECAHEDRON', 4, 'vertex'], ['D20', 3, 'edge']];
  for (const [solid, size, axis] of AXES) {
    const { spec, vertices } = solidFrame(solid);
    const dirs: Vec3[] = axis === 'vertex' ? vertices : axis === 'face' ? facePlanes(vertices, spec.faces).map((p) => p.n) : spec.edges.map(([i, j]) => [(vertices[i][0] + vertices[j][0]) / 2, (vertices[i][1] + vertices[j][1]) / 2, (vertices[i][2] + vertices[j][2]) / 2] as Vec3);
    const pieceVerts = stellationPieceOnFace(vertices, spec.faces, 0, size as StellationSize).vertices;
    const far = Math.max(...pieceVerts.map((v) => Math.hypot(...v)));
    const tips = pieceVerts.filter((v) => Math.hypot(...v) > far - 1e-9);
    check(tips.every((t) => dirs.some((d) => Math.abs(dot(unit(t), unit(d)) - 1) < 1e-9)), `${solid} size ${size}: furthest points are not along the ${axis} axes`);
  }
}

// The build namer names a solid with one piece on every face after that
// piece's stellation, and nothing less than a full cover.
for (const solid of STELLATED_SOLIDS) {
  const faceCount = POLYHEDRA[solid].faces.length;
  const pieceIds = Object.keys(STELLATION_PIECES).filter((id) => STELLATION_PIECES[id].solid === solid);
  for (const size of [...new Set(pieceIds.map((id) => STELLATION_PIECES[id].size))]) {
    const ofSize = pieceIds.filter((id) => STELLATION_PIECES[id].size === size);
    const build = (n: number) => {
      const t = { position: [0, 0, 0] as [number, number, number], quaternion: [0, 0, 0, 1] as [number, number, number, number] };
      const nodes: AssemblyNode[] = [{ id: 'root', shape: solid, transform: t }];
      const connections: AssemblyConnection[] = [];
      for (let f = 0; f < n; f++) {
        nodes.push({ id: `p${f}`, shape: ofSize[f % ofSize.length], transform: t });
        connections.push({ nodeA: 'root', vertexA: f, nodeB: `p${f}`, vertexB: 0, kind: 'face' } as AssemblyConnection);
      }
      return describeAssembly(nodes, connections);
    };
    const full = build(faceCount);
    const builds = stellationBuilds(ofSize[0]);
    if (builds) check(full.toLowerCase().startsWith(builds.toLowerCase()), `namer: ${solid} size ${size} full cover is "${full}", expected ${builds}`);
    else check(/Stellation of the|flat pyramids/i.test(full), `namer: ${solid} size ${size} full cover is "${full}"`);
    if (faceCount > 1) check(build(faceCount - 1) !== full, `namer: ${solid} size ${size} named the same one piece short`);
    if (solid === 'RHOMBIC_DODECAHEDRON' && size === 2) console.log(`namer: RD + 12 size-2 pieces -> "${full}"`);
    if (solid === 'DODECAHEDRON' && size === 4) console.log(`namer: dodecahedron + 12 size-4 pieces -> "${full}"`);
    if (solid === 'DELTOIDAL_ICOSITETRAHEDRON' && size === 3) console.log(`namer: deltoidal icositetrahedron + 24 size-3 pieces -> "${full}"`);
  }
}

console.log(`\n${checks} checks, ${failures} failures.`);
process.exit(failures ? 1 : 0);

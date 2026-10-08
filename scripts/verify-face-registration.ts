/**
 * Checks face registration (app/lib/faceRegistration.ts):
 *
 *   - the overlap test: touching pieces (a face, an edge, a corner) don't
 *     clash; overlapping ones do;
 *   - on every face of every parallelohedron, attaching its own kind to a
 *     lone piece offers the slid copy (the tiling) first;
 *   - slotting a regular-hexagon elongated dodecahedron into a corner of a
 *     built cluster offers a 2- or 3-face fit first, exactly where the
 *     tiling puts it;
 *   - no offered option cuts into a built piece, checked independently by
 *     sampling points inside the new piece against every built piece's
 *     face planes; and some raw options really were hidden;
 *   - a piece that isn't convex is never hidden.
 */
import * as THREE from 'three';
import { POLYHEDRA } from '../krp-core/src/polyhedra/index.js';
import { facesCongruent } from '../krp-core/src/polyhedra/core.js';
import { faceAttachOptions } from '../krp-core/src/assembly/faceAttach.js';
import { FaceIndex, convexOverlap, isConvex, rankFaceAttachOptions, type BuiltPiece } from '../krp-core/src/assembly/faceRegistration.js';
import { familyIds } from '../krp-core/src/polyhedra/families.js';

let failures = 0;
let checks = 0;
const check = (ok: boolean, msg: string) => {
  checks++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`);
  if (!ok) failures++;
};
type Spec = (typeof POLYHEDRA)[string];
const at = (spec: Spec, shift: THREE.Vector3 = new THREE.Vector3()): BuiltPiece => ({ spec, matrixWorld: new THREE.Matrix4().makeTranslation(shift.x, shift.y, shift.z) });
const verts = (b: BuiltPiece) => b.spec.vertices.map((v) => new THREE.Vector3(...v).applyMatrix4(b.matrixWorld));
const faceCentre = (spec: Spec, f: number) => spec.faces[f].reduce((s, i) => s.add(new THREE.Vector3(...spec.vertices[i])), new THREE.Vector3()).multiplyScalar(1 / spec.faces[f].length);
const congruentFaces = (target: Spec, tf: number, spec: Spec) => spec.faces.map((_, i) => i).filter((i) => facesCongruent(target.vertices, target.faces[tf], spec.vertices, spec.faces[i]));
const placedVerts = (spec: Spec, o: { quaternion: THREE.Quaternion; position: THREE.Vector3 }) => spec.vertices.map((v) => new THREE.Vector3(...v).applyQuaternion(o.quaternion).add(o.position));
const sameSet = (a: THREE.Vector3[], b: THREE.Vector3[]) => a.length === b.length && a.every((p) => b.some((q) => p.distanceToSquared(q) < 1e-9));

// 1. The overlap test.
{
  const C = POLYHEDRA.CUBE;
  const tol = 1e-6;
  const v = (s: THREE.Vector3) => verts(at(C, s));
  const o = new THREE.Vector3();
  check(!convexOverlap(C, v(o), C, v(new THREE.Vector3(1, 0, 0)), tol), 'cubes sharing a face do not clash');
  check(!convexOverlap(C, v(o), C, v(new THREE.Vector3(1, 1, 0)), tol), 'cubes sharing an edge do not clash');
  check(!convexOverlap(C, v(o), C, v(new THREE.Vector3(1, 1, 1)), tol), 'cubes sharing a corner do not clash');
  check(convexOverlap(C, v(o), C, v(new THREE.Vector3(0.5, 0, 0)), tol), 'cubes half overlapping clash');
  check(convexOverlap(C, v(o), C, v(o), tol), 'a cube on top of itself clashes');
}

// 2. Lone piece: the slid copy first, on every face of every parallelohedron.
for (const id of familyIds('PARALLELOHEDRA')) {
  const S = POLYHEDRA[id];
  const built = [at(S)];
  const bad: number[] = [];
  S.faces.forEach((_, tf) => {
    const ranked = rankFaceAttachOptions(faceAttachOptions(S, tf, new THREE.Matrix4(), S, congruentFaces(S, tf, S)), S, built, 0, tf, true);
    const slid = verts(at(S, faceCentre(S, tf).multiplyScalar(2)));
    if (!(ranked[0]?.tiling && sameSet(placedVerts(S, ranked[0].option), slid))) bad.push(tf);
  });
  check(bad.length === 0, `${id}: on all ${S.faces.length} faces the slid copy (the tiling) is offered first${bad.length ? ` (not on faces ${bad.join(', ')})` : ''}`);
}

// 3. A corner slot in a regular-hexagon ED cluster.
{
  const S = POLYHEDRA.REGULAR_HEX_ED;
  // Tiling translations: twice each face centre.
  const T = S.faces.map((_, f) => faceCentre(S, f).multiplyScalar(2));
  // Two neighbour translations a, b whose sum is also a neighbour: cells at 0, a, b all touch a + b.
  let found: { a: number; b: number } | null = null;
  for (let a = 0; a < T.length && !found; a++) for (let b = 0; b < T.length && !found; b++) {
    const sum = T[a].clone().add(T[b]);
    if (a !== b && T[a].distanceTo(T[b].clone().negate()) > 1e-6 && T.some((t) => t.distanceTo(sum) < 1e-6)) found = { a, b };
  }
  check(!!found, 'the regular-hexagon ED has neighbours a, b with a + b also a neighbour (a corner where three cells meet)');
  if (found) {
    const { a, b } = found;
    const built = [at(S), at(S, T[a]), at(S, T[b])];
    // Attach to cell a's face that points along b.
    const tf = T.findIndex((t) => t.distanceTo(T[b]) < 1e-6);
    const targetM = built[1].matrixWorld;
    const raw = faceAttachOptions(S, tf, targetM, S, congruentFaces(S, tf, S));
    const index = new FaceIndex(built);
    const ranked = rankFaceAttachOptions(raw, S, built, 1, tf, true, index);
    const want = verts(at(S, T[a].clone().add(T[b])));
    check(ranked.length > 0 && ranked[0].flushFaces >= 2 && sameSet(placedVerts(S, ranked[0].option), want), `slotting into the corner: the first option sits flush on ${ranked[0]?.flushFaces} faces, exactly where the tiling puts it`);
    check(ranked.length < raw.length, `clashing options are hidden (${raw.length - ranked.length} of ${raw.length})`);
    // Independent clash check: sample points inside each offered piece.
    const inside = (p: THREE.Vector3, b: BuiltPiece) => {
      const V = verts(b);
      const c = V.reduce((s, x) => s.add(x), new THREE.Vector3()).multiplyScalar(1 / V.length);
      return b.spec.faces.every((f) => {
        const n = new THREE.Vector3().subVectors(V[f[1]], V[f[0]]).cross(new THREE.Vector3().subVectors(V[f[2]], V[f[1]])).normalize();
        if (n.dot(V[f[0]].clone().sub(c)) < 0) n.negate();
        return n.dot(p.clone().sub(V[f[0]])) < -1e-4;
      });
    };
    let rng = 7;
    const rand = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
    const clean = ranked.every((r) => {
      const P = placedVerts(S, r.option);
      for (let k = 0; k < 400; k++) {
        const w = P.map(() => rand());
        const sum = w.reduce((x, y) => x + y, 0);
        const p = P.reduce((s, v, i) => s.add(v.clone().multiplyScalar(w[i] / sum)), new THREE.Vector3());
        if (built.some((b) => inside(p, b))) return false;
      }
      return true;
    });
    check(clean, 'no offered option has points inside a built piece (400 random interior points each)');
  }
}

// 4. A piece that isn't convex is never hidden.
{
  const star = Object.values(POLYHEDRA).find((s) => !isConvex(s) && s.faces.length > 0);
  check(!!star, `a non-convex piece exists to test (${star?.id})`);
  if (star) {
    const tf = 0;
    const raw = faceAttachOptions(star, tf, new THREE.Matrix4(), star, congruentFaces(star, tf, star));
    const ranked = rankFaceAttachOptions(raw, star, [at(star)], 0, tf, false);
    check(ranked.length === raw.length, `${star.id}: none of its ${raw.length} options are hidden`);
  }
}

console.log(`\n${checks} checks, ${failures} failures.`);
process.exit(failures ? 1 : 0);

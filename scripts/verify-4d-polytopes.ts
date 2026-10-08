/**
 * Checks the 4D Polytopes family (krp-core/src/polyhedra/polytopes4d.js), from
 * the geometry RCP-C2B actually builds, against the known classification
 * of the six convex regular 4-polytopes:
 *
 *   - each seed is a 4D seed cell, and each target (and the 600-cell's
 *     vertex-first route) is one of that seed's real RCP targets;
 *   - RCP-C2B builds exactly the stated number of cells;
 *   - the finished wireframe has the textbook vertex and edge counts;
 *   - the Schläfli symbol {p,q,r} holds: the cells have p-gon faces, q
 *     meeting at each corner, and exactly r cells around every edge;
 *   - duality: each polytope's corners number its dual's cells;
 *   - the family lists all six, in order A4, B4, F4, H4.
 */
import { POLYHEDRA } from '../krp-core/src/polyhedra/index.js';
import { FOURD_CAPABLE_IDS } from '../krp-core/src/polyhedra/fourD.js';
import { FOUR_D_SHAPE_PARAMS, buildRadialProjectionScene } from '../krp-core/src/polyhedra/radialProjection.js';
import { buildRcpComplex, rcpTargetOptions } from '../krp-core/src/polyhedra/rcpBuild.js';
import { POLYTOPES_4D, polytope4D, polytopeWireframe } from '../krp-core/src/polyhedra/polytopes4d.js';
import { familyIds } from '../krp-core/src/polyhedra/families.js';

let failures = 0;
let checks = 0;
const check = (ok: boolean, msg: string) => {
  checks++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`);
  if (!ok) failures++;
};

// Textbook counts: [vertices, edges].
const KNOWN: Record<string, [number, number]> = {
  POLYTOPE_5_CELL: [5, 10],
  POLYTOPE_8_CELL: [16, 32],
  POLYTOPE_16_CELL: [8, 24],
  POLYTOPE_24_CELL: [24, 96],
  POLYTOPE_120_CELL: [600, 1200],
  POLYTOPE_600_CELL: [120, 720],
};

for (const p of POLYTOPES_4D) {
  const seed = POLYHEDRA[p.seed];
  check(FOURD_CAPABLE_IDS.includes(p.seed), `${p.name}: seed ${p.seed} is a 4D seed cell`);
  const options = rcpTargetOptions((FOUR_D_SHAPE_PARAMS[p.seed] ?? []).map((o) => o.name));
  check(options.includes(p.target), `${p.name}: '${p.target}' is a real RCP target of ${p.seed}`);
  if (p.vertexFirstTarget) check(options.includes(p.vertexFirstTarget), `${p.name}: '${p.vertexFirstTarget}' is a real RCP target of ${p.seed}`);

  const complex = buildRcpComplex(p.seed, p.target);
  check(complex.cells.length === p.cells, `${p.name}: RCP-C2B builds ${complex.cells.length} cells (${p.cells})`);
  if (p.vertexFirstTarget) {
    const vf = buildRcpComplex(p.seed, p.vertexFirstTarget);
    check(vf.cells.length === p.cells, `${p.name} from a vertex: ${vf.cells.length} cells`);
  }

  const wire = polytopeWireframe(p.id);
  const [V, E] = KNOWN[p.id];
  check(wire.vertices.length === V && wire.edges.length === E, `${p.name}: ${wire.vertices.length} vertices and ${wire.edges.length} edges (${V}, ${E})`);

  // Schläfli {p,q,r}.
  const [sp, sq, sr] = p.schlafli.slice(1, -1).split(',').map(Number);
  check(seed.faces.every((f) => f.length === sp), `${p.name}: cells have ${sp}-gon faces`);
  check(seed.vertices.every((_, i) => seed.faces.filter((f) => f.includes(i)).length === sq), `${p.name}: ${sq} faces meet at each corner of a cell`);
  const scene = buildRadialProjectionScene(seed, 5, p.target);
  const at = (v: [number, number, number]) => wire.vertices.findIndex((q) => Math.abs(q[0] - v[0]) < 1e-6 && Math.abs(q[1] - v[1]) < 1e-6 && Math.abs(q[2] - v[2]) < 1e-6);
  const cellsPerEdge = new Map<string, number>();
  for (const cell of scene.cellsVertices3D) for (const [a, b] of seed.edges) {
    const i = at(cell[a]), j = at(cell[b]);
    const key = i < j ? `${i},${j}` : `${j},${i}`;
    cellsPerEdge.set(key, (cellsPerEdge.get(key) ?? 0) + 1);
  }
  check([...cellsPerEdge.values()].every((n) => n === sr), `${p.name}: ${sr} cells around every edge`);
}

for (const p of POLYTOPES_4D) {
  const dual = polytope4D(p.dual)!;
  check(KNOWN[p.id][0] === dual.cells, `${p.name}'s ${KNOWN[p.id][0]} corners = the ${dual.name}'s ${dual.cells} cells (duals)`);
}

check(JSON.stringify(familyIds('POLYTOPES_4D')) === JSON.stringify(POLYTOPES_4D.map((p) => p.id)), '4D Polytopes lists all six, A4 to H4');

console.log(`\n${checks} checks, ${failures} failures.`);
process.exit(failures ? 1 : 0);

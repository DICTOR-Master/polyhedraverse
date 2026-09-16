import { deriveRegularHexToUHex } from './regularHexToUHex';
import { dist } from '../../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const result = deriveRegularHexToUHex();
check(`the whole derivation (composite coalesce+split) has zero problems (${JSON.stringify(result.problems)})`, result.problems.length === 0);
check('same vertex count on both ends: 6 -> 6 (a real spec Sec10 same-count transition, not a reduction)', result.states[0].vertices.length === 6 && result.states[result.states.length - 1].vertices.length === 6);
check('the intermediate state genuinely has 5 vertices (a real composite, not a disguised no-op)', result.states[1].vertices.length === 5);

const final = result.states[result.states.length - 1];
const edgeLens = final.vertices.map((v, i) => dist(v.pos, final.vertices[(i + 1) % 6].pos));
check('all 6 edges are exactly unit length', edgeLens.every((l) => Math.abs(l - 1) < 1e-9));

const centroid: [number, number, number] = [0, 0, 0];
for (const v of final.vertices) {
  centroid[0] += v.pos[0] / 6;
  centroid[1] += v.pos[1] / 6;
  centroid[2] += v.pos[2] / 6;
}
const radii = final.vertices.map((v) => dist(v.pos, centroid));
check('all 6 vertices are equidistant from the centroid (a real regular hexagon, not just equilateral)', Math.max(...radii) - Math.min(...radii) < 1e-9);

// --- Unlike v1: the SOURCE hex here is already regular, just smaller
// -- confirm that directly, rather than assuming it from the header
// comment. ---
const source = result.states[0];
const sourceEdgeLens = source.vertices.map((v, i) => dist(v.pos, source.vertices[(i + 1) % 6].pos));
const sourceSorted = [...sourceEdgeLens].sort((a, b) => a - b);
check('the source hex is ALREADY regular (all edges equal) -- unlike v1, this piece is a scale change, not an asymmetry fix', sourceSorted[5] - sourceSorted[0] < 1e-9);
check('the source hex circumradius is sqrt(2)/2, genuinely smaller than the target unit-edge hexagon (circumradius 1)', Math.abs(dist(source.vertices[0].pos, centroid) - Math.SQRT2 / 2) < 1e-9);

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

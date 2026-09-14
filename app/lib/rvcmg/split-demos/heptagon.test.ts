import { deriveHeptagonBySplitting } from './heptagon';
import { dist } from '../../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const result = deriveHeptagonBySplitting();
check(`the split derivation has zero problems (${JSON.stringify(result.problems)})`, result.problems.length === 0);
check('splitting goes UP in vertex count: 6 -> 7', result.before.vertices.length === 6 && result.after.vertices.length === 7);

const edgeLens = result.after.vertices.map((v, i) => dist(v.pos, result.after.vertices[(i + 1) % 7].pos));
check('all 7 edges are exactly unit length', edgeLens.every((l) => Math.abs(l - 1) < 1e-9));
check('the two new vertices (v1a, v1b) exist and v1 no longer does', result.after.vertices.some((v) => v.id === 'v1a') && result.after.vertices.some((v) => v.id === 'v1b') && !result.after.vertices.some((v) => v.id === 'v1'));

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

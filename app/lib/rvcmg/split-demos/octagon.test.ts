import { deriveOctagonBySplitting } from './octagon';
import { dist } from '../../polyhedra/core';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const result = deriveOctagonBySplitting();
check(`the split derivation has zero problems (${JSON.stringify(result.problems)})`, result.problems.length === 0);
check('two sequential splits go UP in vertex count: 6 -> 8', result.before.vertices.length === 6 && result.after.vertices.length === 8);

const edgeLens = result.after.vertices.map((v, i) => dist(v.pos, result.after.vertices[(i + 1) % 8].pos));
check('all 8 edges are exactly unit length', edgeLens.every((l) => Math.abs(l - 1) < 1e-9));
check('both split pairs (v1a/v1b, v4a/v4b) exist and v1/v4 no longer do', ['v1a', 'v1b', 'v4a', 'v4b'].every((id) => result.after.vertices.some((v) => v.id === id)) && !result.after.vertices.some((v) => v.id === 'v1' || v.id === 'v4'));

console.log(`\n${failures} failures.`);
if (failures > 0) process.exit(1);

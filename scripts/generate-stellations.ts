/**
 * Writes krp-core's src/polyhedra/stellations/pieces.generated.js: every Catalan
 * stellation piece, computed once here rather than on every page load
 * (the solver takes a few ms a piece; there are 60). verify-catalan-
 * stellations.ts re-runs this and fails if the file is stale.
 *
 *   npx tsx scripts/generate-stellations.ts        (writes the file)
 *   npx tsx scripts/generate-stellations.ts --print (prints it instead)
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateStellationSource } from './stellationSource';

const source = generateStellationSource();
if (process.argv.includes('--print')) process.stdout.write(source);
else {
  const path = join(__dirname, '..', 'krp-core', 'src', 'polyhedra', 'stellations', 'pieces.generated.js');
  writeFileSync(path, source);
  console.log(`wrote ${path}`);
}

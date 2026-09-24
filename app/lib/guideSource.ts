// Server-only: reads docs/guide.md, the one source for both the /guide
// page and the in-app overlay (served raw at /guide.md). Read at build
// time -- both routes are force-static.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export function readGuide(): Promise<string> {
  return readFile(path.join(process.cwd(), 'docs/guide.md'), 'utf8');
}

// Server-only: reads Markdown docs from the repo at build time (every
// route using these is force-static). docs/guide.md is the one source
// for both the /guide page and the in-app overlay (served raw at
// /guide.md); the legal pages render the root TERMS/PRIVACY/SECURITY.md.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export function readRepoDoc(relPath: string): Promise<string> {
  return readFile(path.join(process.cwd(), relPath), 'utf8');
}

/** docs/guide.md is English; each other language has docs/guide.<lang>.md. */
export function guideFile(lang: string): string {
  return lang === 'en' ? 'docs/guide.md' : `docs/guide.${lang}.md`;
}

export function readGuide(lang = 'en'): Promise<string> {
  return readRepoDoc(guideFile(lang));
}

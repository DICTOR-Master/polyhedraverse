// Stale-copy guard (2026-09-24, same design as Rhombiverse's): checks ONLY
// user-visible text -- string literals and JSX text in shipped app code
// (TypeScript stripped and comments dropped by esbuild, JSX turned into
// plain strings, tests skipped), the README, the How-to guide and the
// legal/security pages
// -- against scripts/stale-terms.json.
import fs from 'node:fs';
import path from 'node:path';
import { transformSync } from 'esbuild';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { terms, allowLiterals = [] } = JSON.parse(fs.readFileSync(path.join(root, 'scripts/stale-terms.json'), 'utf8'));
const re = new RegExp(`\\b(${terms.join('|')})\\b`, 'i');
const allow = new Set(allowLiterals);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}
// String literals of JS: esbuild drops most comments, then a small
// tokenizer collects only real '...', "..." and `...` text (template
// ${...} expressions skipped) and ignores any comment esbuild kept.
function jsStrings(code, file) {
  const src = transformSync(code, { loader: file.endsWith('x') ? 'tsx' : 'ts', jsx: 'transform', legalComments: 'none' }).code;
  const out = [];
  let i = 0;
  const n = src.length;
  function readTemplate() {
    let text = '';
    i++;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { text += src[i + 1]; i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') { i += 2; skipCode('}'); continue; }
      text += src[i++];
    }
    i++;
    out.push(text);
  }
  function skipCode(close) {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; if (i < 2) i = n; continue; }
      if (c === "'" || c === '"') {
        let text = '';
        i++;
        while (i < n && src[i] !== c) { if (src[i] === '\\') { text += src[i + 1]; i += 2; continue; } text += src[i++]; }
        i++;
        out.push(text);
        continue;
      }
      if (c === '`') { readTemplate(); continue; }
      if (close && c === '{') depth++;
      if (close && c === close) { if (depth === 0) { i++; return; } depth--; }
      i++;
    }
  }
  skipCode(null);
  return out;
}

const hits = [];
// Module paths and other path-like literals ('../lib/polyhedra/fold4')
// are code, not text a person reads.
const pathLike = (t) => /^[.@\w/-]+$/.test(t) && t.includes('/');
const check = (file, text, where) => {
  if (allow.has(text) || pathLike(text)) return;
  const m = text.match(re);
  if (m) hits.push(`${path.relative(root, file)}${where ? ` (${where})` : ''}: "${m[0]}" in ${JSON.stringify(text.length > 140 ? text.slice(Math.max(0, m.index - 60), m.index + 60) : text)}`);
};

for (const f of walk(path.join(root, 'app'))) for (const s of jsStrings(fs.readFileSync(f, 'utf8'), f)) check(f, s);
for (const f of ['README.md', 'docs/guide.md', 'TERMS.md', 'PRIVACY.md', 'SECURITY.md']) {
  if (!fs.existsSync(path.join(root, f))) continue;
  // Markdown: prose only -- fenced code blocks and `inline code` (real
  // file and function names, e.g. `fold4.ts`) are facts, not wording.
  let fenced = false;
  fs.readFileSync(path.join(root, f), 'utf8').split('\n').forEach((line, i) => {
    if (line.trim().startsWith('```')) { fenced = !fenced; return; }
    if (!fenced) check(path.join(root, f), line.replace(/`[^`]*`/g, ''), `line ${i + 1}`);
  });
}

if (hits.length) {
  console.log(hits.join('\n'));
  console.log(`\n${hits.length} stale term(s) in user-visible text (see scripts/stale-terms.json).`);
  process.exit(1);
}
console.log('No stale terms in user-visible text.');

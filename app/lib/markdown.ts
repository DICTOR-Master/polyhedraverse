// Minimal Markdown -> HTML for docs/guide.md: headings (with slug ids
// for #anchor links), paragraphs, - and 1. lists, pipe tables, ---,
// **bold**, `code` and [links](url). Only what the guide uses; all
// text is HTML-escaped first. Rhombiverse carries the same renderer in
// src/app/markdown.js -- keep the two in step.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function slugify(text: string) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
}

function inline(s: string) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
      const external = /^https?:/.test(href);
      return `<a href="${href}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
    });
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export function renderMarkdown(md: string) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const n = h[1].length;
      out.push(`<h${n} id="${slugify(h[2])}">${inline(h[2])}</h${n}>`);
      i++; continue;
    }
    if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (line.trim().startsWith('|') && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1] ?? '')) {
      const head = cells(line);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) body.push(cells(lines[i++]));
      out.push(`<div class="md-table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const list = line.match(/^(\s*)(-|\d+\.)\s+/);
    if (list) {
      const ordered = list[2] !== '-';
      const items: string[] = [];
      while (i < lines.length && /^\s*(-|\d+\.)\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*(-|\d+\.)\s+/, '');
        while (i < lines.length && lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && !/^\s*(-|\d+\.)\s+/.test(lines[i])) item += ` ${lines[i++].trim()}`;
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|---+\s*$|\s*\||\s*(-|\d+\.)\s+)/.test(lines[i])) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

// Shared styling for both the in-app overlay and guide.html, scoped
// under .md-guide so it never leaks into the app's own UI.
export const GUIDE_CSS = `
.md-guide { font: 15px/1.6 var(--font-geist-sans), system-ui, sans-serif; color: #d8f5cf; max-width: 760px; margin: 0 auto; }
.md-guide h1 { font-size: 1.7em; margin: 1.2em 0 .5em; line-height: 1.25; }
.md-guide h1:first-child { margin-top: 0; }
.md-guide h2 { font-size: 1.3em; margin: 1.6em 0 .4em; border-bottom: 1px solid rgba(71,204,36,.3); padding-bottom: .2em; }
.md-guide h3 { font-size: 1.08em; margin: 1.3em 0 .3em; }
.md-guide p, .md-guide ul, .md-guide ol { margin: .5em 0; }
.md-guide ul, .md-guide ol { padding-left: 1.4em; }
.md-guide li { margin: .25em 0; }
.md-guide a { color: #5ee233; }
.md-guide code { background: #0e1209; padding: 0 .3em; border-radius: 4px; }
.md-guide hr { border: 0; border-top: 1px solid rgba(71,204,36,.3); margin: 2em 0; }
.md-guide .md-table { overflow-x: auto; margin: .6em 0; }
.md-guide table { border-collapse: collapse; width: 100%; font-size: .94em; }
.md-guide th, .md-guide td { border: 1px solid rgba(71,204,36,.3); padding: .35em .6em; text-align: left; vertical-align: top; }
.md-guide th { background: #0e1209; }
`;

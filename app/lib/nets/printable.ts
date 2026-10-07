/**
 * A printable net (direct decisions 2026-10-08): an A4 PDF, the net scaled
 * to fit, cut lines solid, fold lines dashed, each glued pair of edges
 * numbered alike on both sides, and optional glue tabs, one per glued pair.
 * Written as a small vector PDF by hand (lines, fills and Helvetica text),
 * so no PDF library is needed.
 */
import { type Net, triangulate, polygonsOverlap } from './unfold';

type P2 = [number, number];
const A4 = { w: 595.28, h: 841.89 }; // points
const MM = 72 / 25.4;
const MARGIN = 12 * MM;
const HEADER = 16 * MM;
const TAB_MM = 6;

export interface PrintableOptions { title: string; tabs: boolean; credit?: string }

const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const add = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]];
const scale = (a: P2, s: number): P2 => [a[0] * s, a[1] * s];
const len = (a: P2) => Math.hypot(a[0], a[1]);
const area = (P: P2[]) => P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;

/** The net laid out on the page: polygons in points, plus its pieces. */
export function layoutNet(net: Net, tabs: boolean) {
  // Turn the net so its longer side runs down the page, then fit it.
  let flat = net.flat;
  const span = (P: P2[][]) => { const xs = P.flat().map((p) => p[0]), ys = P.flat().map((p) => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
  let b = span(flat);
  if (b.x1 - b.x0 > b.y1 - b.y0) { flat = flat.map((P) => P.map(([x, y]) => [y, -x] as P2)); b = span(flat); }
  // Every face wound the same way on the page.
  const ccw = area(flat[0]) > 0;
  const w = A4.w - 2 * MARGIN, h = A4.h - 2 * MARGIN - HEADER;
  // Leave room for tabs round the outside.
  const pad = tabs ? 1 : 0;
  const k0 = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0));
  const tabUnits = (TAB_MM * MM) / k0;
  const k = Math.min(w / (b.x1 - b.x0 + 2 * pad * tabUnits), h / (b.y1 - b.y0 + 2 * pad * tabUnits));
  const ox = MARGIN + (w - (b.x1 - b.x0) * k) / 2 - b.x0 * k;
  const oy = MARGIN + HEADER + (h - (b.y1 - b.y0) * k) / 2 - b.y0 * k;
  const page = flat.map((P) => P.map(([x, y]) => [ox + x * k, oy + y * k] as P2));
  const shortest = Math.min(...flat.flatMap((P) => P.map((p, i) => len(sub(P[(i + 1) % P.length], p)))));
  const edgeMm = (shortest * k) / MM;
  const side = (f: number, j: number): [P2, P2] => [page[f][j], page[f][(j + 1) % page[f].length]];
  // A tab: a trapezoid on the outside of a side, its ends cut in at 45 degrees (narrower on a short side).
  const tabT = TAB_MM * MM;
  const tabOn = (f: number, j: number): P2[] => {
    const [a, c] = side(f, j);
    const d = sub(c, a), L = len(d), u = scale(d, 1 / L);
    const out: P2 = ccw ? [u[1], -u[0]] : [-u[1], u[0]]; // away from the face
    const t = Math.min(tabT, L * 0.35);
    return [a, c, add(sub(c, scale(u, t)), scale(out, t)), add(add(a, scale(u, t)), scale(out, t))];
  };
  const tabsOut: P2[][] = [];
  if (tabs) {
    const placed: P2[][] = [...page];
    for (const pair of net.pairs) {
      // One tab per pair: on whichever side clears the net and the tabs so far.
      const options = pair.sides.map(({ face, j }) => tabOn(face, j));
      const tri = (P: P2[]) => triangulate(P);
      const clear = options.find((T) => placed.every((Q) => !polygonsOverlap(T, Q, tri(T), tri(Q))));
      const T = clear ?? options[0];
      tabsOut.push(T);
      placed.push(T);
    }
  }
  return { page, side, tabs: tabsOut, edgeMm, ccw };
}

// ---- a minimal PDF writer ----
const fmt = (x: number) => (Math.round(x * 100) / 100).toString();
/** Text for a PDF string in WinAnsi: plain ASCII, with dashes and quotes simplified. */
const pdfText = (s: string) => s.replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/φ/g, 'phi').replace(/[^\x20-\x7e]/g, '?').replace(/([\\()])/g, '\\$1');

export function printableNetPdf(net: Net, opts: PrintableOptions): Uint8Array<ArrayBuffer> {
  const { page, side, tabs, edgeMm, ccw } = layoutNet(net, opts.tabs);
  const Y = (y: number) => A4.h - y; // PDF y runs up the page
  const cmds: string[] = [];
  const path = (P: P2[], close = true) => P.map((p, i) => `${fmt(p[0])} ${fmt(Y(p[1]))} ${i ? 'l' : 'm'}`).join(' ') + (close ? ' h' : '');
  // Tabs: pale grey fill, solid outline except the edge they hang from (that's a fold).
  for (const T of tabs) {
    cmds.push('0.88 g', `${path(T)} f`);
    cmds.push('0 G 0.6 w [] 0 d', `${path([T[1], T[2], T[3], T[0]], false)} S`);
  }
  // Faces: white fill (over any tab overlap).
  for (const P of page) cmds.push('1 g', `${path(P)} f`);
  // Fold lines: hinges, and the sides that carry a tab.
  const tabbed = new Set(tabs.map((T) => `${fmt(T[0][0])},${fmt(T[0][1])}|${fmt(T[1][0])},${fmt(T[1][1])}`));
  const folds: [P2, P2][] = net.hinges.map(({ face, j }) => side(face, j));
  const cuts: [P2, P2][] = [];
  for (const pair of net.pairs) for (const { face, j } of pair.sides) {
    const s = side(face, j);
    (tabbed.has(`${fmt(s[0][0])},${fmt(s[0][1])}|${fmt(s[1][0])},${fmt(s[1][1])}`) ? folds : cuts).push(s);
  }
  cmds.push('0 G 0.6 w [] 0 d');
  for (const [a, b] of cuts) cmds.push(`${path([a, b], false)} S`);
  cmds.push('0.35 G 0.5 w [3 2] 0 d');
  for (const [a, b] of folds) cmds.push(`${path([a, b], false)} S`);
  // Labels: each glued pair's number, just inside its face on both sides.
  const fontSize = Math.max(5, Math.min(8, edgeMm * 0.9));
  cmds.push('0.15 g', 'BT', `/F1 ${fmt(fontSize)} Tf`);
  for (const pair of net.pairs) for (const { face, j } of pair.sides) {
    const [a, b] = side(face, j);
    const m = scale(add(a, b), 0.5), d = sub(b, a), L = len(d);
    const inward: P2 = ccw ? [-d[1] / L, d[0] / L] : [d[1] / L, -d[0] / L];
    const p = add(m, scale(inward, fontSize * 0.9));
    const text = String(pair.label);
    cmds.push(`1 0 0 1 ${fmt(p[0] - fontSize * 0.28 * text.length)} ${fmt(Y(p[1]) - fontSize * 0.35)} Tm (${text}) Tj`);
  }
  // Header: the shape's name, the edge length, and how to use it.
  cmds.push(`0 g /F1 13 Tf 1 0 0 1 ${fmt(MARGIN)} ${fmt(A4.h - MARGIN - 4)} Tm (${pdfText(opts.title)}) Tj`);
  const note = `Edge ${edgeMm.toFixed(1)} mm (shortest). Cut solid lines, fold dashed lines, glue each number to its match.${opts.tabs ? ' Grey tabs go inside.' : ''}`;
  cmds.push(`0.35 g /F1 8 Tf 1 0 0 1 ${fmt(MARGIN)} ${fmt(A4.h - MARGIN - 16)} Tm (${pdfText(note)}) Tj`);
  if (opts.credit) cmds.push(`0.5 g /F1 7 Tf 1 0 0 1 ${fmt(MARGIN)} ${fmt(MARGIN - 18)} Tm (${pdfText(opts.credit)}) Tj`);
  cmds.push('ET');
  const content = cmds.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(A4.w)} ${fmt(A4.h)}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

/**
 * A running, always-on description of the CURRENT assembly (ordinary 3D
 * face/vertex/duoprism builds — RCP-C2B already has its own live "Cells:
 * X / Y" progress label, so this doesn't need to special-case it, just
 * describe whatever graph shape it's handed). Direct user request: "a
 * running total name so far" as things get attached.
 *
 * Two tiers, lookup first: a small, hand-curated catalog of exact
 * structural signatures (`NAMED_ASSEMBLIES`) the user has confirmed
 * deserve a real name, falling back to a generic, always-honest summary
 * built straight from the graph (root shape + each attached shape type,
 * grouped by kind + count) when nothing matches. The lookup deliberately
 * never invents a name on its own — every entry here was proposed AND
 * confirmed by the user first (see e.g. "Tetrahedral Star" below); this
 * module only ever recognizes signatures it's been explicitly told
 * about, never guesses at classical-sounding names for an arbitrary
 * build.
 */

import { POLYHEDRA } from './polyhedra';
import type { AssemblyNode, AssemblyConnection } from './assembly';
import { findParentConnection } from './graph';

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

function shapeName(shapeId: string): string {
  return POLYHEDRA[shapeId]?.name ?? shapeId;
}

function findRoot(nodes: AssemblyNode[], connections: AssemblyConnection[]): AssemblyNode | null {
  return nodes.find((n) => !findParentConnection(connections, n.id)) ?? null;
}

interface NamedSignature {
  name: string;
  match: (root: AssemblyNode, nodes: AssemblyNode[], connections: AssemblyConnection[]) => boolean;
}

/**
 * Confirmed 2026-09-16, direct user request: a regular tetrahedron (D4)
 * with a sharp/grade-4 triangular graded pyramid (PYRAMID_TRI_G4) face-
 * attached to EVERY one of its 4 faces. Not a true stellation (the
 * regular tetrahedron has none — extending its own 4 face planes never
 * makes them re-intersect) and not the exact Catalan-solid triakis
 * tetrahedron either (that one needs a much shallower, specific pyramid
 * height than grade 4's deliberately sharp 20° apex angle) — this is its
 * own distinct shape, and "Tetrahedral Star" is the user's own chosen
 * name for it, not a claimed classical term.
 */
const NAMED_ASSEMBLIES: NamedSignature[] = [
  {
    name: 'Tetrahedral Star',
    match: (root, nodes, connections) => {
      if (root.shape !== 'D4' || nodes.length !== 5) return false;
      const byId = new Map(nodes.map((n) => [n.id, n]));
      const faceConns = connections.filter((c) => !c.orphaned && c.kind === 'face' && c.nodeA === root.id);
      if (faceConns.length !== 4) return false;
      const facesUsed = new Set(faceConns.map((c) => c.vertexA));
      if (facesUsed.size !== 4) return false;
      return faceConns.every((c) => byId.get(c.nodeB)?.shape === 'PYRAMID_TRI_G4');
    },
  },
];

const KIND_ADJECTIVE: Record<string, string> = {
  vertex: 'vertex-attached',
  face: 'face-attached',
  duoprism: 'duoprism-attached',
  rcp4d: 'RCP-C2B',
};

/**
 * The generic fallback: root shape's own name, plus every OTHER node in
 * the assembly grouped by (its own connection kind, its own shape) with
 * a count — a flat "running total" across the whole tree regardless of
 * depth, not a per-parent breakdown (which would get unreadable fast on
 * a deep build). Order matches first appearance in `connections` (build
 * order), for a stable, unsurprising read as pieces get added.
 */
function describeGenerically(root: AssemblyNode, nodes: AssemblyNode[], connections: AssemblyConnection[]): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const groups: { kind: string; childName: string; count: number }[] = [];
  for (const c of connections) {
    if (c.orphaned) continue;
    const child = byId.get(c.nodeB);
    if (!child) continue;
    const kind = c.kind ?? 'vertex';
    const childName = shapeName(child.shape);
    const existing = groups.find((g) => g.kind === kind && g.childName === childName);
    if (existing) existing.count += 1;
    else groups.push({ kind, childName, count: 1 });
  }
  const parts = groups.map(({ kind, childName, count }) => {
    const adjective = KIND_ADJECTIVE[kind] ?? kind;
    return count > 1 ? `${count}× ${adjective} ${childName}` : `${adjective} ${childName}`;
  });
  return [capitalize(shapeName(root.shape)), ...parts].join(' + ');
}

/**
 * The current assembly's running name/description — '' for an empty
 * graph OR a single, unattached root. A lone shape isn't really "an
 * assembly" yet (nothing's been built), and showing its bare name here
 * caused a real regression: this label's plain shape-name text could
 * collide with an unrelated `text=/^shapename$/i` locator elsewhere in
 * the app (e.g. a shape-browser card) expecting to be the only match on
 * the page. Once something is actually attached, the fuller generated
 * text (root + at least one attached piece) no longer collides with a
 * bare single-word shape-name locator.
 */
export function describeAssembly(nodes: AssemblyNode[], connections: AssemblyConnection[]): string {
  const root = findRoot(nodes, connections);
  if (!root || nodes.length <= 1) return '';
  for (const signature of NAMED_ASSEMBLIES) {
    if (signature.match(root, nodes, connections)) return signature.name;
  }
  return describeGenerically(root, nodes, connections);
}

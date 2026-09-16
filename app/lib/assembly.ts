/**
 * The assembly graph — Stage 6's real data structure. Built directly from
 * user actions (placeRoot / confirmAttach in ShapeViewer.tsx), never
 * inferred by walking the Three.js scene. The scene is a rendering of this
 * graph, not the other way around.
 */

import { POLYHEDRA } from './polyhedra';
import { FOURD_CAPABLE_IDS } from './polyhedra/fourD';
import { FOUR_D_SHAPE_PARAMS, resolveParamsKey } from './polyhedra/radialProjection';

export interface AssemblyNode {
  id: string;
  shape: string; // PolyhedronSpec id, e.g. 'D6' or 'CUBE'
  transform: {
    position: [number, number, number];
    quaternion: [number, number, number, number]; // x, y, z, w
  };
  // RPC-build (radial-perspective click-to-build): set ONLY on a true
  // RPC-build root (the node an 'rpc4d' connection's nodeA points at,
  // i.e. cell 0 of some 4-polytope closure) — every other node
  // (including every rpc4d CHILD cell) leaves this unset. `seedSpecId`
  // is the real registry id whose closures apply (e.g. 'D4'); `target`
  // is which of that seed's (up to 3) closures this root is building
  // (e.g. '16-cell', '5-cell', '600-cell' — see
  // app/lib/polyhedra/radialProjection.ts's own FOUR_D_SHAPE_PARAMS).
  // The root's own `shape`/`transform` are already ordinary — this is
  // the only extra bookkeeping a root needs; every child cell's own
  // geometry is fully re-derived from this field + its own connection's
  // `cellId` on load, never stored directly (see rpcBuild.ts).
  rpcPolytope?: { seedSpecId: string; target: string };
}

export interface AssemblyConnection {
  nodeA: string;
  vertexA: number;
  nodeB: string;
  vertexB: number;
  // 'vertex' (default, when absent — every connection before face-snap
  // mode existed was implicitly this kind) means vertexA/vertexB are
  // vertex indices, the original ball-joint connection. 'face' means
  // they're face indices instead — a face-to-face join, only valid
  // between two faces of the same size (see app/lib/polyhedra/core.ts's
  // FaceConnector / buildFaceConnectors). 'duoprism' also uses face
  // indices, but for a structurally different join (see duoprism.ts):
  // nodeB is an identical-orientation TRANSLATED copy of nodeA (not a
  // mirrored flush attach), connected by a real 3D wall-prism cell —
  // vertexA and vertexB are always the SAME face index (the two nodes
  // share the same shape by construction), never independently chosen.
  // Reusing vertexA/vertexB rather than adding separate faceA/faceB
  // fields keeps exactly one pair of "which connector on each side"
  // fields, disambiguated by this tag, instead of two pairs where only
  // one is ever meaningful at a time.
  // 'rpc4d': nodeA is an RPC-build root (see AssemblyNode.rpcPolytope),
  // nodeB is one specific cell of that root's own 4-polytope closure —
  // see the cellId/shell fields below.
  kind?: 'vertex' | 'face' | 'duoprism' | 'rpc4d';
  // Set by Stage 7's rewrite rule when a node's shape changes and no
  // compatible vertex exists on the new shape for this connection's side.
  // vertexA/vertexB then keep their last-known (possibly now out-of-range
  // for the new shape) value purely as a historical record — orphaned
  // connections are excluded from vertex-range validation and from
  // occupied-vertex bookkeeping on load. (Rewrite only ever produces
  // 'vertex' connections — the D10<->D12 rule doesn't touch faces.)
  orphaned?: boolean;
  // 4D extension: this face-attach used the real 4D dihedral fold
  // (app/lib/polyhedra/fold4.ts) instead of an ordinary flush-3D join.
  // Additive optional field, same proven pattern as `kind`/`orphaned`
  // before it — old saves keep validating with zero migration. Only
  // ever true for a 'face' connection between two nodes of the SAME
  // FOURD_CAPABLE_IDS shape (Stage-1 scope: a genuine two-different-
  // 4D-shape attach raises "whose dihedral angle governs the fold" with
  // no single clean answer — deferred). The angle/axis of the fold are
  // never stored here — both are always re-derived at render time from
  // `node.shape` + this connection's own face index, matching fourD.ts's
  // own "derive, don't duplicate" rule.
  fold4?: true;
  // 4D Prism (duoprism): a REAL duoprism has exactly ONE far copy total
  // (like a tesseract has 2 cubes, not one per face) — additional faces
  // of the SAME near node ALSO connected to this SAME far copy (via
  // their own wall-prism cell) are recorded here, rather than as
  // separate AssemblyConnections to separate far-copy nodes. That
  // alternative was tried first and was WRONG: it silently violates
  // this app's own foundational tree invariant (every node has at most
  // one incoming connection — see app/lib/graph.ts's own
  // findParentConnection/hasCycle doc comments) and, worse, produces a
  // visibly broken result — 3 independently-extruded siblings, one per
  // face, with nothing making them meet, leaving a real gap between
  // them (confirmed live: "three added dodecahedra have a triangle of
  // space between them"). Recording extra faces on the ORIGINAL single
  // connection instead preserves the tree invariant exactly (still one
  // AssemblyConnection, one incoming edge, `findParentConnection`/
  // `collectSubtree`/delete/undo all keep working unchanged) while
  // correctly modeling "one shared far copy, many wall-prisms." Only
  // ever present alongside `kind: 'duoprism'`; each entry is a face
  // index on the SAME shape as `vertexA`/`vertexB` (never repeating
  // vertexA itself or any other entry).
  duoprismExtraFaces?: number[];
  // RPC-build only (kind === 'rpc4d'). `cellId` is which cell of the
  // root's own deterministic complex nodeB represents (re-derive its
  // geometry via app/lib/polyhedra/rpcBuild.ts's buildRpcComplex, never
  // stored). `shell` is that cell's own BFS ring distance from the
  // root — technically redundant with cellId+a recomputed complex, but
  // cheap to store and avoids recomputing the whole complex just to
  // answer "which shell is this" during render/UI, matching this
  // codebase's general preference for storing what's cheap and
  // deriving the rest. There's no natural vertex/face pairing for this
  // connection kind (unlike 'face'/'duoprism', which reuse
  // vertexA/vertexB meaningfully) — vertexA/vertexB are always 0 here,
  // unused placeholders kept only because the schema's structural check
  // (isConnection) requires them to be present numbers regardless of kind.
  cellId?: number;
  shell?: number;
}

export interface Assembly {
  nodes: AssemblyNode[];
  connections: AssemblyConnection[];
}

export function emptyAssembly(): Assembly {
  return { nodes: [], connections: [] };
}

/**
 * Save/load persists to the browser's own localStorage, not a server API.
 * `/api/assemblies` (a local-JSON-file route) was removed 2026-09-16: it
 * worked in local dev but Vercel's production serverless functions have a
 * read-only filesystem outside `/tmp` — every POST there 500'd in
 * production, confirmed live (`docs/vercel-deployment-plan.md`'s own
 * "Known live issue" section). Real server-side storage (Vercel KV/Blob)
 * remains the eventual fix for cross-device sync, but is out of scope for
 * now — direct user decision, given it needs Vercel dashboard provisioning
 * this session couldn't do (MCP access was blocked). localStorage means a
 * saved assembly is tied to one browser, which matches this app's actual
 * single-user, single-device usage today.
 */
export const ASSEMBLY_STORAGE_KEY = 'polyhedraverse:assembly';

function isVec3(v: unknown): v is [number, number, number] {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
}

function isQuat(v: unknown): v is [number, number, number, number] {
  return Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
}

function isNode(v: unknown): v is AssemblyNode {
  if (typeof v !== 'object' || v === null) return false;
  const n = v as Record<string, unknown>;
  if (typeof n.id !== 'string' || typeof n.shape !== 'string') return false;
  if (typeof n.transform !== 'object' || n.transform === null) return false;
  const t = n.transform as Record<string, unknown>;
  if (!isVec3(t.position) || !isQuat(t.quaternion)) return false;
  if (n.rpcPolytope !== undefined) {
    if (typeof n.rpcPolytope !== 'object' || n.rpcPolytope === null) return false;
    const rp = n.rpcPolytope as Record<string, unknown>;
    if (typeof rp.seedSpecId !== 'string' || typeof rp.target !== 'string') return false;
  }
  return true;
}

function isConnection(v: unknown): v is AssemblyConnection {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  if (
    typeof c.nodeA !== 'string' ||
    typeof c.nodeB !== 'string' ||
    typeof c.vertexA !== 'number' ||
    typeof c.vertexB !== 'number'
  ) {
    return false;
  }
  if (c.kind !== undefined && c.kind !== 'vertex' && c.kind !== 'face' && c.kind !== 'duoprism' && c.kind !== 'rpc4d') return false;
  if (c.orphaned !== undefined && typeof c.orphaned !== 'boolean') return false;
  // Structural check only (no node/shape cross-reference here -- that
  // needs isValidAssembly below, which has nodeById available): fold4
  // can only ever accompany a face-kind connection.
  if (c.fold4 !== undefined && (c.fold4 !== true || c.kind !== 'face')) return false;
  if (c.duoprismExtraFaces !== undefined) {
    if (c.kind !== 'duoprism') return false;
    if (!Array.isArray(c.duoprismExtraFaces) || !c.duoprismExtraFaces.every((f) => typeof f === 'number' && Number.isInteger(f) && f >= 0)) return false;
  }
  if (c.cellId !== undefined || c.shell !== undefined) {
    if (c.kind !== 'rpc4d') return false;
    if (typeof c.cellId !== 'number' || !Number.isInteger(c.cellId) || c.cellId < 0) return false;
    if (typeof c.shell !== 'number' || !Number.isInteger(c.shell) || c.shell < 0) return false;
  } else if (c.kind === 'rpc4d') {
    return false; // rpc4d always carries cellId + shell
  }
  return true;
}

/** Structural validation for untrusted input (the API route body, a fetch response). */
export function isAssembly(v: unknown): v is Assembly {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  return Array.isArray(a.nodes) && Array.isArray(a.connections) && a.nodes.every(isNode) && a.connections.every(isConnection);
}

/**
 * Beyond structural shape: every node's `shape` must be a real polyhedron id
 * (any family — see app/lib/polyhedra/index.ts) and every connection must
 * reference node ids and vertex indices that actually exist. Guards the
 * renderer against a corrupted or hand-edited save file crashing on load.
 */
export function isValidAssembly(v: unknown): v is Assembly {
  if (!isAssembly(v)) return false;
  const nodeById = new Map(v.nodes.map((n) => [n.id, n]));
  if (nodeById.size !== v.nodes.length) return false; // duplicate ids

  for (const node of v.nodes) {
    if (!(node.shape in POLYHEDRA)) return false;
  }
  for (const conn of v.connections) {
    const a = nodeById.get(conn.nodeA);
    const b = nodeById.get(conn.nodeB);
    if (!a || !b) return false;
    // Orphaned connections keep a deliberately stale vertex index (see
    // AssemblyConnection.orphaned) — only the node references matter for them.
    if (conn.orphaned) continue;
    const isFaceLike = conn.kind === 'face' || conn.kind === 'duoprism';
    const countA = isFaceLike ? POLYHEDRA[a.shape].faces.length : POLYHEDRA[a.shape].vertices.length;
    const countB = isFaceLike ? POLYHEDRA[b.shape].faces.length : POLYHEDRA[b.shape].vertices.length;
    if (conn.vertexA < 0 || conn.vertexA >= countA) return false;
    if (conn.vertexB < 0 || conn.vertexB >= countB) return false;
    // 4D extension, Stage-1 scope: fold4 only ever means something for a
    // self-attach (same shape both sides) of a shape that's actually
    // FOURD_CAPABLE_IDS-eligible -- cross-referencing both nodes here is
    // exactly why this lives in isValidAssembly, not the structural-only
    // isConnection above.
    if (conn.fold4 && (a.shape !== b.shape || !FOURD_CAPABLE_IDS.includes(a.shape))) return false;
    // Duoprism: same restriction as fold4 (self-attach only, FOURD-
    // capable shapes only — see duoprism.ts's own header comment for why
    // it's still gated to these 4 even though the geometry itself would
    // work for any shape: a deliberate scope match with the other 4D
    // feature, not a mathematical requirement), PLUS vertexA must equal
    // vertexB — a duoprism's far node is a translated copy of the near
    // one, so there's only ever one "the same face on both sides" role,
    // never two independently-chosen face indices.
    if (conn.kind === 'duoprism') {
      if (a.shape !== b.shape || !FOURD_CAPABLE_IDS.includes(a.shape) || conn.vertexA !== conn.vertexB) return false;
      const faceCount = POLYHEDRA[a.shape].faces.length;
      const extras = conn.duoprismExtraFaces ?? [];
      const allFaces = [conn.vertexA, ...extras];
      const uniqueFaces = new Set(allFaces);
      if (uniqueFaces.size !== allFaces.length) return false; // no duplicate/repeated face indices
      if (extras.some((f) => f < 0 || f >= faceCount)) return false;
    }
    // RPC-build: nodeA must be a real root (rpcPolytope set, pointing at
    // a real closure of a real seed), cellId must be a real cell of that
    // closure, and nodeB's own shape must match whichever seed that
    // closure's cells actually are (the 600-cell's own cells are always
    // tetrahedra, i.e. 'D4', regardless of which D4-congruent shape the
    // root itself used — see rpcBuild.ts's buildRpcComplex doc comment).
    if (conn.kind === 'rpc4d') {
      const rp = a.rpcPolytope;
      if (!rp || !(rp.seedSpecId in POLYHEDRA)) return false;
      const cellCount = closureCellCount(rp.seedSpecId, rp.target);
      if (cellCount === undefined) return false;
      if (conn.cellId === undefined || conn.cellId < 0 || conn.cellId >= cellCount) return false;
      const cellShapeId = rp.target === '600-cell' ? 'D4' : rp.seedSpecId;
      if (b.shape !== cellShapeId) return false;
    }
  }
  // No duplicate cellId under the same rpc4d root.
  const cellIdsByRoot = new Map<string, Set<number>>();
  for (const conn of v.connections) {
    if (conn.orphaned || conn.kind !== 'rpc4d' || conn.cellId === undefined) continue;
    const seen = cellIdsByRoot.get(conn.nodeA) ?? new Set<number>();
    if (seen.has(conn.cellId)) return false;
    seen.add(conn.cellId);
    cellIdsByRoot.set(conn.nodeA, seen);
  }
  return true;
}

/** The real cell count of `target` (one of an rpc4d root's real closures for `seedSpecId`), or undefined if it's not a real closure of that seed. Reuses radialProjection.ts's own resolveParamsKey (the exact congruence check buildCellComplex itself uses, e.g. for PYRAMID_TRI_G2 resolving to D4's params) rather than duplicating it. The 600-cell isn't in FOUR_D_SHAPE_PARAMS (it's built via dualize(), not a direct theta) so its cell count (600, the standard, independently-verified 600-cell count — see docs/radial-cell-projection.md section 21.3) is hardcoded here, gated on seedSpecId actually being D4-congruent. */
function closureCellCount(seedSpecId: string, target: string): number | undefined {
  const seed = POLYHEDRA[seedSpecId];
  if (!seed) return undefined;
  const key = resolveParamsKey(seed);
  if (target === '600-cell') {
    return key === 'D4' ? 600 : undefined;
  }
  if (!key) return undefined;
  return FOUR_D_SHAPE_PARAMS[key].find((o) => o.name === target)?.cellCount;
}

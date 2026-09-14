# RVCMG — Staged Construction & Implementation Plan

**For:** Claude Code
**Source spec:** `Reversible Vertex-Coalescence Morphing Geometry (RVCMG)` (Polyhedraverse project doc)
**Target codebase conventions:** matches the existing `deltahedra.ts` Stage 1 geometry core (TypeScript, `Vec3` tuples, spec objects, `validateShape`-style verification functions, unit-edge normalization pattern)

## How to use this plan

Work one stage at a time. Each stage has its own deliverable file(s), its own acceptance tests, and must pass its own verification before the next stage starts — do not let stages bleed into each other (this mirrors the "don't make the interface mirror discovery order" principle from the Polyhedraverse to-do list). Commit at the end of each stage. Every operation implemented must be checked against the ten validity rules (V1–V10) and the eight verification requirements (25.1–25.8) from the RVCMG spec — cite the rule number in code comments where it's enforced, the way `deltahedra.ts` cites the geometric reasoning behind each shape's construction.

Do not substitute a regular-hexagon approximation for the real hemi-rhombic-dodecahedron interface once Stage 1 numerical data is available (spec §24) — the regular hexagon is allowed only as a placeholder during early scaffolding, and must be swapped out before Stage 3 lands.

---

## Stage 0 — Scaffold

**Goal:** create the module skeleton without any real geometry yet.

**Deliverables:**
- `rvcmg/types.ts` — shared type definitions (see Stage 2)
- `rvcmg/index.ts` — public export surface
- `rvcmg/rvcmg.test.ts` — empty test file wired into the existing test runner

**Acceptance:** project builds and test file runs (0 tests, 0 failures).

---

## Stage 1 — Hemi-RD interface geometry (source of truth)

**Goal:** produce the real six ordered interface vertices of the hemi-rhombic-dodecahedral cut face — not an idealized hexagon (spec §2.1, §24.1–24.2).

**Deliverables:** `rvcmg/hemiRdInterface.ts`

- Derive the rhombic dodecahedron's vertex/face data (reuse or mirror the `DeltahedronSpec`-style construction from `deltahedra.ts` — same `centerVertices`, `dist`, unit-edge-normalization pattern, but for the RD rather than a deltahedron).
- Bisect it into two complementary halves and extract the cut polygon's ordered boundary vertices `V = (v1..v6)`.
- Fix the coordinate system and scale explicitly in a comment (spec §24.2) — state whether it's unit-edge RD, unit-circumradius, or matches the existing Polyhedraverse global scale convention.
- Export:
  ```ts
  export const HEMI_RD_INTERFACE: Vec3[]; // v1..v6, ordered, boundary-adjacent
  ```

**Acceptance:**
- 6 distinct vertices, each pair of consecutive vertices forms a real edge (nonzero length).
- A `validateHemiRdInterface()` function (mirroring `validateShape`) confirms planarity is *not* assumed (the interface may be non-planar — don't add a false planarity check) but does confirm: vertex count = 6, no duplicate coincident vertices, boundary is a simple (non-self-intersecting) polygon.

---

## Stage 2 — Core data model

**Goal:** define the types the rest of RVCMG is built on (spec §6, §20).

**Deliverables:** `rvcmg/types.ts`

```ts
export interface RvcmgVertex {
  id: string;           // stable identity, survives coalescence (spec §7 says count != identity)
  pos: Vec3;
  sourceIds: string[];  // which original v1..v6 (or prior coalesced ids) merged into this one
}

export interface RvcmgState {
  id: string;                 // state identity, NOT just vertex count (spec V7 / §5)
  vertices: RvcmgVertex[];    // ordered boundary
  boundaryEdges: [number, number][]; // indices into vertices, in order
}

export interface CoalescenceOp {
  id: string;
  fromStateId: string;
  toStateId: string;
  coalescedPair: [string, string];   // vertex ids that merged
  targetPos: Vec3;                   // c, the coalescence target (spec §16)
  path: 'symmetric' | 'one-sided' | (t: number) => Vec3; // spec §18
  deformation: (v: Vec3) => Vec3;    // Φ, applied to all other vertices (spec §16)
  inverse: CoalescenceOp['id'];      // id of the separation op that undoes this
}
```

**Acceptance:** type-checks; `RvcmgState.id` is explicitly documented as independent of `vertices.length` (enforces spec V7 / §5 at the type level via a comment + a lint-style test that greps for any code comparing states by vertex count alone — flag it for review, don't just allow it silently).

---

## Stage 3 — Primitive coalescence operation

**Goal:** implement the one primitive transformation the whole framework is built from (spec §3, §4, §16).

**Deliverables:** `rvcmg/coalesce.ts`

```ts
export function coalesce(
  state: RvcmgState,
  vertexIdA: string,
  vertexIdB: string,
  targetPos: Vec3,
  deformation: (v: Vec3) => Vec3 = (v) => v, // identity Φ by default
): RvcmgState
```

- **Enforce adjacency** (V2): throw if `vertexIdA`/`vertexIdB` are not consecutive on `boundaryEdges`. This is the single most important guard in the whole codebase — the spec is explicit that non-adjacent coalescence is invalid without an additional transformation.
- Set both merged vertices to `targetPos` (V3), producing a new `RvcmgVertex` whose `sourceIds` is the union of the two.
- Apply `deformation` to every other vertex (V5 — vertices not involved must follow the specified map, never be silently regenerated).
- Run `Distinct()` — dedupe the now-coincident vertex and drop the now-zero-length edge (V4, spec §16's `S' = Distinct(Φ(S))`).
- Do **not** hardcode a `3→4→5→6` ladder anywhere — `coalesce` must work on any adjacent pair on any input state (V9, spec §10).

**Acceptance (unit tests):**
- Coalescing an adjacent pair on `S_6` yields a 5-vertex state.
- Coalescing a non-adjacent pair throws.
- The zero-length edge is actually removed, not just left at length 0.
- Vertices untouched by the operation are transformed only by `deformation`, byte-for-byte reproducible.

---

## Stage 4 — Reversibility

**Goal:** every coalescence must have a geometrically defined inverse (spec §9, V6).

**Deliverables:** `rvcmg/separate.ts`

```ts
export function separate(
  state: RvcmgState,
  coalescedVertexId: string,
  toPositions: [Vec3, Vec3],
  inverseDeformation: (v: Vec3) => Vec3,
): RvcmgState
```

- Splits a coalesced vertex back into its two `sourceIds`, restoring the pre-merge positions.
- `CoalescenceOp.inverse` must resolve to a `separate` call that, composed with the original `coalesce`, is the identity within numerical tolerance.

**Acceptance (this is spec §25.6 directly):**
```ts
test('reversibility', () => {
  const s6 = initialState();
  const s5 = coalesce(s6, 'v1', 'v2', midpoint, identity);
  const back = separate(s5, s5.vertices[0].id, [origV1, origV2], identity);
  expect(back).toApproximatelyEqual(s6, tolerance);
});
```
Run this for every adjacent pair on every principal state (3/4/5/6-vertex), not just one example.

---

## Stage 5 — State graph & composite transformations

**Goal:** represent RVCMG as the undirected graph the spec insists on (spec §10, §19), not a ladder.

**Deliverables:** `rvcmg/stateGraph.ts`

```ts
export interface StateGraph {
  states: Map<string, RvcmgState>;
  edges: CoalescenceOp[]; // undirected: every op's inverse is also present
}

export function addTransition(graph: StateGraph, op: CoalescenceOp): void;
export function findPath(graph: StateGraph, fromId: string, toId: string): CoalescenceOp[] | null; // BFS
export function isComposite(path: CoalescenceOp[]): boolean; // length > 1
```

- `addTransition` must always insert both `op` and its inverse (spec §19: "the state graph is undirected at the level of valid state connectivity").
- Explicitly support same-vertex-count transitions (`S_6^(a) ↔ S_6^(b)`) and skip-transitions (`5 ↔ 3` without visiting 4) as first-class graph edges, not derived shortcuts — but also verify that a claimed direct `5↔3` edge and the composite `5→4→3` path (if both exist) are checked against each other per §25.7, not assumed equivalent.

**Acceptance:**
- Building the graph for `S_3, S_4, S_5, S_6` with the known adjacent coalescences produces a connected graph.
- `findPath` returns `null` for genuinely disconnected states, a path otherwise.
- A test explicitly asserts the graph is *not* a linear chain (i.e., has at least one edge that isn't between numerically-adjacent vertex counts), so a future refactor can't accidentally collapse it back into a ladder.

---

## Stage 6 — Continuous morph / interpolation

**Goal:** support the continuous deformation path underlying a discrete state transition (spec §17, §18), for animation/UI use.

**Deliverables:** `rvcmg/morph.ts`

```ts
export function interpolate(op: CoalescenceOp, t: number): RvcmgVertex[]; // 0 <= t <= 1
```

- Implement both path kinds from §18: `symmetric` (`v_i(t) = (1-t)v_i + t*c` for both vertices) and `one-sided` (one vertex fixed, the other moves).
- At `t < 1`, the two vertices remain distinct (even if very close) — the discrete state transition happens exactly at `t = 1` (spec §17). Don't let numerical tolerance cause a premature "coalesced" classification during interpolation.
- Expose a `classifyState(vertices, tolerance)` helper that decides discrete vertex count from a continuous vertex array, for hooking into UI morph sliders.

**Acceptance:** interpolating `t=0` reproduces the source state exactly; `t=1` reproduces the coalesced state exactly; a mid-`t` sample for `symmetric` vs `one-sided` on the same pair produces different geometry (spec §5, §18 — "topologically equivalent... not necessarily geometrically equivalent").

---

## Stage 7 — Verification suite

**Goal:** a standing test module that directly implements spec §25 (25.1–25.8), runnable against any state/transition, not just hand-picked examples.

**Deliverables:** `rvcmg/verify.ts` + `rvcmg/verify.test.ts`

```ts
export function verifyTransition(op: CoalescenceOp, before: RvcmgState, after: RvcmgState): string[]; // problems, like validateShape()
```

Checks, each corresponding to a spec subsection:
- 25.1 coincidence — merged vertices at distance 0 within tolerance
- 25.2 adjacency — coalescing pair was adjacent in `before`
- 25.3 vertex count — `after.vertices.length === before.vertices.length - 1`
- 25.4 boundary validity — no stray zero-length edges, no self-intersection
- 25.5 endpoint geometry — matches independently specified target state, when one is supplied
- 25.6 reversibility — `separate(coalesce(s)) ≈ s`
- 25.7 path independence — if two paths are claimed equivalent, diff their resulting geometry, don't assume
- 25.8 state identity — equal vertex count does not imply equal state; compare coordinates + connectivity

**Acceptance:** this module returns `[]` (no problems) for every transition defined in Stage 5's graph. Wire it into CI/test run the same way `validateShape` is wired into the deltahedra test file.

---

## Stage 8 — Integration into Polyhedraverse

**Goal:** surface RVCMG as an interactive feature, once Stages 0–7 are verified — not before (per the "don't bolt features on top of an unstable core" lesson already logged for this project).

**Deliverables:**
- A morph-state explorer view: shows the current `RvcmgState`, the adjacent states reachable from it (graph neighbors), and a slider driving `interpolate()`.
- Reuse the existing 3D/4D operation-mode separation described in the Polyhedraverse to-do list (§2, "Reorganise the interface") — RVCMG should register as its own operation/mode, not get jammed into an existing menu.
- Read-only for now: selecting a target state previews the morph; committing it updates the working polyhedron's interface.

**Acceptance:** manual QA pass — every principal state (3/4/5/6-vertex) is reachable from the six-vertex source state via the UI, and reversing a move returns to a state that passes Stage 7's `verifyTransition`.

---

## Stage 9 — Physical/adapter export (optional, later)

**Goal:** spec §14/§21 explicitly leave the physical connector as an implementation choice outside the math — don't build this until 0–8 are solid.

**Deliverables:** an export function that takes a chosen `RvcmgState` and emits print-ready endpoint geometry (e.g., STL) for a specific interface state, for physical prototyping of the hemi-RD adapter piece.

**Acceptance:** exported geometry, when re-imported, reproduces the source `RvcmgState` vertex positions within manufacturing tolerance.

---

## Summary checklist for Claude Code

- [ ] Stage 0 — scaffold
- [ ] Stage 1 — real hemi-RD interface data (no regular-hexagon substitute past this point)
- [ ] Stage 2 — types (`RvcmgVertex`, `RvcmgState`, `CoalescenceOp`)
- [ ] Stage 3 — `coalesce()` with adjacency enforcement
- [ ] Stage 4 — `separate()` + reversibility tests
- [ ] Stage 5 — state graph, composite paths, non-ladder test
- [ ] Stage 6 — `interpolate()`, symmetric vs one-sided
- [ ] Stage 7 — full §25 verification suite
- [ ] Stage 8 — Polyhedraverse UI integration
- [ ] Stage 9 — physical export (optional)

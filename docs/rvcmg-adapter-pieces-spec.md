# RVCMG Adapter Pieces — Scoping and Status

**Status (2026-09-15): the core math library (Stages 0-7) is done and
fully verified. The physical product it exists to build — a family of 7
standalone 3D-printable connector pieces — has one piece prototyped
(Triangle-to-RD-H) and 5 more scoped but not yet derived. This doc is
both the scoping record and the running status/postmortem, mirroring
`catalan-solids-spec.md`'s own role for that family.**

## The actual goal: a modular polyhedron connector system

RVCMG (Reversible Vertex-Coalescence Morphing Geometry) is not, by
itself, a user-facing feature — it's the math used to derive a small,
fixed family of **physical adapter pieces** that let any two Platonic/
Archimedean/Catalan solid faces bolt together through a shared,
standardized interface, the way a USB-C cable's connector shape is
independent of what's on either end of the cable.

The system, direct from the user (2026-09-15):

- **RD-hemi** (bare): one real half of a rhombic dodecahedron (see
  "Hemi-RD interface geometry" below) — its flat hexagonal cut face
  mates with *another* RD-hemi piece to bridge two real rhombic
  dodecahedra. This mirrors Rhombiverse's own `hemisphereSplit()`/
  `hemisphereGeometry()` (`src/core/lattice.js` / `src/rhombis/
  geometry.js`), already shipped there for exactly this kind of
  cell-to-cell junction.
- **[Shape]-to-RD-H**: an adapter piece with the SAME hex interface on
  one side and a real face of some OTHER polyhedron family on the
  other. To connect any two shapes (RD or not), pick the matching
  adapter for each side and glue the two pieces together at their
  shared hex faces. RD-hemi's hex interface is the universal
  translation layer; RVCMG is the tool that shrinks it down to each
  target polygon correctly. Six such adapters, one per target face:

  | Piece | Target face | Target polyhedron | Vertices | Status |
  |---|---|---|---|---|
  | Triangle-to-RD-H | equilateral triangle, edge 1 | tetrahedron (D4) / octahedron (D8) | 3 | **done, verified** |
  | Square-to-RD-H | unit square | cube | 4 | scoped, not derived |
  | Pentagon-to-RD-H | regular pentagon, edge 1 | dodecahedron | 5 | scoped, not derived |
  | Golden-rhombus-to-RD-H | rhombus, diagonal ratio φ:1 | rhombic triacontahedron | 4 | scoped, not derived |
  | DI-kite-to-RD-H | deltoidal icositetrahedron's own kite | deltoidal icositetrahedron | 4 | scoped, not derived |
  | DH-kite-to-RD-H | deltoidal hexecontahedron's own kite | deltoidal hexecontahedron | 4 | scoped, not derived |

  Note the real payoff of the "state identity ≠ vertex count" rule
  (spec V7, enforced since Stage 2): Square/Golden-rhombus/DI-kite/
  DH-kite are FOUR genuinely different 4-vertex target shapes, not one
  shape counted four times — exactly the case this whole architecture
  was built to keep straight.

- **Physical constraint**: pieces must be compact (minimal extent along
  the connecting axis), since a real connection between two shapes
  always stacks TWO of these pieces together.

RVCMG's own coalescence/separation math (spec-numbered sections below)
is the tool that derives each target polygon's exact geometry from the
shared hex starting point, and — the point of Stage 4's reversibility
work — models the physical fact that two connected pieces can also be
taken apart again (`separate()` undoes `coalesce()` exactly). Per
direct user correction during this work: "reversibility just means
pieces can connect to each other" — the abstract math property
(`separate(coalesce(s)) == s`) is in service of that physical fact, not
an end in itself.

## The core library (Stages 0-7, `app/lib/rvcmg/`)

Built stage-by-stage per `docs/RVCMG-implementation-plan.md`, one commit per
stage, each verified before the next started (matching this project's
own `docs/build-plan.md` discipline). Full test suite:
`npm run verify:rvcmg-hemi-rd / -types / -coalesce / -separate /
-state-graph / -morph / -verify` plus `npm run test:rvcmg`.

- **Stage 1 — hemi-RD interface** (`hemiRdInterface.ts`): the real
  6-vertex boundary of a rhombic dodecahedron bisected through its own
  center, derived from the already-verified `POLYHEDRA.
  RHOMBIC_DODECAHEDRON` registry entry and Rhombiverse's own
  `hemisphereSplit()` classification rule (dot-product sign against a
  chosen face-normal axis) — re-verified against Polyhedraverse's own
  coordinates, not assumed to carry over. Confirmed computationally
  (not assumed) to be a genuinely NON-regular hexagon: 4 edges of one
  length, 2 opposite edges of a longer length (D2h symmetry) — the
  implementation plan explicitly bans a regular-hexagon placeholder
  past this stage, and this confirms why one would have been wrong.
  **Correction (2026-09-15):** an early doc comment claimed RD's own
  edge length in this registry's circumradius-1 frame is `2-sqrt(2)`;
  never actually checked, and wrong — the real, measured value is
  `sqrt(3)/2`. Fixed before it could propagate into a piece derivation.

- **Stage 2 — core types** (`types.ts`): `RvcmgVertex` / `RvcmgState` /
  `CoalescenceOp`, plus `statesApproximatelyEqual` (structural equality
  — coordinates + connectivity, never `.id` or vertex count alone,
  spec §25.8) and `parseCompoundId` (unambiguously recovers a merged
  vertex's immediate two parents from its own id string, at any nesting
  depth). A static scan (`types.test.ts`) flags any code that compares
  two states by `vertices.length` alone.

- **Stage 3 — `coalesce()`**: merges two ADJACENT boundary vertices to
  a target position (checked against the state's own `boundaryEdges`,
  never array position), transforms every other vertex only via the
  supplied deformation, and dedupes the resulting zero-length edge.
  Works on any state/pair — no `3->4->5->6` ladder hardcoded anywhere.

- **Stage 4 — `separate()` and reversibility**: exact inverse of a
  single `coalesce()` call, for every adjacent pair on every principal
  state (6/5/4/3-vertex), including a merge-of-a-merge (undoing lands
  back on the correct intermediate state, not exploded to fully
  original vertices) and the genuinely degenerate case of collapsing a
  triangle to 2 vertices (where the merged vertex's two original
  neighbors are literally the same third vertex). **Two real design
  bugs in the first version of `coalesce()` were caught only by
  actually trying to invert it**, not by inspection: `sourceIds` must
  record the immediate two parents (never flattened to original
  leaves), and merged-vertex ids needed to become unambiguous
  (parenthesized, `(left+right)`) so a restored child's own history can
  be re-derived by parsing its id rather than a second stored field.

- **Stage 5 — state graph** (`stateGraph.ts`): states as nodes, named
  transitions as undirected edges (`addTransition` always registers
  both a forward op and its inverse). Same-vertex-count and
  skip-transitions (e.g. 5<->3 without visiting 4) are first-class
  edges, not derived shortcuts — a real test asserts the graph isn't a
  pure ladder.

- **Stage 6 — `interpolate()`/`classifyState()`** (`morph.ts`): the
  continuous path underlying a discrete coalescence (`'symmetric'`,
  `'one-sided'`, or a custom curve), for a future preview slider. The
  discrete transition happens exactly at t=1; at any t<1 the two
  vertices stay genuinely distinct.

- **Stage 7 — verification suite** (`verify.ts`): `verifyTransition`
  directly implements spec §25.1-25.8 (coincidence, adjacency, vertex
  count, boundary validity, an independently-supplied expected
  endpoint, real reversibility via the actual `separate()` primitive,
  genuine recomputation — not assumed equivalence — of a claimed
  alternate path, and structural state identity). Scoped to a single
  genuine coalesce step; skip-transitions and a graph's auto-registered
  inverse edges are explicitly out of scope, not silently forced
  through the same check.

**Noted deviations from the implementation plan**, kept small and
explained inline rather than silent: no Jest/Vitest in this project, so
every `*.test.ts` here is a `tsx`-executed assertion script matching
`scripts/verify-*.ts`'s own `check()`/`failures` convention, not a new
test framework; `interpolate()` and `verifyTransition()` both needed one
extra parameter beyond the plan's literal signature (a starting state to
interpolate from; an options bag for 25.5/25.7's "when one is
supplied"/"if two paths are claimed equivalent") since neither check is
expressible without something to compare against.

## Adapter pieces (`app/lib/rvcmg/adapters/`)

### Triangle-to-RD-H — done, verified (`triangleToRdH.ts`)

The pipeline prototype, validating the whole approach before
generalizing to the other 5 pieces:

1. **Shared physical scale**: RD's own edge length is measured directly
   from the registry (`sqrt(3)/2` in the circumradius-1 frame, not
   assumed) and used to rescale the hex interface so RD's edge becomes
   exactly 1 — the same unit-edge convention every deltahedra/Platonic/
   Johnson/prism shape already uses. Every adapter piece needs this
   shared scale to physically mate with a real unit-edge tetrahedron/
   cube/etc.
2. **Merge sequence**: 3 `coalesce()` steps merging alternate edges of
   the hexagon — `(v1,v2)`, `(v3,v4)`, `(v5,v6)` — a perfect matching
   of 3 disjoint real edges, chosen because merging one pair never
   disturbs the other two's adjacency (order-independent) and is the
   natural "fold every other corner inward" contraction.
3. **Target placement**: each merge's target is the FINAL triangle
   vertex directly (no intermediate waypoints needed at the discrete
   level — `interpolate()` handles the smooth preview separately),
   placed in the SAME plane as the hex interface (both are flat
   cross-sections; the tapered 3D wall connecting them is a later,
   separate extrusion step) at circumradius `1/sqrt(3)` around the
   hex's own centroid, with each pair's own averaged angular position
   deciding which of the 3 target angles it gets — preserves the
   hexagon's real winding sense instead of risking an inverted
   (mirrored) result from an arbitrary fixed assignment.
4. **Verification**: every one of the 3 steps passes `verifyTransition`
   with zero problems; the final state is confirmed to be a genuine
   equilateral triangle of edge exactly 1 (not just "3 vertices");
   separating all 3 steps in reverse reproduces the original hex
   interface exactly (`statesApproximatelyEqual`).

### Outstanding

- The other 5 pieces (Square, Pentagon, Golden-rhombus, DI-kite,
  DH-kite) — same pipeline, different target polygon per piece. Not
  yet derived.
- **3D solid extrusion**: RVCMG's own states are flat 2D cross-sections
  (the hex face and the target face), not yet a real printable solid.
  The next real step for each piece is a tapered wall connecting the
  two end cross-sections at some physical depth — likely following
  `duoprism.ts`'s own wall-prism construction as the closest existing
  precedent in this codebase (a similar "two end polygons + connecting
  lateral faces" problem), rather than inventing a new technique.
  Compactness (minimizing that depth) is an explicit physical
  requirement, not yet designed.
- **Stage 8/9 as originally written** (an interactive morph-explorer UI;
  optional STL export) are superseded by this piece-family framing —
  the real UI/export need is "browse and export these 6(+1) fixed
  pieces," not a free-form live morph tool. Not yet scoped in detail.
- **UI integration model (direct from the user, 2026-09-15): these
  pieces snap onto faces exactly the way ordinary shape-to-shape
  face-attach already works in this app** (`ShapeViewer.tsx`'s
  "Attach via face…", `core.ts`'s `facesCongruent`/
  `faceRotationalSymmetry`, `computeFaceAttach`) — NOT a bespoke new
  interaction. They are their own separate registry family (own
  `FamilyKey`/`FAMILY_META` entry in `families.ts`, own wheel/browser
  category), not folded into Deltahedra/Platonic/Catalan/etc. This is
  the real reason the 3D solid extrusion above matters and can't be
  deferred indefinitely: face-attach requires a genuine `PolyhedronSpec`
  (real vertices/edges/faces, `facesCongruent`-compatible), so each
  finished adapter piece needs BOTH of its end faces (the hex + the
  target polygon) registered as real, attachable faces once the solid
  exists — not just the flat boundary loops RVCMG's own states are.

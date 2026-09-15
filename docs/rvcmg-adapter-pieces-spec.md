# RVCMG Adapter Pieces — Scoping and Status

**Status (2026-09-15): the core math library (Stages 0-7) is done and
fully verified, including the general "multiply" primitive
(`splitVertex()`) the divide-only original library was missing. All 6
originally-planned adapter pieces are derived and verified (Triangle,
Square, Pentagon, Golden-rhombus, DI-kite, DH-kite), plus a 7th
(Regular-Hexagon) added afterward — the family's math is complete; what
remains is the physical layer (3D solid extrusion, face-attach/UI
integration, both still unbuilt). This doc is both the scoping record
and the running status/postmortem, mirroring `catalan-solids-spec.md`'s
own role for that family. The normative geometric specification this
implements is `docs/RVCMG.md` (James Baker's own formal writeup,
uploaded 2026-09-15).**

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
  target polygon correctly. Six such adapters, one per target face,
  plus a 7th added later for a real hexagon-faced target (see below):

  | Piece | Target face | Target polyhedron | Vertices | Status |
  |---|---|---|---|---|
  | Triangle-to-RD-H | equilateral triangle, edge 1 | tetrahedron (D4) / octahedron (D8) | 3 | **done, verified** |
  | Square-to-RD-H | unit square | cube | 4 | **done, verified** |
  | Pentagon-to-RD-H | regular pentagon, edge 1 | dodecahedron | 5 | **done, verified** |
  | Golden-rhombus-to-RD-H | rhombus, diagonal ratio φ:1 | rhombic triacontahedron | 4 | **done, verified** |
  | DI-kite-to-RD-H | deltoidal icositetrahedron's own kite | deltoidal icositetrahedron | 4 | **done, verified** |
  | DH-kite-to-RD-H | deltoidal hexecontahedron's own kite | deltoidal hexecontahedron | 4 | **done, verified** |
  | Regular-Hexagon-to-RD-H | regular hexagon, edge 1 | any unit-edge hexagon-faced Archimedean solid (truncated tetrahedron/octahedron/cuboctahedron, ...) | 6 | **done, verified** (added later, "for the moment at least" — target polyhedron name left open) |

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
shared hex starting point. Two distinct things are both called
"reversible" in this project, and conflating them caused real confusion
mid-session — kept separate here on purpose:

- **The mathematical mechanism — the pure meaning of "Reversible" in
  RVCMG's own name, settled by the user (2026-09-15): "from here on in,
  that is the pure meaning of reversible."** `coalesce()` is division
  (two adjacent vertices -> one); `splitVertex()` (added this session)
  is its full dual, multiplication (one vertex -> two, at any two
  chosen positions, whether or not that vertex was ever a coalesce
  product) — the two are exact inverses of each other, uncapped in
  either direction: the framework can equally go 6 -> 3 (repeated
  division) or 6 -> 12 (repeated multiplication) or anywhere between.
  Proven directly, not just asserted: `splitVertex.test.ts` verifies
  `coalesce(splitVertex(s))` reproduces `s` for every vertex on every
  principal state, and `split-demos/{heptagon,octagon}.ts` build real
  regular 7- and 8-gons FROM the hex interface by splitting rather than
  merging — direct user request, "we can do an octagon to prove the
  splitting via writing the splitting math, and heptagon." (`separate()`
  remains in the library too, as the narrower "undo a specific known
  `coalesce()` call" convenience — it's what the 6 adapter pieces' own
  tests use, since each is undoing its own known construction.)
- **Derivation-reversibility (this doc's own term, adopted 2026-09-15
  to stop overloading "reversible")**: the specific, narrower check
  every adapter piece's own test file runs — that undoing the piece's
  own derivation steps (via `separate()`) reproduces the source hex
  interface exactly. This is a correctness check on the derivation
  CODE, not a claim about the finished physical piece.
- **The physical meaning (direct from the user, refined
  2026-09-15)**: "a connection goes both ways, even back to source if
  required via another adapter" — a real piece, once attached to
  something, can be detached again, and a chain of pieces can be
  traversed/undone back the way it came. This is a property of the
  app's face-attach/assembly system (already generic to any placed
  shape), not something RVCMG's own math provides or has been tested
  against — because these pieces have no real 3D solid geometry or
  face-attach integration yet (see "Outstanding" below).

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
  (not assumed) to have D2h symmetry: 4 edges of one length, 2 opposite
  edges of a longer length.
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
   hex's own centroid. Each pair's own angular position (in the hex
   interface's own planar frame) decides which of the 3 target angles
   it gets — preserving the hexagon's real winding sense instead of
   risking an inverted (mirrored) result — AND the whole assignment's
   rotational phase is chosen to minimize total twist relative to each
   pair's own real position (`assignTargetAngles`, `adapters/shared.ts`
   — factored out once the square piece needed the identical logic;
   direct user instruction: "always use closest corresponding corners
   of RD hex group to match square or other shape for least
   distortion").
4. **Verification**: every one of the 3 steps passes `verifyTransition`
   with zero problems; the final state is confirmed to be a genuine
   equilateral triangle of edge exactly 1 (not just "3 vertices");
   separating all 3 steps in reverse reproduces the original hex
   interface exactly (`statesApproximatelyEqual`).

### Square-to-RD-H — done, verified (`squareToRdH.ts`)

A square only needs 2 merges (6 -> 5 -> 4), unlike the triangle's 3 —
two of the six hex vertices (`v1`, `v4`, an exact central-symmetry pair,
`v4 == -v1` in the interface's own plane, confirmed computationally
rather than assumed from the RD's known inversion symmetry) are never
coalesced at all, yet must still land on specific final corners. This
surfaced the real intended use of a coalescence step's own
`deformation` parameter (spec §16's Φ, "applied to all other
vertices"): RVCMG has no separate "reposition without changing vertex
count" primitive, so the untouched pair's final repositioning is
carried by the SECOND merge's deformation, matched by exact position
(the deformation signature is position-only, not id-aware) rather than
left as a pass-through.

**A real gap in `verifyTransition` itself was caught by this piece, not
by inspection**: 25.6's reversibility check always called `separate()`
with the DEFAULT identity inverse deformation, which is correct for
every Stage 0-7 test case (all used identity) but silently wrong once a
step's real deformation is non-identity — it would leave the untouched
vertices at their post-deformation positions and report a false
failure. Fixed by adding `VerifyTransitionOptions.inverseDeformation`
(defaults to identity, so every existing test stays unaffected) rather
than special-casing this one piece.

Same final-shape discipline as the triangle: edge length checked (all 4
exactly 1) AND a real right-angle check (core.ts's own documented
lesson — equal edges alone don't rule out a rhombus), plus
derivation-reversibility confirmed through the real non-identity
inverse deformation, not just the identity case.

### Pentagon-to-RD-H — done, verified (`pentagonToRdH.ts`)

The simplest of the three so far: a hexagon already has exactly one
more vertex than a pentagon, so only ONE merge is needed (6 -> 5) —
merging `(v3,v4)`, one of the hexagon's two "long" (cube-corner-to-
cube-corner) edges. The other long edge, `(v6,v1)`, is its exact
inversion-symmetric image (confirmed computationally: the RD's own
central symmetry guarantees the hex interface has it too), so either
choice is equally valid, not arbitrary.

With only one step and no later step to split work across, all FOUR
untouched vertices (`v1`, `v2`, `v5`, `v6`) have their final
repositioning carried by this SAME step's deformation — the most
concentrated use yet of spec §16's Φ. Verified: all 5 edges exactly
unit length AND all 5 vertices equidistant from the centroid (a real
*regular* pentagon, not merely an equilateral one — matching the same
"edge length alone doesn't prove the shape" discipline as the square
piece's right-angle check), with the correct 108° interior angle at
every corner; derivation-reversibility through the real inverse deformation.

### Golden-rhombus-to-RD-H — done, verified (`goldenRhombusToRdH.ts`)

The first NON-regular target polygon in the family, and the first
piece where the two structural "roles" (the untouched-vertex pair
`v1`/`v4` vs. the two merged pairs) aren't interchangeable the way a
square's 4 equal corners are — one role sits on the rhombus's LONG
diagonal, the other on the SHORT one, and swapping them would produce
the same abstract shape but a physically different (more distorted)
piece.

Structurally identical to Square-to-RD-H otherwise (same 2 merges, same
untouched pair, same `assignTargetAngles` phase-fitting — a rhombus's
diagonals are still exactly 90° apart in angular position around the
centroid regardless of their unequal lengths, so the angle assignment
carries over unchanged; only the per-corner RADIUS differs by role).

Real values, measured directly from the registry rather than assumed
from "it's supposed to be phi": `POLYHEDRA.RHOMBIC_TRIACONTAHEDRON`'s
own face has edge length `1/phi` and diagonal ratio exactly `phi` in
its own circumradius-1 frame — rescaled to unit edge (multiply by phi)
for the shared adapter-piece scale. Which role gets the long vs. short
diagonal was decided by least distortion, not arbitrarily: `v1`/`v4`
already sit at radius 1 in this scale, closer to the long half-diagonal
(~0.851) than the short one (~0.526), so they keep the long diagonal
role — the smaller move of the two possible assignments.

Verified: all 4 edges exactly unit length (a rhombus is always
equilateral — that alone doesn't distinguish it from a square, so also
checked): the two diagonals are genuinely unequal (not accidentally a
square), their ratio matches the measured φ exactly, and they're
perpendicular (a rhombus's defining property); derivation-reversibility
through the real non-identity inverse deformation.

### DI-kite-to-RD-H and DH-kite-to-RD-H — done, verified (`kiteToRdH.ts`, `diKiteToRdH.ts`, `dhKiteToRdH.ts`)

The two hardest pieces, sharing one function (`deriveKiteToRdH`)
parametrized by which Catalan solid's face to target — identical
structure, genuinely different measured geometry. The first pieces with
NO central symmetry to exploit (a kite has only a single mirror axis,
not `v4 == -v1` point symmetry) and the first whose 4 target corners are
genuinely non-interchangeable (different radii AND non-uniform angular
spacing, unlike every prior target).

This forced a real generalization of `assignTargetAngles`:
`fitTargetPolygon` (shared.ts) tries all 4 cyclic role assignments
(which hex group plays which kite corner), scoring each by actual 2D
squared position error after its own best-fit rotation (a *weighted*
circular mean — weight = `sourceRadius * targetRadius`, which is what
correctly minimizes true Euclidean error rather than just angular
error). **A real indexing bug was caught only by running it, not by
inspection**: the first version of the piece's own final-shape
verification assumed a fixed corner-role-to-output-position mapping,
but `fitTargetPolygon` is free to pick ANY of the 4 assignments (all
equally valid geometrically) — both kites came back correctly shaped
but with edges "off by a rotation" against that wrong assumption. Fixed
by having `fitTargetPolygon` also return `cornerIndexForGroup` (which
measured corner each output vertex actually got), so verification
checks the ACTUAL assigned role rather than a hardcoded position.

Scale: since a kite has no single edge length (unlike every prior
target), the SHORT edge was picked as the shared "= 1" reference — a
documented judgment call, not a forced convention.

Verified: exactly 2 short + 2 long edges (not a rhombus), both
proportions matching the measured Catalan face exactly (cross-checked
independently of the derivation's own internal edge-length logic), and
the mirror-symmetry defining property itself (the two "side" corners
equidistant from centroid with equal interior angles, located by their
actual assigned role — not a hardcoded index); derivation-reversibility
through the real non-identity inverse deformation; DI and DH confirmed
to have genuinely different proportions (not interchangeable).

### Regular-Hexagon-to-RD-H — done, verified (`regularHexToRdH.ts`)

Added later, direct user request ("one more adapter piece regular hex
to RD please for the moment at least") — a real, legitimate 7th piece,
**not** a reversion to the earlier "regular hexagon" misunderstanding
this doc's own opening section describes and expunges. That correction
was about the ACTUAL hemi-RD interface never being a regular hexagon
(it genuinely isn't — D2h symmetry, confirmed computationally). This
piece is different in kind: it intentionally TARGETS a real regular
hexagon as its own distinct destination shape, exactly the way every
other piece targets its own distinct destination shape (a triangle, a
square, a kite, ...) — matching any unit-edge Archimedean solid with
genuine regular hexagonal faces (truncated tetrahedron, truncated
octahedron, truncated cuboctahedron, ...). Which specific one it's
officially named after is left open "for the moment," since every
unit-edge-normalized hexagon-faced Archimedean solid shares the exact
same regular hexagon.

Structurally unlike every other piece: same vertex count on both ends
(6 -> 6), not a reduction. RVCMG has no single primitive for "reshape
without changing count" (coalesce/splitVertex both change count by
exactly one), so this is built as a genuine composite transformation
(spec §8): coalesce `(v1,v2)` together [6 -> 5], deforming `v3..v6` to
their final regular-hexagon corners in that same step since they never
move again, then immediately `splitVertex()` the result back apart at
the two REAL target corners [5 -> 6]. This is also the first REAL
(non-synthetic) demonstration of spec §10/Stage 5's own
"`S6(a) <-> S6(b)`" same-vertex-count state-graph edge —
`stateGraph.test.ts` only ever exercised that case with a fabricated
placeholder op, never real geometry.

**A real bug, caught only by actually running the reversibility check,
not by inspection**: undoing the composite requires two DIFFERENT
inverse operations in sequence — `coalesce()` to undo the split,
`separate()` to undo the original coalesce — and the intermediate
recombined vertex needs BOTH its `id` and its `sourceIds` relabeled
back to the true originals (`v1`/`v2`) before calling `separate()`, not
just its `id`. Leaving `sourceIds` pointing at the composite's own
transient split-step names (`v1r`/`v2r`) made `separate()` restore the
right POSITIONS under the wrong ID LABELS — geometrically invisible in
the final shape but a real failure of the reversibility check itself,
caught directly rather than assumed fine because the shape looked
right.

Verified: all 6 edges exactly unit length, all 6 vertices equidistant
from the centroid (a real regular hexagon, not merely equilateral),
and the source hex confirmed genuinely non-regular first (so this
piece is a real reshape, not a disguised no-op); full round-trip
reversibility of the whole composite.

## Splitting the OTHER way: proving the multiply direction

Separate from the 6 adapter pieces (all of which divide the hex
interface down): `app/lib/rvcmg/splitVertex.ts` adds the general
"multiply" primitive the library was missing (see this doc's own
"reversibility" section above), and `app/lib/rvcmg/split-demos/` proves
it works by building real regular 7- and 8-gons FROM the hex interface
by splitting rather than merging (direct user request). Not adapter
pieces — no physical target shape names a 7- or 8-vertex Catalan/
Platonic/Archimedean face — purely a demonstration that the duality is
real and general, not a divide-only illusion.

### Outstanding

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
  **When this lands, "Attach via face…" should surface every
  geometrically valid match (including these adapter pieces and the
  graded pyramids below), not just same-family shapes** (direct user
  instruction, 2026-09-15).

## A planned "Miscellaneous" family: graded pyramids (and, eventually, the adapter pieces above)

Direct user request (2026-09-15), separate from RVCMG's own vertex-
coalescence math: a new face-attach add-on family for irregular pieces
— starting with **graded pyramids**, a base polygon topped by an apex
whose height is driven by a target APEX ANGLE (the interior angle of
each lateral triangular face, at the apex) rather than one fixed
height. Four grades proposed and confirmed: 0 (low), 1 (standard —
reproduces whatever regular-faced pyramid already exists for that
base), 2 (tall), 3 (sharp, "like star solids"). Eventually this family
is meant to also hold the 7 RVCMG adapter pieces once they're real
solids, per the user's own framing — not a coincidence, a shared home
for "attachable pieces that aren't one of the classical polyhedron
families."

**Prototyped and verified for a triangular base**
(`app/lib/polyhedra/gradedPyramids.ts`, `npm run
validate:graded-pyramids`): for a regular n-gon base of unit edge,
`apexHeightForAngle(n, angle)` derives the exact height via
`L = 1/(2*sin(angle/2))` (slant edge length) then
`h = sqrt(L^2 - R^2)` (R = the base's own circumradius) — real
geometry, not a fitted curve. Grade values (0/1/2/3 → 100°/60°/40°/20°)
are a documented, adjustable default, not a forced convention; grade 1
(60°) is fixed because that's the one apex angle that makes every
lateral face equilateral, for ANY base shape.

**Confirmed computationally, a genuinely useful side effect of building
this**: a pyramid degenerates (`h -> 0`) exactly at apex angle
`360/n` degrees — for a triangular base that's 120°, confirmed by
direct construction; for a HEXAGONAL base it's exactly 60°, which is
also the exact apex angle a unit-edge equilateral triangle needs. This
is the actual reason no Johnson solid or convex deltahedron is a
regular-faced hexagonal pyramid — it's not merely absent from the
classification, it's geometrically impossible, confirmed directly
(`apexHeightForAngle(6, 60)` correctly throws rather than returning a
degenerate or fake height).

Grade 1 on a triangular base was confirmed to exactly reproduce the
existing `D4` (regular tetrahedron), vertex for vertex — a strong
correctness check on the apex-angle formula itself, not just an
isolated new construction.

### Outstanding (graded pyramids)

- Square, pentagonal, and hexagonal REGULAR bases — same formula,
  should be close to a parameter change (verify grade 1 reproduces J1/
  J2 where those exist; hexagonal base has NO valid grade-1 by the
  degenerate-limit finding above, needs its own decision for what
  "standard" means there, if anything).
- IRREGULAR bases (golden rhombus, kite, the real hemi-RD hexagon) —
  a genuinely different problem: their lateral faces aren't congruent,
  so there's no single apex angle, only a per-edge one. Not yet
  designed.
- The shared "Miscellaneous" registry family itself (`families.ts`) —
  not yet created; both graded pyramids and the 7 RVCMG adapter pieces
  are meant to eventually live there together.

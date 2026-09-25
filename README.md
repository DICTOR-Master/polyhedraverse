# Polyhedraverse

<p align="center">
  <img src="public/brand/logo.png" alt="Polyhedraverse" width="280">
</p>

**Open-source spatial geometry environment**

**[Try it live](https://polyhedraverse.vercel.app)** — runs entirely in
your browser, nothing to install.

### Spatial Editing Suite
*Construct • Transform • Connect • Explore*

> An open-source spatial geometry environment for constructing,
> transforming, and interconnecting polyhedral forms in three dimensions
> — and, uniquely, in four.

A browser-based construction kit with over 160 shapes, browsable in 11
families — the classical convex polyhedra (Platonic, Archimedean, Johnson,
Catalan, prisms, antiprisms, and the original Deltahedra set this
project started from), Parallelohedra, Space-Filling Pairs, the 4D-capable
seeds, and a "Miscellaneous" family (graded pyramids, RVCMG connector
pieces, and quad-prism extenders — see "What's here now" below) — plus a genuine interactive path into the fourth
dimension: **RCP-C2B
(Radial Cell Projection, Click-to-Build)** lets you construct a real
regular 4-polytope — the 5-cell, tesseract, 16-cell, 24-cell, 120-cell,
or 600-cell — one 3D cell at a time, built from the actual
Wythoff/Coxeter reflection construction mathematicians use to define
these objects, not an animation or approximation. A one-click "Open / Closed"
view toggle shows the same cell either as an ordinary undistorted shape or
at its real, warped position in the closed 4D structure, so the
difference between a 3-dimensional and a 4-dimensional object is
something you can actually see change in front of you, not just read
about — and an "RCP-Coordinates" overlay goes a layer deeper, showing the
literal points the construction generates each cell from. See
**[Radial Cell Projection](docs/radial-cell-projection.md)** for how
the app implements that classical construction (Coxeter's reflection
construction, shown as Schlegel-style perspective projections).

Two ways to connect ordinary 3D pieces: click a free vertex and snap on
a new piece with a free rotational joint (molecular-model-kit style —
started with the 8 convex deltahedra specifically because they don't
tile space and their dihedral angles are incompatible across types), or
click a free face and glue on a shape with a matching face size for a
real shared-face join (a cube onto a cube, say), with a discrete
rotational registration instead of a free twist. A view toggle (Solid /
Translucent / Skeleton) lets you see through a structure once pieces
start nesting.

The intention is for this to grow into a sibling of
[Rhombiverse](https://github.com/DICTOR-Master/rhombiverse) — a general
polyhedral space-editing suite covering the Platonic and Archimedean
solids and the Johnson solid family alongside the 8 deltahedra, with its
own introductory geometric-packing puzzle game in the spirit of
Rhombiverse's RHOMBIS (working name: DELTIS). See `docs/build-plan.md`'s
trailing sections for what's actually shipped versus what's still ahead.

## Scope

- Platonic solids
- Archimedean solids
- Johnson solids
- Catalan solids
- Prisms & antiprisms
- Geometric transformations
- Spatial placement and orientation
- Lattice construction
- Interpenetrating structures
- Polyhedral relationships
- Concave (non-convex) polyhedra — may be added later, alongside the
  convex families above
- (room to grow) more unusual spatial operations as they're developed

This list is intentionally open-ended, describing the project's
direction rather than a feature checklist — so the README doesn't need
rewriting every time a new capability lands. **"What's here now" below
is the ground truth for what's actually shipped today**; Johnson
solids and Catalan solids are BOTH complete (92 of 92, 13 of 13), and
lattice construction / interpenetrating structures are still
direction, not yet delivered.

## What's here now

The original 8-stage build plan (all 8 deltahedra, pick/attach/twist/
confirm, a real persisted assembly graph, the D10↔D12 rewrite rule,
cascade delete) is done — see `docs/build-plan.md` for the full
stage-by-stage account, including exactly how each stage was verified.
Since then:

- **Geometry core, restructured for multiple families**
  (`app/lib/polyhedra/`) — `core.ts` holds family-agnostic infrastructure
  (vertices+edges+faces as the only source of truth; everything else
  derived), with one file per family. D12 (snub disphenoid) is the one
  deltahedron with no compass-and-straightedge construction — its
  coordinates come from the positive real root of an irreducible cubic,
  hardcoded rather than solved at runtime.
- **Platonic solids added** — cube and dodecahedron (tetrahedron,
  octahedron, and icosahedron were already deltahedra D4/D8/D20).
  Cross-checked against a true 3D convex-hull computation, not
  hand-derived: an early attempt at the dodecahedron's face list, based
  on a plausible-looking heuristic, produced silently wrong, non-planar
  faces — see `docs/build-plan.md` for what that looked like and how it
  was actually fixed.
- **All 13 Archimedean solids** — cuboctahedron and the two truncated
  simple-integer solids first (low transcription risk), then the
  remaining 10 (golden-ratio coordinates, a truncated icosahedron derived
  by 1/3-edge-truncating this project's own icosahedron, and two chiral
  snub solids needing a numerically-solved root). Caught real
  transcription bugs building these, at more than one level — mismatched
  independently-generated vertex/edge orderings, a hand-guessed edge list,
  a mis-transcribed defining cubic for the snub cube's chiral constant
  (caught because it produced two different edge lengths instead of one),
  and a precision-rounding bug that broke a downstream verification
  script's tolerance without the shapes themselves being wrong — all
  worked examples in `docs/build-plan.md` of why every claim here gets a
  computational cross-check rather than trust.
- **All 92 of 92 Johnson solids — complete**, in batches, each with a full
  postmortem in `docs/build-plan.md`. Batches 1-6 built the pyramids,
  cupolas, rotunda, and every elongated/gyroelongated/bicupola/
  augmented-prism form of them (34 shapes) — along the way, verifying
  rather than assuming the ortho/gyro twist angle (the triangular case
  coincides exactly with the already-registered cuboctahedron, the real
  reason "triangular gyrobicupola" isn't its own Johnson solid),
  catching a rounding-reused-as-computed-value precision bug, and
  confirming computationally (not guessed) that several gyroelongated
  shapes and both snub Archimedean solids are genuinely chiral — only
  one handedness of each is stored, which matters for face-attach (a
  mirror-image toggle is a real, not-yet-built gap this surfaced).
  Batch 7 added augmented dodecahedra and bidiminished/tridiminished
  icosahedra (6 shapes), deliberately excluding "augmented tridiminished
  icosahedron" (J64) once its natural construction was shown to be
  *provably* congruent to an already-registered shape. **Batch 8
  (augmented truncated Archimedean solids) is the most important
  methodological lesson in this registry so far**: 6 of 7 attempted
  shapes passed every check used through batch 7 (Euler's formula,
  uniform edge length) and were still wrong — some of their "extra"
  merged quad faces turned out to be rhombi (unit edges, unequal
  diagonals) rather than true squares, caught only by
  `verify:face-attach`/`verify:face-twist`'s stricter cross-shape
  tolerance. Only J65 survived; J66-J71 were reverted rather than
  shipped wrong. **Edge-length uniformity alone doesn't confirm a face
  is regular** — a rhombus and a square can have identical edges — and
  every batch since checks face diagonals explicitly, not just edges.
  Batch 9 (gyrate/diminished rhombicosidodecahedra, 11 of 12 attempted
  shapes) applied that discipline from the start and passed cleanly on
  the first attempt, on a much larger, more combinatorially complex
  family; only J79 (bigyrate diminished) was left out after failing
  identically across all 10 possible constructions. **Batch 10
  corrected all 6 of batch 8's excluded shapes (J66-J71)**: external
  research (`docs/johnson-solids-remaining-spec.md`) found the missing
  detail — the cupola cap needs one specific discrete registration
  (its squares next to the truncated solid's triangles), not the
  default "no extra twist" batch 8 used. Verified directly by sweeping
  every possible registration for the affected faces: exactly half
  reproduce a clean result, the other half exactly reproduce batch 8's
  rhombus-contamination bug, confirming the diagnosis rather than
  merely working around it. J71 (three cupolas on a mutually-meta
  decagon triple) surfaced a real, previously only hypothesized
  wrinkle: its 3 target faces did NOT all need the same registration
  parity, caught only because each was verified fully independently.
  **J64 also corrected in the same batch**: external research revealed
  batch 7's exclusion reasoning was based on the wrong operation
  entirely — the real construction attaches a regular tetrahedron to
  one specific TRIANGLE face of J63 (found combinatorially: the one
  triangle edge-adjacent to all 3 of its pentagons), not a pentagonal
  pyramid on a pentagon. Directly confirmed not congruent to J62 (the
  shape batch 7's wrong attempt collapsed into) via the same
  congruence check that first caught that mistake. **Batch 11 fixed
  J79 too**: batch 9's own attempt, and this doc's first reading of
  the external research describing it, both assumed the 2 gyrated
  regions were RD's "para" (opposite) pair — the source actually says
  "non-opposite." Checked combinatorially, the para pair touches every
  other region's waist ring (a structural consequence of RD's vertex
  configuration), explaining why all 10 diminish choices failed
  identically; with the correct "meta" pair, 2 of the 10 remaining
  regions diminish cleanly. Rebuilt the gyrate/diminish machinery from
  scratch and self-checked each operation against already-registered
  shapes (exact match to J72/J73/J76) before trusting it for J79
  itself. 5 of the 92 are already deltahedra in this registry (D6/D10/
  D12/D14/D16) and aren't re-derived. **Batch 12 completed the family**:
  the 8 "elementary" Johnson solids (J85-J92) each needed a *published*
  external polynomial or golden-ratio closed form rather than an
  operation on an already-registered piece — solved directly with
  `numpy.roots()` (already installed, nothing new needed), no general
  nonlinear geometric solver required after all. Two real findings
  surfaced only during construction: J85 (snub square antiprism) is
  **achiral** despite its name (a genuine rotation maps its mirror
  image exactly onto itself, confirmed not assumed); J90
  (disphenocingulum)'s own Wikipedia source under-specifies its
  symmetry group (states only 2 reflections, which can't reach its
  own stated vertex count from 3 points) — resolved by finding and
  verifying the missing S4 rotoreflection generator directly. **All 92
  Johnson solids are now in this registry.**
  First shape in this registry that isn't vertex-transitive: J1's apex
  has degree 4 while its base vertices have degree 3. First with no
  degree-3 vertex at all: J10 (only degree 4 and 5).
- **All 13 of 13 Catalan solids — complete**, the
  first family with genuinely irregular faces (face-transitive, not
  vertex-transitive). Needed two real generalizations, not just more
  registry entries: `makeSpecByCircumradius` (circumradius = 1
  per-shape normalization, chosen empirically over 3 rejected
  alternatives) and `facesCongruent`/`faceRotationalSymmetry` (real
  edge+angle congruence and a face's own rotational-symmetry order,
  replacing vertex-count-only matching that was only ever safe because
  every prior family had regular faces — this fix applies everywhere,
  not just to Catalan shapes). Batch 1 (2 shapes, uniform-edge rhombi)
  surfaced a subtle bug: a face's "vertex 0" needs a consistent
  geometric role across every face of a shape, not just consistent
  edges — trivially true for a regular n-gon, not automatic for an
  irregular one. **Batch 2 (9 more, all non-chiral/non-uniform-edge)
  found something deeper**: `DISDYAKIS_TRIACONTAHEDRON`'s 120 scalene-
  triangle faces are the first face type in this registry with zero
  symmetry at all — not just no rotation, no reflection either,
  genuinely chiral as 2D shapes. `facesCongruent` was checking each
  face pair's DIRECT sequence match; proven (brute-force search over
  every twist angle, then confirmed by finding the shape's own actual
  mirror-partner faces) that the real attach transform's normal-
  opposition inherently requires a REVERSED match instead — changes
  nothing for every achiral face already in the registry (confirmed by
  the full `verify:face-attach` suite staying at 0 failures across all
  135 shapes), but was silently wrong for chiral faces until fixed.
  **Batch 3 (the 2 chiral pentagon solids, duals of the snub cube/
  dodecahedron) confirmed — not assumed — that the same fix already
  covered them too**: the full `verify:face-attach` suite passed at 0
  failures across the complete, final 137-shape registry on the first
  attempt, no further changes needed. See `docs/catalan-solids-spec.md`
  for the full design record, including why an earlier, related
  investigation reached the opposite conclusion for a different
  (achiral) shape and was correct for that case.
- **Pick, attach, twist, confirm/cancel** — hover a vertex to see its
  capacity, pick a shape to attach, drag to twist it around the one
  remaining rotational degree of freedom, then confirm or cancel.
- **A real assembly graph** (`app/lib/assembly.ts`), built only from
  user actions and persisted to your browser's own local storage —
  reload restores exactly what you built.
- **The D10↔D12 rewrite rule** — swap a placed node's shape in place;
  existing connections re-anchor to the most directionally-similar
  vertex on the new shape where one exists, or get flagged rather than
  guessed.
- **Cascade delete**, a capacity glow so you can see at a glance which
  nodes still have room to build from, and a (currently unreachable,
  honestly documented) cycle-detection primitive for a future "closed
  cage" goal.
- **Face-to-face connections** — click a free face (not just a vertex)
  to glue on a shape with a matching face size. Two coincident regular
  n-gon faces have no free rotation the way a vertex ball-joint does —
  only *n* discrete registrations keep them flush — so dragging a
  pending face-attach cycles through those instead of spinning freely.
  Getting the placement math right took a real wrong turn worth reading
  about in `docs/build-plan.md`: assuming "no extra twist" or "a
  multiple of 360°/n from zero" is already correct turned out false for
  most shape pairs: the fix was computing the angle analytically instead
  of guessing.
- **A view toggle** (Solid / Translucent / Skeleton) for seeing
  through a structure once pieces start nesting — applies to every
  placed shape at once.
- **PolyhedralWheel** — a dodecahedron-shaped 3D radial menu (`Tab` /
  `Space`, or the always-visible corner medallion, to open) replacing the
  flat shape-picker button row, which doesn't scale to 100+ shapes.
  Family-grouped (deltahedra/Platonic/Archimedean/Johnson), ported from
  Rhombiverse's Rhombic Wheel with its own green color identity rather
  than a straight reskin (a small silver corner medallion,
  `CornerHudWheel`, is the one piece that stays silver, matching
  Rhombiverse's own equivalent). Also filters to compatible shapes when
  picking a face-attach target. Actions (augment/diminish) and
  Spherical/X-Ray view modes are still deferred — see
  `docs/build-plan.md`'s own sections for the full design record.
- **4 languages** (`app/lib/i18n.ts`) — English, 日本語, Español, and
  Français, switchable live via the "Language" button (wheel/HUD chrome
  and ShapeBrowser). Scoped deliberately to the app's OWN interface
  strings only (tab labels, facet headers, buttons, empty states) — shape
  names and family names (Deltahedra, Johnson, etc.) always stay in their
  original form in every language, the same way a karaoke machine never
  translates a song title.
- **4D radial cell projection** (`app/lib/polyhedra/fourD.ts`,
  `app/lib/polyhedra/radialProjection.ts`, full method write-up at
  `docs/radial-cell-projection.md`) — the real 4D system. `fourD.ts`
  classifies which shapes can be a "cell" of a convex 4-polytope via
  dihedral-angle-defect math (`k` copies meeting at a shared edge close
  into 4D when `k × dihedralAngle < 360°`); checked against the real,
  known classification of the regular 4-polytopes, not just internal
  consistency. Five of the 137 registered shapes qualify — tetrahedron,
  octahedron, cube, dodecahedron, and a geometrically-tetrahedral
  graded-pyramid duplicate — gathered into a 4D-Capable family with a
  distinct gold "4D" badge on their cards, resolving to **six verified
  closures** in total (the tetrahedron alone genuinely closes three
  different ways). `radialProjection.ts` builds each one's *actual*
  regular 4-polytope (5-cell, tesseract, 16-cell, 24-cell, 120-cell, or
  600-cell) via the real Wythoff/Coxeter construction: a BFS of
  hyperplane reflections in true 4D coordinates, not a per-pair 3D
  correction — reflections in a finite Coxeter group compose exactly and
  the orbit is *guaranteed* to close, unlike an earlier per-pair-rotation
  approach (the retired 4D fold, whose old saves now load as plain face
  attaches) which could only ever handle an isolated pair before
  oscillating. Verified against the
  app's own real, normalized polyhedron data: exact cell counts, exact
  adjacency degrees, exact cell-to-cell angles, and — the decisive check
  — that adjacent cells' shared faces coincide vertex-for-vertex, not
  just share the right angle. `dualize()` additionally implements
  4-polytope duality as a generic operation, used to cross-check the
  directly built 600-cell against the dual of the 120-cell.
- **RCP-C2B (Radial Cell Projection, click-to-build)** — the real 4D system
  above, made interactive: pick any 4D-Capable shape and build its
  actual regular 4-polytope one cell at a time, right in the main scene,
  not just as a passive reference view. The first ring of cells (every
  direct face-neighbor of the seed) builds one click at a time; once
  that ring is complete, further rings build a whole shell per click. A
  per-root **Open / Closed toggle** switches every built cell between an
  ordinary, undistorted flush-attached copy of the seed ("Open") and its
  real, warped position in the closed 4-polytope ("Closed", the same true
  perspective-projected geometry the reference view uses) — letting you
  watch the actual difference between a 3-dimensional and a
  4-dimensional structure, not just take it on faith. The choice
  persists with the rest of the scene, so reloading a saved build keeps
  the view you left it in. Covers all 6 verified closures, including the
  600-cell, which is built by direct reflection like the others, so its
  seed cell is an exactly regular tetrahedron. The 600-cell also has a
  vertex-first mode: its first shell is the 19 tetrahedra around one seed
  corner, completing an icosahedron of 20, which lies flat with visible
  gaps in Open view (the gaps are drawn in red) and closes up in Closed
  view. A **"Shell colours"** toggle tints each built ring of cells with
  its own colour. An **"RCP-Coordinates" overlay** reveals the construction
  itself: each built cell's own real generating coordinate, marked with
  a small cross (like a point on an architect's drawing, not a solid
  ball) and joined to the shape's center by a purple laser beam — on the
  600-cell, a second color also marks its dual points, each in the
  direction of a dodecahedral cell centre of the dual 120-cell. A dimmer
  preview extends one step further than what's actually built, showing
  exactly where the next click will go, right up to the closure's real
  limit.
- **The 4D Prism (duoprism) construction** (`app/lib/polyhedra/duoprism.ts`)
  — a structurally different, always-exact 4D construction: literally
  "shape × interval" (a tesseract is *also* describable as a cube
  extruded into a 4th dimension), generalized to any polyhedron. Two
  identical-orientation copies of a shape (a pure translation, not a
  mirrored flush join) connected by one real 3D wall-prism cell per
  face. Exactly correct in ordinary 3D for any shape, at any chaining
  depth — verified against the 4D Euler characteristic (`V-E+F-C=0`,
  reducing to the base shape's own `V-E+F=2`) across all 137 registered
  shapes, real winding/non-degeneracy checks, and a direct, computed
  proof that multiple duoprism attaches on different faces of the same
  parent all share ONE far copy (no gap between siblings, unlike an
  earlier version that created a separate one per face). Every shape's
  detail card offers one "View 4D" toggle, deciding the math
  automatically rather than exposing a choice: the 4 FOURD-capable
  shapes show radial projection (their real named 4-polytope), every
  other shape falls back to this duoprism preview (the only 4D
  construction defined for it). The same 4 gold-badge shapes
  additionally get a real, scene-buildable "Attach via Duoprism…"
  option in the main scene with no picker step, chainable into groups —
  the one 4D construction that's actually buildable, since duoprism
  pieces stay undistorted at any depth.
- **RVCMG (Reversible Vertex-Coalescence Morphing Geometry)**
  (`app/lib/rvcmg/`, `docs/RVCMG.md`, `docs/rvcmg-adapter-pieces-spec.md`)
  — a physical adapter system, not a UI feature: a shared hex interface
  plus shape-specific adapter pieces that each morph that hex down to a
  target face via `coalesce()` — a real, reversible (both directions: 6
  points can reduce to 3, or split back out to 12 or any other count)
  vertex-merge primitive, verified via a dedicated Stage 7 transition-
  checker across every piece, plus two from-scratch heptagon/octagon
  constructions proving the split ("multiply") direction directly
  rather than just asserting divide has an inverse. **Redesigned
  2026-09-17 (v2, the live default)**: the original hex (derived by
  bisecting this project's own rhombic dodecahedron — a real, non-
  regular D2h hexagon reaching circumradius 1.0) was up to 1.73x too big
  to fit inside its own tightest target, a unit-edge triangle, and its
  2-fold symmetry couldn't align with a triangle's 3-fold symmetry
  either. v2 replaces it with a small, plain, fully regular hexagon
  (circumradius = edge = `sqrt(2)/2`, exactly a unit-edge square's own
  circumradius — chosen so the triangle/square/pentagon tapers are all
  mild in either direction, not tuned to just the tightest case) and 9
  pieces built on it: triangle, square, pentagon, golden-rhombus, a new
  RD-native-rhombus (confirmed genuinely congruent to a real
  `RHOMBIC_DODECAHEDRON` face — a UHex adapter can now reach a real RD
  directly, no intermediary dome needed), both real-Catalan (di-/dh-)
  kite shapes, a regular-hexagon piece, and a plain U-Hex-to-U-Hex
  spacer prism for lengthening a chain of adapters — whose own 6
  lateral faces are genuine squares and, like the quad-prism extenders
  below, real attach ports too, not just its two hex ends. No bare
  "RD-Hemi" dome in v2 — the hex is no longer tied to a real RD's own
  native scale. **v1 (the original 7 adapters + bare RD-Hemi) is archived, not
  deleted** (`rvcmg-connectors-v1-archived/`) — code and tests still
  pass, but it's no longer part of the live app. These connector shapes
  have no external precedent — unlike every other family in this
  registry (Platonic, Archimedean, Johnson, Catalan, prisms/antiprisms,
  the Kepler-Poinsot star polyhedra), which all reproduce a known,
  published classification, RVCMG's adapter pieces are an original
  construction of this Polyhedraverse project itself, designed to solve
  a specific real-world physical-connector problem rather than to
  recreate an existing mathematical catalog.
- **Quad-prism extenders** (`app/lib/polyhedra/miscellaneous/
  quad-prisms/`, `app/lib/polyhedra/polygonPrismSolid.ts`) — 4 more
  prism-like pieces: a real Catalan-solid rhombus/kite face (RD-native
  rhombus, golden rhombus, DI-kite, DH-kite) extruded into a right
  prism along its own normal, with every lateral face a genuine
  rectangle (a square where the base's own edge equals the extrusion
  height). Every face is a real attach port — a cube or another
  matching piece can attach sideways, not just end-to-end — EXCEPT a
  kite's own 2 non-square rectangle faces, which stay excluded: their
  only mirror axes pass through an edge midpoint rather than a vertex,
  a case the app's own face-attach placement math (which aligns via a
  vertex-based correspondence) can't handle for ANY pair of such faces,
  confirmed directly rather than assumed. Building this also surfaced
  and fixed a real, separate bug in `rotateFaceToMirrorAxis` (`core.ts`,
  shared by every family): a rhombus has more than one valid mirror-
  axis start, and the existing tie-break was a no-op for one, so two
  independently-built rhombus pieces could fail to attach correctly —
  fixed with a second, purely intrinsic tie-break (smallest interior
  angle), confirmed via the full exhaustive `verify:face-attach` sweep.
- **A new "Miscellaneous" registry family** (`app/lib/polyhedra/
  miscellaneous/`, symbol `⌂`) for irregular/graded add-ons that don't
  belong to one of the classical families — a directory of independent
  sub-groups: `pyramids/` (done), `rvcmg-connectors-v2/` (the live RVCMG
  set above), `rvcmg-connectors-v1-archived/` (kept for reference, not
  in the live app), and `quad-prisms/` (above). **Graded pyramids**: every
  regular-pyramid-capable base already in the registry (triangular,
  square, pentagonal — a regular hexagonal pyramid is geometrically
  impossible, confirmed computationally: 60° is exactly both the
  degenerate apex-angle limit at n=6 *and* the equilateral-triangle
  angle) gets 4 graded height variants (1=low, 2=standard — an exact
  duplicate of the existing D4/J1/J2 entry, confirmed vertex-for-vertex
  — 3=tall, 4=sharp), height derived per grade from a target lateral
  apex angle rather than hand-picked, and re-derived per base shape
  rather than reused as a constant (an early version reused triangular
  base's own grade-1 angle for every base, which happened to be exactly
  square's own degenerate limit and crashed outright — fixed by deriving
  each base's grade 1 independently). A new face-attach eligibility rule
  applies ONLY within this family: a pyramid's pointed (non-regular,
  except at grade 2) lateral face is never offered for attachment,
  regardless of coincidental congruence, so pointed pyramids can't stick
  to each other — a shape's real base (always a regular polygon, every
  grade) is the only valid attach surface. Catalan solids' own irregular
  rhombi/kite faces are untouched by this rule and keep face-attaching
  exactly as already shipped.
- **Face-attach now skips straight to the filtered results.** Opening
  "Attach via face…" used to always land on the plain Home screen of
  family tiles — seeing the actual compatible shapes meant a manual
  extra step into Full Catalog. It now opens directly into the
  already-filtered Full Catalog instead.

## Structure

```
polyhedraverse/
  app/
    lib/
      polyhedra/
        core.ts          # family-agnostic infra: PolyhedronSpec, makeSpec, validateShape, triangulateFace, buildFaceConnectors
        deltahedra.ts    # the 8 deltahedra, verified against a convex hull
        platonic.ts      # cube + dodecahedron (the 2 Platonic solids not already deltahedra)
        archimedean.ts   # all 13 Archimedean solids
        johnson.ts       # all 92 Johnson solids -- complete
        catalan.ts       # all 13 of 13 Catalan solids -- complete
        rewrite.ts       # D10<->D12 vertex-matching (pure function, no three.js)
        fourD.ts         # dihedral-angle-defect classifier -- which shapes are 4D-Capable, and their real closures
        radialProjection.ts # the real 4D system: generic Wythoff/Coxeter reflection engine + dualize() -- 6 verified closures
        rcpBuild.ts      # RCP-C2B: bridges radialProjection.ts to real, placeable scene nodes, one cell/shell at a time
        duoprism.ts      # the 4D Prism (duoprism) construction -- always-exact, any shape, any chaining depth
        gradedPyramids.ts # apex-angle-driven pyramid construction, shared by every graded-pyramid base
        polygonPrismSolid.ts # shared n-agnostic right-prism builder -- quad-prisms (n=4) and the U-Hex spacer (n=6)
        miscellaneous/   # the "Miscellaneous" family (symbol: house glyph) -- irregular/graded add-ons
          index.ts         # combines every sub-group below into MISCELLANEOUS_ADDITIONS
          pyramids/        # graded pyramids -- 3 bases x 4 grades, done
          rvcmg-connectors-v2/         # the LIVE 9 RVCMG adapter pieces, on the new universal hex -- done
          rvcmg-connectors-v1-archived/ # the original 7 adapters + bare RD-Hemi, superseded but kept intact
          quad-prisms/     # 4 prism-like extenders (RD-/golden-rhombus, DI-/DH-kite) -- done
        index.ts         # combined POLYHEDRA / POLYHEDRON_IDS across every family
      rvcmg/             # Reversible Vertex-Coalescence Morphing Geometry -- see docs/RVCMG.md
        hemiRdInterface.ts # the ARCHIVED v1 hex joint, derived from POLYHEDRA.RHOMBIC_DODECAHEDRON
        universalHexInterface.ts # the LIVE v2 hex joint -- a plain regular hexagon, not derived from any solid
        coalesce.ts / separate.ts / splitVertex.ts # the divide / undo-one-divide / multiply primitives
        stateGraph.ts / morph.ts / verify.ts # traversal, smooth preview, Stage 7 transition verification
        adapters/          # every shape-specific adapter piece (both v1 and v2) + shared.ts (assignTargetAngles/fitTargetPolygon)
        split-demos/       # heptagon/octagon -- real proof of the "multiply" (split) direction
      assembly.ts        # the real {nodes, connections} graph + validation (vertex- and face-kind; old fold4 connections migrate to face on load); ASSEMBLY_STORAGE_KEY for localStorage save/load
      graph.ts           # subtree/cycle graph logic (pure, no three.js)
    components/
      ShapeViewer.tsx    # the whole Three.js scene: render, pick, attach/face-attach, twist, rewrite, delete, view modes
    page.tsx             # UI shell around ShapeViewer
  scripts/               # validate-*, verify-attach/twist/rewrite/graph/face-* -- run outside the browser
  tests/e2e/             # permanent Playwright suite (npm run test:e2e)
  data/
    johnson-solids-hard-constructions.json  # open, machine-readable construction recipes for the 8 non-closed-form Johnson solids
  docs/
    build-plan.md               # the build plan, with how each stage was verified
    construction-kit-spec.md    # the vertex-snapping design law + extensibility notes
    catalan-solids-spec.md      # scoping + design record for the Catalan solids family (13/13 done)
    prisms-antiprisms-spec.md   # scoping + design record for prisms/antiprisms (14/14 done)
    johnson-solids-remaining-spec.md  # alternative construction protocols -- all 4 groups (21 shapes) fixed, Johnson solids complete
    johnson-solids-constructions.md   # human-readable directory of those same 8 constructions, alongside data/johnson-solids-hard-constructions.json
    vercel-deployment-plan.md   # planned repo/Vercel layout once this deploys
  playwright.config.ts
```

## Design documents (`docs/`)

Read `docs/build-plan.md` first — the stage-by-stage build order, and,
for each stage, what was actually verified and how (geometry-math
scripts, direct API calls, and eventually a real-browser Playwright
pass) rather than assumed. `docs/construction-kit-spec.md` has the
underlying design law (vertex-snapping, not face-gluing; derive
connector data from vertices + edges, never hand-declare it
separately). `docs/catalan-solids-spec.md` scopes the Catalan solids — implementation
started (2 of 13 done) — including why they need genuinely new
infrastructure (non-uniform edge lengths, irregular-polygon face-attach
registration) rather than dropping into the existing "regular,
unit-edge" pipeline unchanged, and a real bug found while building the
first two (face-vertex-0 needing a consistent geometric role, not just
a consistent index). `docs/prisms-antiprisms-spec.md` scopes and records
the last piece of Zalgaller's classification that was missing from this
registry — prisms/antiprisms were used constantly as construction
detail inside Johnson-solid builds but never registered as their own
shapes; unlike Catalan solids this needed no new infrastructure, just a
scope decision (the family is genuinely infinite, with no natural n
cutoff the way Catalan solids' 13 or Johnson's 92 have one) — capped at
n=10, 14 shapes, all now in the registry.
`docs/johnson-solids-remaining-spec.md` diagnosed the 21 Johnson solids
that were originally missing, grouped simplest-first by how well the
failure was understood, and **all 4 groups are now done**: Group 1
(J66-J71, all 6) shared one root cause (a specific cupola registration
detail, confirmed via external research, not guessed); Group 2 (J64)
needed an entirely different construction than what was tried (a
tetrahedron on a triangle, not a pyramid on a pentagon); Group 3 (J79)
turned out to be the same class of mistake as Group 2 — the "fix"
this doc first proposed (trace the transform, assuming the plan was
already right) was itself built on a misreading of the same external
source, corrected in batch 11 once re-read precisely; Group 4 (J85-
J92, batch 12) turned out not to need the "genuinely new
numerical-solver tooling" originally assumed — 6 of the 8 needed only
`numpy.roots()` (already installed) on a published polynomial, the
other 2 pure golden-ratio closed forms. **All 92 Johnson solids are
now in this registry.**
`docs/johnson-solids-constructions.md` distills all 16 Groups 1-4
shapes' construction recipes into a standalone reference (base
shape(s), defining polynomial or target-face rule, key parameter, and
verification method for each), alongside a machine-readable open-data
companion, `data/johnson-solids-hard-constructions.json` — every field
in it cross-checked against this registry's own live `POLYHEDRA` data
before being recorded, not transcribed from the narrative postmortems
by hand.
`docs/radial-cell-projection.md` is the write-up of how the app
implements the classical 4D reflection construction (from a proposal by
James Baker; the mathematics is Coxeter's and Schlegel's), with a full verification
record for the two closures found after the original four (the 5-cell
and 600-cell) and the shell/BFS bookkeeping RCP-C2B's click-to-build
feature hangs off — editorial additions, not a rewrite of the original.
`docs/vercel-deployment-plan.md` records the intended repo/Vercel
layout for when this deploys alongside Rhombiverse, and the persistence
architecture's own history (a local-file API route that worked in dev
but never in production, replaced by browser localStorage).
`docs/RVCMG.md` is the normative RVCMG spec (author James Baker),
updated in place once the described system was actually built.
`docs/rvcmg-adapter-pieces-spec.md` is the working record of building
it: the original hemi-RD hex interface, all 7 v1 adapter pieces plus
the bare RD-Hemi dome as real, closed, placeable 3D solids, the
heptagon/octagon split-direction proofs, the Miscellaneous family
(graded pyramids + RVCMG connectors), the two face-attach UX/
eligibility fixes above, and — prepended at the top — the full v2
redesign record: why the original hex was replaced, the new sizing
derivation, and the quad-prism extenders built alongside it.

Production hardening: `next.config.ts` sets the standard security
headers (HSTS, CSP, X-Content-Type-Options, X-Frame-Options,
Referrer-Policy, Permissions-Policy) — tailored to what this app
actually does (checked directly, not copied from a generic template):
no `eval`/Web Workers anywhere in `app/`, so the CSP omits
`unsafe-eval`/`worker-src` entirely rather than including them "just in
case."

## Contributing

Humans and AI coding agents are both welcome to open PRs — see
`CONTRIBUTING.md` for how this project actually works and
`CODE_OF_CONDUCT.md` for the community standard.

## Running locally

```
npm install
npm run dev
```

Then open `http://localhost:3000`. `npm run lint`, `npx tsc --noEmit`,
and the `verify:*` scripts (`npm run verify:attach`, etc.) all run
without a browser; `npm run test:e2e` needs Chromium
(`npx playwright install --with-deps chromium`) on whatever machine
runs it.

The primary dev machine is a Raspberry Pi (arm64) — fine for everything
above, but Playwright's Chromium download is slow and occasionally
stalls there. Where a second machine is available (`dicto-node` on the
LAN, reachable over SSH with Chromium already installed), it's worth
using for `npm run test:e2e` and other browser-dependent runs rather
than waiting on the Pi.

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

## What you can do

- **165 shapes in 11 families** — Deltahedra, Platonic, Archimedean,
  Johnson, Catalan, prisms, antiprisms, the 4D-capable seeds,
  Parallelohedra (the five shapes that fill space alone), Space-Filling
  Pairs (seven pairs that fill space together, such as the octet truss)
  and Miscellaneous (graded pyramids, RVCMG connector pieces, prism
  extenders, the rhombohedron and the elongated dodecahedron). Browse them
  on the 3D shape wheel or in the Full Catalog, which also shows the **4
  Kepler–Poinsot star polyhedra** to look at.
- **Build by attaching** — join shapes face to face or vertex to vertex,
  with twist; a running name describes what you've built, and recognises
  structures such as the Tetrahedral Star, the Stella Octangula and the
  Pyrochlore Cell.
- **Build in 4D: RCP-C2B** (Radial Cell Projection, Click-to-Build) —
  select a 4D-capable shape and construct a real regular 4-polytope one 3D
  cell at a time: the **5-cell, tesseract, 16-cell, 24-cell, 120-cell or
  600-cell** (the 600-cell also vertex-first, closing an icosahedron of 20
  tetrahedra around one corner). **Open / Closed** switches each cell
  between its ordinary shape and its real warped place in the closed
  4-polytope; **Shell colours** colour each ring of cells; the
  **RCP-Coordinates** overlay shows the points each cell is generated
  from, and where the next click will add one.
- **Views** — Colour, Translucent and Skeleton; the camera fits every new
  shape.
- **Undo** any change (tap ↶, or hold to scrub back), and **Save**,
  **Export JSON** and **Import JSON** under File.
- **User Guide** in 7 languages (English, 日本語, Español, Français, 한국어,
  中文, Русский) at [/guide](https://polyhedraverse.vercel.app/guide), and the
  whole interface in the same 7 languages.
- **What's New** lists every change, newest first.

Its twin, **[Rhombiverse](https://rhombiverse.vercel.app)**, builds on
lattices instead: tilings, crystal lattices, 4D worlds and 5D/6D
quasicrystals, from 2D to 6D.

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

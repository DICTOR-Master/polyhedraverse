/**
 * Hand-curated, user-facing changelog -- NOT auto-generated from git log.
 * Commit messages are written for other developers (internal batch names,
 * "Stage N", lint/CI plumbing); this is written for whoever's using the
 * app. Newest date first, newest entry within a date first. Add a new
 * entry (or a new day's group) here as work lands -- there's no build
 * step or generator to keep in sync, this file IS the source of truth
 * ChangelogOverlay renders directly.
 */

export interface ChangelogDay {
  date: string; // e.g. '2026-09-09'
  entries: string[];
}

export const CHANGELOG: ChangelogDay[] = [
  {
    date: '2026-09-23',
    entries: [
      'Added 2 real solids to the Miscellaneous family: a genuine Rhombohedron (one of the 4 congruent pieces a Rhombic Dodecahedron always splits into along its own 4 body-diagonal directions) and the Elongated Dodecahedron (the 4th of the 5 real shapes that tile space by translation alone — 8 ordinary rhombic faces plus 4 real hexagonal ones). Both ported over from Rhombiverse (this project\'s twin), where they already exist as real lattice pieces; every face on both is a genuine attach port, and both are built at Rhombic Dodecahedron\'s own real scale so they attach flush to a real one, not just similarly.',
      'Fixed the header and welcome-screen shape counts, which had gone stale again since the last time this exact thing was fixed (see 2026-09-17 below) — now computed directly from the registry instead of hand-typed, so this can\'t happen a third time.',
    ],
  },
  {
    date: '2026-09-17',
    entries: [
      'Redesigned RVCMG\'s shared connector joint: the original hex interface was up to 1.73x too big to fit inside its own tightest target (a unit-edge triangle), so it\'s been replaced with a smaller, fully regular hexagon sized to balance the triangle, square, and pentagon connectors instead of favoring the tightest one. 9 pieces now build on it — the original 7 plus two new ones: a rhombus piece that can now attach directly to a real Rhombic Dodecahedron face (no intermediary dome needed), and a plain hex-to-hex spacer for lengthening a chain of connectors. The original 7-piece set (plus its bare dome piece) is kept intact for reference but no longer appears in the catalog.',
      'Added 4 prism-like connector pieces (RD-rhombus, golden-rhombus, DI-kite, DH-kite): a real Catalan-solid face extruded into a rectangular- or square-sided prism. Most faces on these — and on the new hex spacer above — are now real attach points on every side, not just the two ends, so a cube or another matching piece can attach sideways for branching structures. (A kite piece\'s own 2 non-square side faces stay off-limits — a real placement limitation for that specific shape, found while wiring this up, not yet fixed.)',
      'Fixed the header\'s shape count, which had quietly gone stale: 162 shapes across 8 families, not 137 across 7 — the "Miscellaneous" family (graded pyramids + RVCMG connectors + the new prism pieces above) wasn\'t being counted.',
      'Hardened the deployed site\'s security headers (HSTS, Content-Security-Policy, and friends) — a behind-the-scenes change with no visible effect on using the app.',
    ],
  },
  {
    date: '2026-09-16',
    entries: [
      'Added a running assembly name: build up an ordinary 3D structure and see it described live — the shape you started with, plus every piece attached to it grouped by type and how it\'s joined. A small, hand-curated set of recognized builds (starting with "Tetrahedral Star" — a tetrahedron with a sharp pyramid on every face) get their own name; everything else gets an honest, always-accurate description.',
      'Added camera auto-fit: placing or loading a shape now frames it automatically, instead of leaving small structures looking tiny and distant.',
      'Decluttered the RCP-C2B panel: a single "3D / 4D" toggle now switches a 4D-capable shape\'s controls between its ordinary options (Delete, Attach via face/Duoprism) and RCP-C2B\'s build controls, instead of showing every control for both at once. The existing shell-1 rendering toggle is now labeled "Open / Closed" to avoid clashing with this new main toggle.',
      'Fixed: clicking a different face of an already-selected shape now switches to that face, instead of sometimes deselecting the shape entirely.',
      'Added RCP-C2B (Radial Cell Projection, click-to-build): construct a real regular 4-polytope — a tesseract, 24-cell, 120-cell, 5-cell, or 16-cell — one cell at a time, directly in the main scene. Select any 4D-Capable shape, build its first ring of cells one click at a time, then add further rings a whole shell per click, using the same genuine Wythoff/Coxeter reflection construction (not an animation or approximation) that already powered the reference-only 4D preview.',
      'Added a one-click 3D / 4D toggle to RCP-C2B: switch every cell you\'ve placed between an ordinary undistorted copy of the seed shape and its real, warped position inside the closed 4-polytope — watch the actual difference between a 3-dimensional and a 4-dimensional object change in front of you. The chosen view is saved with the rest of your scene.',
      'The tetrahedron now unlocks its extra real 4D closures in RCP-C2B — the 5-cell and the 600-cell, alongside the already-known 16-cell — picked from a small menu when you start building. The 600-cell is rendered from its own true geometry: the 120-cell\'s perfect vertex-transitivity means every one of its 600 tetrahedral cells is mathematically equivalent, so rather than approximate one as artificially "tidy," RCP-C2B shows its real, exact shape — a genuinely faithful reconstruction of the 4D structure, not a simplified stand-in for it.',
      'Added an "RCP-Coordinates" overlay to RCP-C2B: reveals each built cell\'s own real generating coordinate, marked with a small cross (like a point on an architect\'s drawing) and joined to the shape\'s center by a purple laser beam — the literal point the underlying 4D construction generates that cell from, made visible for the first time. On the 600-cell, a second color also marks its dual points: each of its tetrahedra\'s corners is the true center of a dodecahedral cell from the original 120-cell it was built from, and now you can see exactly where.',
      '"RCP-Coordinates" also previews one step ahead: a dimmer cross and beam show exactly where your next click will add a cell, right up to the closure\'s real limit — so you always know where construction is headed next, not just where it\'s already been.',
      'Refined "RCP-Coordinates" sizing: markers and connecting lines now scale consistently off each shape\'s own real geometry, so every closure — including much smaller ones like the tetrahedron — reads at the same proportions as the largest.',
      '3D is now the default starting view for a new RCP-C2B build (previously 4D) — the ordinary, undistorted fan of cells reads more clearly as a starting point; 4D stays one click away throughout.',
      'A running cell count ("Cells: X / N") is now always visible while building, across every shape — no more losing track of progress mid-build.',
      'Shell-1 cells can now be undone one at a time ("Remove last cell"), not just as a whole shell — useful for correcting the last click without restarting.',
      'Each shell of an RCP-C2B build now renders progressively more translucent than the one before it, so the original seed cell stays visible through however many outer shells you\'ve built — previously, several closures (the octahedron\'s 24-cell especially) piled new cells almost exactly on top of existing ones, making it look like nothing was happening.',
      'The seed/root cell of an RCP-C2B build now renders in a distinct highlight color, so it stays identifiable against the constructed cells around it.',
      'Fixed: switching a build\'s view to 3D while a second shell already existed could leave that shell visually disconnected from the first (the second shell is permanently anchored to the first shell\'s true 4D position) — the 3D/4D toggle now locks once a second shell exists, staying visible but disabled with an explanation, rather than producing an inconsistent scene.',
      'Fixed: vertex-attach and face-attach hover/click no longer trigger on an RCP-C2B cell shown in its real 4D (warped) form — with several such cells overlapping, this previously made hovering almost anywhere on the cluster light up an unrelated vertex or face.',
      'Fixed: rotating the camera around a selected shape could occasionally clear the selection (and with it, every RCP-C2B control) depending on exactly where the drag ended — orbiting the view now always leaves your selection untouched.',
      'Save/load now runs entirely in your own browser (no server round-trip) — your assembly is private to your device and restores instantly on reload.',
      'Adjusted the Square-to-RD-H connector piece so its longest edges line up parallel with the square face it adapts to.',
    ],
  },
  {
    date: '2026-09-15',
    entries: [
      'Added RVCMG (Reversible Vertex-Coalescence Morphing Geometry): a universal RD-hemi hexagonal joint plus 7 shape-specific physical adapter pieces (triangle, square, pentagon, golden-rhombus, both Catalan kite shapes, and regular-hexagon), each built by a real, verified vertex-coalescence morph from the shared hex interface -- reversible both ways, confirmed by building real heptagon/octagon shapes via the inverse "split" operation, not just asserting the divide direction has an inverse. Unlike every other family in this registry, these 7 connector shapes have no external precedent -- they are an original construction of this project, not a reproduction of a published classification.',
      'Added a new "Miscellaneous" registry family for irregular/graded add-ons, starting with graded pyramids: every regular-pyramid-capable base (triangular, square, pentagonal) now has 4 height variants (low/standard/tall/sharp) alongside the existing standard one, each a real registered shape.',
      'Face-attach eligibility, within the Miscellaneous family only: a graded pyramid\'s pointed (non-regular) lateral face is never offered for attachment, so pointed pyramids can\'t stick to each other -- its regular base remains fully attachable, and every other family\'s face-attach behavior (including Catalan solids\' own irregular rhombi/kite faces) is unaffected.',
      'Face-attach now skips straight to the filtered Full Catalog instead of landing on the plain Home screen first -- seeing what a face can actually attach to no longer takes an extra manual step.',
    ],
  },
  {
    date: '2026-09-11',
    entries: [
      'Added a real 4D extension: 4 shapes (tetrahedron, octahedron, cube, dodecahedron) are recognized as valid "cells" of a convex 4-polytope and gathered into a new 4D-Capable family, marked with a distinct gold "4D" badge on their cards.',
      'Built the real 4D system: each of those 4 shapes now "Extend[s] into 4D" into its actual regular 4-polytope (tesseract, 16-cell, 24-cell, or 120-cell) via a genuine 4D construction (repeated hyperplane reflection, the same method used to define these shapes mathematically), shown as a full reference preview on its detail card. This replaces an earlier "Attach via 4D fold…" attempt that could only ever handle a single attached pair before the math broke down for denser clusters — that entry point has been removed.',
      'Added the 4D Prism (duoprism) construction — two identical copies of a shape connected by a real 3D "wall" cell per face, exactly how a tesseract is a cube extruded into a 4th dimension. Exact for any shape, at any chaining depth, including multiple duoprism attaches on different faces of the same piece (they now correctly share one far copy, not a separate one each). The 4 gold-badge shapes get a real, scene-buildable "Attach via Duoprism…" option that chains into groups; every other shape gets a reference-only preview.',
      'Every shape\'s detail card now offers one "View 4D" button, not a choice between two — it automatically shows the real 4D extension for the 4 gold-badge shapes, or the duoprism preview for everything else.',
    ],
  },
  {
    date: '2026-09-10',
    entries: [
      'Gave the 4 star polyhedra a real full-screen viewer (matching the main Scene, starfield included) instead of a cramped 300px box crowded next to the stats/buttons.',
      'Face-attach\'s compatible-shape filtering now also applies to ShapeBrowser\'s Home and Favorites tabs, not just the wheel and Search — every screen now hides shapes/families that could never actually attach.',
      'Fixed two real corner-HUD collisions: the star-polyhedra detail drawer\'s Favorite/Compare buttons and ShapeBrowser\'s bottom-nav Favorites tab were both getting silently covered by the always-on-top corner medallion.',
      'Shapes belonging to more than one family now show a small "+N" badge right on their card, not just a hover-only tooltip — much easier to notice at a glance (and works on touch, where hover never did).',
      'Added a "Search" face to the wheel, jumping straight to the browser\'s Search tab (name search + face-shape filters) as an alternative to browsing family by family.',
      'The wheel can now jump straight to a specific section of Full Catalog instead of always drilling through per-shape pages: a new "Star Polyhedra" face for those 4 solids, and a "View all" face on every large family (Archimedean, Johnson, Catalan) once it spans more than one wheel page.',
      'Added a small always-visible "menu" button (bottom-left) that opens the shape wheel from anywhere, alongside the existing corner HUD medallion.',
      'Star polyhedra now render Solid and Translucent, not just Wireframe — a real winding-number-correct triangulation fills even the self-intersecting pentagram faces (small/great stellated dodecahedron) correctly, with a mode toggle right on the viewer.',
      'Added a real 3D starfield to the main viewer, plus a starry background behind the page header.',
    ],
  },
  {
    date: '2026-09-09',
    entries: [
      'Added the 4 Kepler-Poinsot star polyhedra (great dodecahedron, small stellated dodecahedron, great icosahedron, great stellated dodecahedron) as a browsable-only reference family in Full Catalog, with real geometry — every construction verified against the published Schläfli/vertex/edge/face/density table, not eyeballed — plus a real drag-to-rotate 3D wireframe viewer in the shape detail drawer.',
      'Full Catalog is now a real scrollable page grouped into family sections, not another layer of wheel pagination — selecting it from the wheel exits the wheel immediately.',
      'Added a one-level Undo button for the scene.',
      'Added an "Export JSON" button to download the current assembly.',
      'Added a dismiss (✕) button to the bottom instruction pill.',
      'Added a "Previous" wheel face (mirroring "More") so paging backward through a large family no longer means cycling through the whole rest of it.',
      'Wheel: fixed a real iPad bug — long-pressing a wheel label triggered the browser’s native copy/select menu instead of selecting the face.',
      'Wheel: every family/shape symbol now sits inside a consistent circular badge, so faces read as a uniform size regardless of which glyph is inside.',
      'Wheel: Platonic now uses a pentagon symbol (a direct count mnemonic — there are five Platonic solids); Johnson took over the diamond it displaced.',
      'Wheel: the app’s language setting now actually changes the wheel’s own chrome text (header, drag hint, Back/Close), not just the ShapeBrowser’s.',
      '"Attach via face…" button recolored to amber/black to match the free-vertex highlight color.',
      'Filled the wheel’s previously half-empty first view with antipodal clones of each family, pairing true duals (Archimedean/Catalan, Prisms/Antiprisms) opposite each other.',
      'Fixed a real per-face hover highlight (previously the whole shape glowed, not just the hovered face).',
      'Fixed z-fighting on internal touching faces after an attach.',
      'Fixed the corner HUD obscuring the Confirm button on attach; switched its render loop to render-on-demand.',
      'Fixed touch/mobile: drag-to-rotate no longer scrolls the page, tooltip text no longer hides under your finger, and iOS Safari’s unreliable drag-delta reporting was replaced with manual tracking.',
      'Wired real actions into the corner HUD: Wheel, Browser, View mode, Save, About, Language.',
      'Added a first-visit welcome overlay, with a cross-link to Rhombiverse (this project’s twin).',
      'Added the karaoke-style ShapeBrowser: search, family/face-shape/face-count facets, favorites, compare, and a scene view.',
      'Completed the full 137-shape registry: added prisms & antiprisms, the last 30 Johnson solids, and the last 11 Catalan solids — all 7 families are now complete.',
      'Deployed to Vercel, with GitHub auto-deploy wired up for every push to main.',
    ],
  },
  {
    date: '2026-09-08',
    entries: [
      'Renamed the project (Deltaverse → Deltahedraverse → Polyhedraverse) and added its logo/branding.',
      'Added the PolyhedralWheel 3D shape picker and the corner HUD medallion.',
      'Built out the geometric registry in stages: all 5 Platonic solids, all 13 Archimedean solids, most of the Johnson solids, and the first 2 Catalan solids.',
      'Added face-to-face attach (face-snap mode) and a view-mode toggle (solid / translucent / inside view).',
      'Built the app from scratch: vertex-attach assembly graph, a D10↔D12 rewrite rule, persistence via an API route, and a permanent Playwright test suite.',
    ],
  },
];

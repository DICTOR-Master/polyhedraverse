# Polyhedraverse User Guide

Polyhedraverse and its twin, [Rhombiverse](https://rhombiverse.vercel.app), are two ways of looking at the same geometry. Rhombiverse is the **landscape**: the lattices themselves, stretching out in every direction. Polyhedraverse is the **portrait gallery**: the shapes that live in those lattices, one at a time, up close. A third sibling, [Kaleidohedra](https://kaleidohedra.vercel.app), **moves the landscape**: lattices you can shear and slide, with every piece moving with them.

Here there is no lattice. You start with one shape and connect more to it, vertex to vertex or face to face, and the structure comes from the shapes themselves. Some shapes can also be built out into their real 4D polytope, one cell at a time.

The first part of this guide walks through common tasks. The second part lists every control.

## Getting started

### Choose a shape

1. Press **ENTER** on the welcome screen.
2. Tap **Start over with…** (or ◈ at the top right, or press Tab or Space) to open the shape browser.
3. Tap a family on **Home**, search for a shape, or tap **Full Catalog** at the top of the browser to see every shape, family by family. Tap a shape to see its details, then **Add to Scene**.
4. It replaces whatever is on screen, so you start fresh.

### Move the camera

- **Rotate:** drag with one finger, or drag with the left mouse button.
- **Zoom:** pinch, or use the scroll wheel.

### Attach a shape to a face

1. Tap the body of a shape to select it. The face you tapped is selected too.
2. Tap **Attach via face…**. The picker only offers shapes that have a face of the same size.
3. The new shape appears but isn't fixed yet. Drag to turn it, then tap **Confirm**, or **Cancel** (or press Esc).

Two shapes joined face to face share that face exactly, a cube on a cube for example.

Dragging steps through every way the new shape can sit on that face, counting them as it goes ("registration 3/8"): each turn of the face and, when the new shape has faces of that size that aren't alike, each of those faces too, so a piece with uneven faces can always be set the way you want. For example, to build DICTO's leaning prism, start with the square-faced block, attach the all-rhombus block to one of its 72° rhombi and drag until the hexagon faces line up flat, then attach a second square-faced block the same way.

The best fits come first: a placement that sits flush on two or three faces of the pieces already built (slotting into a corner) is offered before one that touches only the face you chose, and the counter shows it ("registration 1/4 · 3 faces"). Placements that would cut into a built piece aren't offered. For space-fillers, a copy attached to its own kind starts in the position that continues the tiling. Faces that end up flush against a neighbour count as used, so they aren't offered again.

### Attach a shape at a vertex

1. Tap a **highlighted vertex**. Only free vertices light up. Shapes that still have room to build from glow.
2. Tap **Attach via vertex…** and choose any shape. A vertex joint accepts any shape.
3. Turn it and tap **Confirm**, the same as a face attach.

### Undo and delete

- **Undo** (↶, top bar) takes back your last change of any kind: an attach, a delete, a Transform, a 4D build step, Start over or an import. Tap it again to keep stepping back, or hold it to jump back several steps at once.
- Select a shape and tap **Delete** to remove it, along with anything built on top of it.

## Browsing the catalogue

The **shape browser** (◈ at the top right) is the gallery; **Full Catalog** at its top shows every shape, family by family. It has these tabs:

- **Home:** the families, plus the shapes you've viewed recently and your favourites.
- **Search:** search by name (try "J12" or "gyrobicupola"), or filter by family, face shape and face count.
- **Scene:** what you've built so far.
- **Favourites:** shapes you've starred.

Tap any shape to see its details: vertices, edges, faces and connectors. From there you can:

- **Add to Scene:** start building with it.
- **Favourite:** star it.
- **Add to Compare:** put up to four shapes side by side.
- **View 4D:** on 4D-capable shapes, show the 4D polytope it extends into.
- **Net:** see the shape unfolded flat, fold it up with the slider or **Fold up**, and **Download PDF (A4)** to print it: cut the solid lines, fold the dashed ones, glue each number to its match. **Glue tabs** adds one tab to each glued pair. Star shapes have no net.

Shapes in **3D+ Bridges** also say, in their details, which higher polytope they bridge to (for example, the rhombic dodecahedron is the shadow of the tesseract and the 24-cell).

### The families

| Family | What's in it |
|---|---|
| Deltahedra | The 8 convex solids made only of equilateral triangles |
| Platonic | The 5 regular solids |
| Archimedean | The 13 semi-regular solids |
| Johnson | The 92 convex solids with regular faces |
| Catalan | The duals of the Archimedean solids |
| Stellations | Pieces for the Platonic and Catalan solids, each fitting one face: flat (the pyramids join into a new convex solid, such as the cube from a tetrahedron), then each stellation the solid really has, up to its third. A piece on every face builds that stellation exactly, e.g. the dodecahedron's small stellated, great and great stellated dodecahedra |
| Prisms, Antiprisms | Two polygons joined by a band of squares or triangles |
| 4D Polytopes | The six regular 4D polytopes (5-, 8-, 16-, 24-, 120- and 600-cell) by symmetry; open one and Build places its seed cell and starts building it cell by cell |
| Parallelohedra | Shapes that fill space by translation alone: Fedorov's five, then variants (the rhombohedron, DICTO's leaning hexagonal prism and its two blocks, and DICTO's skewed rhombic dodecahedron and its flattened rhombohedron, found in Zometool), then Kaleidohedra verified (the Bain stretch's equal-edge cells: the Bain rhombic dodecahedron, the regular-hexagon elongated dodecahedron, already known and reached independently by DICTO, and DICTO's Bain elongated dodecahedron), then the Kaleidohedra Regular 9 (every space-filler with equal edges whose faces are only squares, regular hexagons and 60° rhombi: the cube, 60° rhombohedron, leaning square prism, 60° rhombic prism, hexagonal prism, 60° leaning hexagonal prism, Bain rhombic dodecahedron, regular-hexagon elongated dodecahedron and truncated octahedron) |
| Space-Filling Pairs | Two shapes that fill space together, including DICTO's DICTO Jewel with the stella octangula (from Kaleidohedra), whose faces attach to each other and whose rhombi match the Penrose thick rhombus, and the Sunstar Lattice pair: the Dogstar (the hole dodecahedra leave in their densest packing, an 8-pointed star with only golden edges, volume φ/2) and a dodecahedron seamed where Dogstars meet it, so 6 Dogstars attach to its faces to make a Sunstar |
| Aperiodic Sets | Two aperiodic pairs: the prolate and oblate golden rhombohedra (the 3D Penrose tiling) and the thick and thin Penrose rhombus prisms (the layered 5D tiling) |
| 3D+ Bridges | Shapes that are a shadow, slice, cell or corner of a higher-dimensional polytope; each one's details say which |
| Miscellaneous | Graded pyramids, connector pieces and prism extenders |

Star polyhedra are also listed. You can't attach them, because their faces pass through each other, but three of them you can build: a dodecahedron with a **Stellations** piece on every face makes the small stellated dodecahedron (piece 2), the great dodecahedron (3) or the great stellated dodecahedron (4).

## Looking at your build

Tap **View** to cycle through three modes:

- **Solid:** ordinary faces.
- **Translucent:** see-through faces.
- **Skeleton:** only the edges, so you can see inside nested structures.

Tap **🎨** (Colour) to choose how pieces are coloured: **Green** (every piece green, the default), **Family** (each piece in its family's colour, with a key in the menu) or **Pick** (choose from 14 colours; new pieces take that colour, and **Paint** recolours a selected piece). Picked colours are saved with the build.

When a group of pieces closes into a complete cage, **Closed cage!** appears. Some well-known arrangements get their own name, such as the Stella Octangula. Tap **i** next to the name for a description.

## Building in 4D

Some shapes are the building blocks of a regular 4D polytope, for example the cube (tesseract) or the dodecahedron (120-cell). When you select one of these shapes, a **3D / 4D** switch appears.

1. Select the shape and tap **4D**. If it can close into more than one polytope, choose which one.
2. Tap **Add next cell** to add the cells around the first one, one at a time. **Remove last cell** takes one back.
3. When the first shell is complete, **Build next shell** adds a whole layer at once. **Remove last shell** takes one away.
4. The counter shows how many cells you've built out of the total.

Things to look at while you build:

- **Open / Closed:** Open shows every cell as an ordinary, undistorted copy, with the real gap between them visible. Closed shows each cell bent into its true place in the 4D structure. This switch locks once you build a second shell, because that shell depends on the first one being closed.
- **RCP-Coordinates:** shows the point each cell is generated from as a purple dot.
- **Shell colours:** colours each shell differently so neighbouring shells stand out.

Tap **3D** to get the ordinary controls back. Your 4D build is kept.

Some shapes can also **Attach via Duoprism…**, which joins an exact copy through a prism, the 4D Prism construction.

## Golden rhombohedra

While your build is all golden rhombohedra, a bar shows how many pieces fit the true 3D Penrose tiling. **Next safe piece** adds one that keeps the build inside that tiling, so it can never dead-end. **Next step** builds the chosen golden shape (Bilinski dodecahedron, rhombic icosahedron or rhombic triacontahedron) one piece at a time. **File** also loads each finished golden build, to take apart or extend. Undo takes back each step.

## Saving your work

- **Save:** stores your build in this browser. It comes back when you reopen the site on the same device and browser.
- **File → Export JSON:** downloads your build as a file, to keep a backup or move it to another device.
- **File → Import JSON…:** opens a file you exported earlier. It replaces what's on screen, and **Undo** takes it back.
- **What's New:** recent changes.
- **Language:** use the 🌐 picker at the top of the welcome screen or this guide, or tap 🌐 at the top right to step to the next language. There are 7 languages, and all of these stay in step.

---

# Control reference

## Top bar

| Control | What it does |
|---|---|
| i | Description of the named assembly |
| What's New | Recent changes |
| View | Cycles Solid, Translucent and Skeleton |
| 🎨 Colour | Green, Family or Pick colours; in Pick, the 14 colours |
| ↶ Undo | Takes back your last change of any kind. Tap again to step further back; hold to jump back several steps |
| Save | Stores the build in this browser |
| File ▾ | Export JSON, Import JSON…, and the finished golden builds |
| Start over with… | Opens the shape browser to start again with one shape (Tab or Space) |

## Context bar

These controls change with what you've selected.

| When | Controls |
|---|---|
| A shape is selected | Transform to… (when the shape has a related form), Delete, Attach via face…, Attach via Duoprism… |
| A vertex is selected | Attach via vertex… |
| A 4D-capable shape is selected | 3D / 4D, and in 4D: Add next cell, Remove last cell, Build next shell, Remove last shell, Open / Closed, RCP-Coordinates, Shell colours |
| A new shape is waiting to be placed | Confirm, Cancel (Esc) |

## Tools (top right)

A column of buttons at the top right of the 3D view.

| Symbol | Control |
|---|---|
| ◈ | Open or close the shape browser |
| 3D / ∥ / ISO | Projection: Perspective, Parallel (orthographic) or Isometric (tap to cycle) |
| ℹ | About (reopens the welcome screen) |
| 🌐 | Switch to the next language (shows the current one's code) |

## Keyboard and mouse

| Input | Action |
|---|---|
| Click a shape | Select it, along with the face you clicked |
| Click a vertex | Select it for vertex attach |
| Left-drag | Rotate the camera, or turn a new shape before confirming |
| Scroll wheel | Zoom |
| Tab or Space | Open the shape browser (Start over with…) |
| Esc | Cancel placing a shape |

## Touch

| Gesture | Action |
|---|---|
| Tap a vertex or shape | Select it |
| One-finger drag | Rotate the camera, or turn a new shape |
| Pinch | Zoom |

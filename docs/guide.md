# Polyhedraverse User Guide

Polyhedraverse and its twin, [Rhombiverse](https://rhombiverse.vercel.app), are two ways of looking at the same geometry. Rhombiverse is the **landscape**: the lattices themselves, stretching out in every direction. Polyhedraverse is the **portrait gallery**: the shapes that live in those lattices, one at a time, up close.

Here there is no lattice. You start with one shape and connect more to it, vertex to vertex or face to face, and the structure comes from the shapes themselves. Some shapes can also be built out into their real 4D polytope, one cell at a time.

The first part of this guide walks through common tasks. The second part lists every control.

## Getting started

### Choose a shape

1. Press **ENTER** on the welcome screen.
2. Press **Tab** or **Space**, or tap the **shape wheel** button, to open the shape wheel.
3. The wheel is a dodecahedron. Each face is a family of shapes. Drag to turn it (or use the arrow keys), and tap a face to open that family. Hover over a face, or press and hold it, to see its name. Inside a family, the **Home** face (an H in a hexagon) takes you back to the families.
4. Tap a shape. It replaces whatever is on screen, so you start fresh.

**Spin the Wheel** picks a family at random.

### Move the camera

- **Rotate:** drag with one finger, or drag with the left mouse button.
- **Zoom:** pinch, or use the scroll wheel.

### Attach a shape to a face

1. Tap the body of a shape to select it. The face you tapped is selected too.
2. Tap **Attach via face…**. The picker only offers shapes that have a face of the same size.
3. The new shape appears but isn't fixed yet. Drag to turn it, then tap **Confirm**, or **Cancel** (or press Esc).

Two shapes joined face to face share that face exactly, a cube on a cube for example.

### Attach a shape at a vertex

1. Tap a **highlighted vertex**. Only free vertices light up. Shapes that still have room to build from glow.
2. Tap **Attach via vertex…** and choose any shape. A vertex joint accepts any shape.
3. Turn it and tap **Confirm**, the same as a face attach.

### Undo and delete

- **Undo** (↶, top bar) takes back your last change of any kind: an attach, a delete, a Transform, a 4D build step, Start over or an import. Tap it again to keep stepping back, or hold it to jump back several steps at once.
- Select a shape and tap **Delete** to remove it, along with anything built on top of it.

## Browsing the catalogue

The **shape browser** (◈ on the corner wheel) is the gallery. It has these tabs:

- **Home:** the families, plus the shapes you've viewed recently and your favourites.
- **Search:** search by name (try "J12" or "gyrobicupola"), or filter by family, face shape and face count.
- **Scene:** what you've built so far.
- **Favourites:** shapes you've starred.

Tap any shape to see its details: vertices, edges, faces and connectors. From there you can:

- **Add to Scene:** start building with it.
- **Favourite:** star it.
- **Add to Compare:** put up to four shapes side by side.
- **View 4D:** on 4D-capable shapes, show the 4D polytope it extends into.

### The families

| Family | What's in it |
|---|---|
| Deltahedra | The 8 convex solids made only of equilateral triangles |
| Platonic | The 5 regular solids |
| Archimedean | The 13 semi-regular solids |
| Johnson | The 92 convex solids with regular faces |
| Catalan | The duals of the Archimedean solids |
| Prisms, Antiprisms | Two polygons joined by a band of squares or triangles |
| 4D-Capable | Shapes that close up into a regular 4D polytope |
| Parallelohedra | Shapes that fill space by translation alone |
| Space-Filling Pairs | Two shapes that fill space together |
| Miscellaneous | Graded pyramids, connector pieces and prism extenders |

Star polyhedra are also listed. They are for reference only and can't be built with, because their faces pass through each other.

## Looking at your build

Tap **View** to cycle through three modes:

- **Solid:** ordinary faces.
- **Translucent:** see-through faces.
- **Skeleton:** only the edges, so you can see inside nested structures.

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

## Saving your work

- **Save:** stores your build in this browser. It comes back when you reopen the site on the same device and browser.
- **File → Export JSON:** downloads your build as a file, to keep a backup or move it to another device.
- **File → Import JSON…:** opens a file you exported earlier. It replaces what's on screen, and **Undo** takes it back.
- **What's New:** recent changes.
- **Language:** use the 🌐 picker at the top of the welcome screen or this guide, or tap the 🌐 face on the corner wheel to step to the next language. There are 7 languages, and all of these stay in step.

---

# Control reference

## Top bar

| Control | What it does |
|---|---|
| i | Description of the named assembly |
| What's New | Recent changes |
| View | Cycles Solid, Translucent and Skeleton |
| ↶ Undo | Takes back your last change of any kind. Tap again to step further back; hold to jump back several steps |
| Save | Stores the build in this browser |
| File ▾ | Export JSON, Import JSON… |

## Context bar

These controls change with what you've selected.

| When | Controls |
|---|---|
| A shape is selected | Transform to… (when the shape has a related form), Delete, Attach via face…, Attach via Duoprism… |
| A vertex is selected | Attach via vertex… |
| A 4D-capable shape is selected | 3D / 4D, and in 4D: Add next cell, Remove last cell, Build next shell, Remove last shell, Open / Closed, RCP-Coordinates, Shell colours |
| A new shape is waiting to be placed | Confirm, Cancel (Esc) |

## Corner wheel

The small dodecahedron in the corner. Drag to turn it, and tap a face.

| Symbol | Control |
|---|---|
| ◐ | Open or close the shape wheel |
| ◈ | Open or close the shape browser |
| ⛶ | View mode |
| ▣ | Save |
| ℹ | About (reopens the welcome screen) |
| 🌐 | Switch to the next language (shows the current one's name) |

## Keyboard and mouse

| Input | Action |
|---|---|
| Click a shape | Select it, along with the face you clicked |
| Click a vertex | Select it for vertex attach |
| Left-drag | Rotate the camera, or turn a new shape before confirming |
| Scroll wheel | Zoom |
| Tab or Space | Open the shape wheel |
| Esc | Cancel placing a shape, or close the wheel |

## Touch

| Gesture | Action |
|---|---|
| Tap a vertex or shape | Select it |
| One-finger drag | Rotate the camera, or turn a new shape |
| Pinch | Zoom |

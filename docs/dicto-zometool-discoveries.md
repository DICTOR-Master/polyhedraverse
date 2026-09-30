# DICTO's Zometool discoveries

*Recorded 2026-09-30. Shapes found and built by **DICTO** in Zometool; analysed,
verified and added to Polyhedraverse (and, for the lattice, Rhombiverse) with
Claude Code. Zometool is a trademark of its owner; this project is not affiliated
with it.*

Four findings, each built physically first, then pinned down exactly:

1. **A leaning regular-hexagonal prism** made only of medium blue struts: a
   space-filling Fedorov parallelohedron that leans by exactly
   asin((φ − 1)/√3) ≈ 20.905°.
2. **Its two blocks**, equal-edged parallelepipeds that fill it exactly, each of
   volume φ/2.
3. **A skewed rhombic dodecahedron** of medium blue struts that tiles space as a
   sheared FCC lattice (**DICTO FCC**), with volume exactly φ².
4. Prompted by DICTO's stellation question: **true stellations of rhombic, kite and
   triangle faces are possible**, contrary to an earlier claim, and the Catalan and
   Platonic solids' stellations can be built face by face.

Throughout, φ = (1 + √5)/2 is the golden ratio, and "blue" means Zometool's blue
struts. They run along the 15 two-fold axes of icosahedral symmetry and meet at 36°,
60°, 72° or 90°. All edges below are one medium blue strut, taken as length 1.

---

## 1. The leaning hexagonal prism

**The build:** two regular hexagons joined by six sides, all medium blue: two
squares and four 72°/108° rhombi (the "thick" Penrose rhombus, whose diagonals are
in the golden ratio). 8 faces, 12 corners, 18 edges.

**The four edge directions:** call them u, v, w (in the hexagon's plane, at 60° to
each other) and d (the lean).

- d is at **90°** to u, which gives the two squares;
- d is at **72°** to v and to w, which gives the four golden rhombi;
- the hexagon plane is perpendicular to one of Zome's yellow (three-fold) axes.

In coordinates, u = (1, 0, 0), v = (½, √3/2, 0), w = (−½, √3/2, 0) and
d = (0, y, √(1 − y²)) with y = 2 cos 72° / √3.

**The lean:** d tilts from upright by

> sin θ = 2 cos 72° / √3 = (φ − 1)/√3, θ ≈ 20.905°.

**The volume** is exactly **3φ/2**: the hexagon's area 3√3/2 times its height.

**It is a parallelohedron.** It fills space by translation alone. It belongs to the
hexagonal-prism type, one of Fedorov's five: three edge directions in a plane plus
one crossing them. Fedorov's list names the type. This golden, all-blue, leaning
member of it is the new part.

**It connects to other shapes.** Its squares match the cube, its hexagons the
regular hexagonal prism, and its golden rhombi the thick Penrose rhombus prism.
In Polyhedraverse all three attach.

## 2. The two blocks

The hexagon splits into three rhombi, one for each pair of u, v, w. Sweeping each
along d gives three **equilateral parallelepipeds** (every edge one strut) that fill
the prism exactly:

| Block | Edge directions | Face pairs | Volume |
|---|---|---|---|
| Square-faced block (used **twice**) | u, v, d and u, w, d | square · 60° rhombus · 72° rhombus | φ/2 |
| All-rhombus block | v, w, d | 60° rhombus · 72° rhombus · 72° rhombus | φ/2 |

- **Why "twice" is one piece.** Every parallelepiped is centrally symmetric, so its
  mirror image is itself turned round. The two square-faced blocks look like mirror
  twins but are the same piece.
- **Names.** Neither block is strictly a rhombohedron, which needs six congruent
  rhombic faces. They are equal-edged parallelepipeds, which DICTO called
  "near-rhombohedra". Each tiles space alone too.
- **Found from a distorted rhombic dodecahedron.** DICTO first met a block inside a
  distorted RD. The reason: any rhombic-dodecahedron-type solid is the sweep of four
  edge directions, and splits into four parallelepipeds, one per choice of three.
  The prism is the case where three of the four directions (u, v, w) lie in one
  plane. The rhombi around the hexagon merge into flat hexagons, and the fourth
  block (u, v, w) flattens to nothing, leaving three.

## 3. The skewed rhombic dodecahedron: DICTO FCC

**The build:** a rhombic dodecahedron made only of medium blue struts, with its
four inner blocks visible inside.

**Identification:** it has twelve rhombic faces, six at 60° and six at 72°, with no
squares and no thin 36° rhombi. Of the **15** different rhombic-dodecahedron-type
cells that four blue directions can make (no three in a plane), it is the one
whose four directions meet at 60° three times and 72° three times. It is also the
closest of the fifteen to a true rhombic dodecahedron, whose rhombi are 70.53°.

**Its four blocks**, exactly as DICTO found them inside:

| Block | Count | Volume |
|---|---|---|
| All-rhombus block (the same piece as in the prism) | 2 | φ/2 each |
| Flattened rhombohedron (two 60° and one 72° face pairs) | 2 | ½ each |

**Its volume** is therefore 2·½ + 2·φ/2 = 1 + φ = **φ²**. That is the golden
ratio's defining identity, φ² = φ + 1, appearing as a volume.

**It tiles space as a sheared FCC lattice:**

- it has the rhombic dodecahedron's structure: 12 faces and 14 corners;
- its 12 face-to-face neighbours sit at the translations 2 × (face centre), and one
  linear map carries FCC's 12 nearest-neighbour directions exactly onto them;
- copies at those translations fill space: random points each lie in exactly one
  cell, and the cell's volume equals the lattice's volume per point.

So the packing is the familiar FCC packing of rhombic dodecahedra, sheared, with
every cell touching 12 neighbours in the same pattern. It becomes the
**DICTO FCC** world in Rhombiverse, coloured Zome blue.

## 4. How many blue-strut space-fillers are there?

The cell types that fill space by translation are Fedorov's five. There are only
five because the constraints force them:

1. **Symmetry.** A shape that tiles by translation alone must be centrally
   symmetric, with centrally symmetric faces (Minkowski).
2. **At most 14 faces.** Face pairs correspond to neighbour offsets, which must stay
   distinct modulo 2 in the lattice, and there are only 2³ − 1 = 7 classes.
3. **Belts of 4 or 6.** Every belt of faces around an edge direction has 4 or 6
   faces (Venkov).
4. **Only five shapes are left.** In 3D this forces a zonohedron swept by 3, 4
   (three in a plane), 4 (general), 5 or 6 directions: the parallelepiped, the
   hexagonal prism, the rhombic dodecahedron, the elongated dodecahedron and the
   truncated octahedron.

Each type includes endlessly many sheared members. Counting those built from
medium blue struts alone (every set of 3 to 6 blue directions that passes the belt
test) gives about **66**:

| Type | Count |
|---|---|
| Parallelepipeds | 11 |
| Hexagonal prisms | 13 |
| Rhombic-dodecahedron type | 13 (15 when sorted by their blocks) |
| Elongated-dodecahedron type | 22 |
| Truncated-octahedron type | 7 |

The counts group shapes by their angles, so mirror images count once. The upright
regular hexagonal prism is not among them: its axis is a yellow direction.

## 5. True stellations of the Catalan and Platonic solids

DICTO's specification for "rhombic and flag-faced stellation" started from an
earlier claim that true stellation of irregular faces wasn't possible. It is
possible. Extending every face plane of a Catalan solid gives:

- **The first stellation is always a clean pyramid on each face.** Its apex sits over
  the point where the solid's inner sphere touches the face, which is the face's
  **incircle centre**. That is the face centre for rhombi and off-centre for kites
  and triangles (by up to 17% of an edge). The reason: every face plane touches the
  inner sphere, and a Catalan solid's dihedral angle is the same at every edge, so
  all the planes around a face meet at one point on its perpendicular.
- **Two exact heights**, with r the face's inradius and δ the dihedral angle:
  - **flat**, h = r · tan((π − δ)/2): each pyramid side lies flush with its
    neighbour's across the old edge, and the result is a new convex solid;
  - **true**, h = r · tan(π − δ): the sides lie in the neighbouring face planes,
    and the result is the first stellation.
- **Deeper stellations are not pyramids.** The second and third stellations add
  cells over the edges and between spikes. Counting only finite cells (the
  classical rule), each stellation still cuts into one congruent piece per face, the
  part lying in the wedge from the centre through that face. For the rhombic
  dodecahedron the four pieces' volumes are in the ratio **1 : 3 : 9 : 15**, and
  its first stellation is **Escher's solid**.
- **Flat pieces on the Platonic solids** give classic results, each checked through
  the rhombus the merged faces form:

  | Solid | Flat pyramids on every face give |
  |---|---|
  | Tetrahedron | Cube |
  | Cube, octahedron | Rhombic dodecahedron |
  | Dodecahedron, icosahedron | Rhombic triacontahedron |

- **Three star solids become buildable.** The dodecahedron's three stellations are
  the small stellated dodecahedron, the great dodecahedron and the great stellated
  dodecahedron. With the stellation pieces they can be built on a dodecahedron one
  face at a time. The octahedron's single stellation is the stella octangula. The
  icosahedron's second is the compound of five octahedra.

## 6. How it was checked, and where it lives

Every claim above is tested by a script in the Polyhedraverse repository, run in CI:

| Check | Covers |
|---|---|
| `npm run verify:zome-parallelohedra` | edges, faces and angles; the lean formula; all four directions on blue axes of one icosahedral frame; the blocks filling the prism exactly; each shape tiling space (Venkov); real attach partners; and that face attach can seat the blocks into the prism |
| `npm run verify:stellations` | 1,259 checks: the pieces' geometry, the incircle apex, the flat and true heights, every face in a face plane or seam, a random-point test against the stellation rule, the named results, and the build namer |

The skewed-FCC proof was run as a standalone calculation. It will be included in
the Rhombiverse DICTO FCC world's own verify script.

**In the apps:**

- **Polyhedraverse, Parallelohedra family:** the leaning prism and both blocks, as
  "Variants" beside Fedorov's five, credited to DICTO and Zometool (commit
  5c887d7).
- **Polyhedraverse, Stellations family:** the stellation pieces for all 13 Catalan
  and 5 Platonic solids (ce16211).
- **Face attach:** it now offers every way a piece can sit on a face, which is what
  made the blocks buildable into the prism (a2a0d88).
- **Rhombiverse, DICTO FCC world:** in progress.

## 7. Open questions

- **A gallery of the other ~66 blue-strut space-fillers**, with Zome recipes, to
  pick which deserve a place in the apps.
- **An exact congruence count**, to firm up the ~66 (mirror pairs and look-alikes).
- **All construction paths** for each 4D polytope, and bridges from these cells to
  higher dimensions.

# Radial Cell Projection (RCP)

### A Cell-First Method for Constructing and Projecting Four-Dimensional Polyhedral Cell Complexes

**James Baker — 2026**

---

## Abstract

Radial Cell Projection (RCP) is a computational method conceived and developed by James Baker during the development of Polyhedraverse in 2026.

RCP begins with a regular three-dimensional polyhedral cell and constructs a four-dimensional cell complex by recursively reflecting copies of that cell across its faces in four-dimensional space. The construction is **cell-first**: the three-dimensional seed cell, its faces, their orientations, and a verified dihedral parameter are supplied; the four-dimensional embedding, face-positioned reflection hyperplanes, neighbouring cell transforms, cell adjacency, closure, and final radial projection are derived by a single generic computational procedure.

Four regular seed cells have been implemented and verified:

- tetrahedron → 16-cell
- cube → tesseract
- octahedron → 24-cell
- dodecahedron → 120-cell

The resulting complexes contain respectively 16, 8, 24, and 120 congruent three-dimensional cells. Their adjacency degrees are 4, 6, 8, and 12 respectively.

RCP does not claim the discovery of these four-dimensional regular polytopes, nor does it claim the invention of radial projection itself. The contribution described here is the particular cell-first computational formulation in which a regular three-dimensional seed is embedded in four dimensions, its actual face geometry determines origin-centred reflection hyperplanes, the complete four-dimensional complex is generated recursively, finite closure is detected computationally, and the resulting structure is subsequently represented through radial projection into three dimensions.

---

## Contents

1. [Introduction](#1-introduction)
2. [Scope and Terminology](#2-scope-and-terminology)
3. [Mathematical Setting](#3-mathematical-setting)
4. [Four-Dimensional Seed Embedding](#4-four-dimensional-seed-embedding)
5. [Embedded Face Geometry](#5-embedded-face-geometry)
6. [The Face Reflection](#6-the-face-reflection)
7. [Reflection Operator](#7-reflection-operator)
8. [Why the Half-Angle Appears](#8-why-the-half-angle-appears)
9. [Transport to an Arbitrary Cell](#9-transport-to-an-arbitrary-cell)
10. [Recursive Cell Generation](#10-recursive-cell-generation)
11. [Closure](#11-closure)
12. [Geometric Validity of the Generated Complex](#12-geometric-validity-of-the-generated-complex)
13. [Finite Closure Versus Infinite Reflection Systems](#13-finite-closure-versus-infinite-reflection-systems)
14. [Radial Projection](#14-radial-projection)
15. [Dualization](#15-dualization)
16. [Computational Architecture](#16-computational-architecture)
17. [Computational Verification](#17-computational-verification)
18. [Polyhedraverse Integration](#18-polyhedraverse-integration)
19. [Relationship to Established Four-Dimensional Geometry](#19-relationship-to-established-four-dimensional-geometry)
20. [Nature of the Contribution](#20-nature-of-the-contribution)
21. [Provenance](#21-provenance)
22. [Current Scope and Limitations](#22-current-scope-and-limitations)
23. [Conclusion](#23-conclusion)

---

## 1. Introduction

Polyhedraverse is a system for exploring polyhedral geometry as a spatial construction system. Its three-dimensional objects can be connected through their faces or vertices to create larger structures.

Radial Cell Projection arose from a specific question within this system:

> Can a three-dimensional polyhedral cell be used as the fundamental computational unit for constructing its corresponding four-dimensional regular cell complex, rather than treating the four-dimensional object as a separately stored object?

RCP answers this by making the three-dimensional cell the starting point and deriving the four-dimensional structure through face reflections.

The essential computational sequence is:

```
3D regular cell
      ↓
4D embedding
      ↓
face-positioned reflections
      ↓
recursive cell complex
      ↓
finite closure
      ↓
radial projection
```

The distinction between construction and representation is important. RCP first constructs the four-dimensional geometry. Radial projection is then applied to that already-constructed geometry as a means of displaying it in three dimensions.

The method therefore does not begin with a three-dimensional image and attempt to infer a four-dimensional object from it. The four-dimensional cell complex is generated explicitly before projection.

## 2. Scope and Terminology

### 2.1 Cell-first construction

In RCP, the fundamental object supplied to the construction engine is a regular three-dimensional polyhedral cell $P$.

The engine operates on:

- the vertices of $P$
- its faces
- oriented face normals
- its inradius
- a verified four-dimensional dihedral parameter $\theta$

The four-dimensional complex is then derived from those data. This is referred to as a **cell-first construction**.

### 2.2 Four-dimensional cell complex

The output is a collection of congruent three-dimensional cells embedded in $\mathbb{R}^4$, together with their transformations and face adjacencies.

For the four validated cases, this output corresponds to the known regular four-dimensional polytopes:

| 3D seed | 4D complex | number of cells |
|---|---|---|
| tetrahedron | 16-cell | 16 |
| cube | tesseract | 8 |
| octahedron | 24-cell | 24 |
| dodecahedron | 120-cell | 120 |

These identities are validation results of the generated structures, not assumptions built into the generic construction.

### 2.3 Radial projection

Once the four-dimensional complex has been generated, its vertices are projected into three dimensions by a radial perspective projection.

The projection is therefore a representation step, not the mechanism by which the four-dimensional complex is generated.

## 3. Mathematical Setting

Let

$$P \subset \mathbb{R}^3$$

be a regular polyhedral cell with vertex set

$$V(P) = \{p_1, \dots, p_N\}.$$

For each face $F$, let $f \in \mathbb{R}^3$ be its outward unit normal.

Because $P$ is regular and centred at the origin, every face lies at the same distance $r$ from the origin, where $r$ is the inradius.

Thus the plane of a face satisfies

$$f \cdot x = r.$$

If $g_F$ is the centroid of face $F$, then

$$f \cdot g_F = r.$$

This relation provides the explicit three-dimensional position of the face that will subsequently be embedded in four dimensions.

## 4. Four-Dimensional Seed Embedding

### 4.1 Embedding the vertices

Introduce a fourth coordinate $w$.

The three-dimensional seed cell is embedded into the hyperplane $w = d$ by lifting every vertex according to

$$\tilde{p}_i = (p_i, d).$$

The embedded seed therefore has exactly the same internal edge lengths, face shapes, angles, and three-dimensional geometry as the original polyhedron.

The fourth coordinate establishes its position relative to the four-dimensional reflection geometry.

### 4.2 Reference cell normal

The outward four-dimensional normal of the seed cell is chosen as

$$n_0 = (0, 0, 0, 1).$$

Thus the seed lies in the hyperplane

$$n_0 \cdot x = d.$$

The value of $d$ is not arbitrary. For a supplied dihedral parameter $\theta$,

$$d = r \cot\left(\frac{\theta}{2}\right).$$

This value places the reflection hyperplane associated with each face through the correct embedded face.

## 5. Embedded Face Geometry

This is a central part of RCP.

The reflection hyperplane is not introduced as an abstract plane floating somewhere in four-dimensional space. Its position is derived from the actual position of the corresponding embedded face.

### 5.1 Lifted face

Let $g_F$ be the centroid of face $F$. Its four-dimensional position is

$$q_F = (g_F, d).$$

The three-dimensional face normal is lifted into four dimensions as

$$\tilde{f} = (f_x, f_y, f_z, 0).$$

The lifted face lies in the hyperplane $w = d$ and retains its original three-dimensional normal direction within that hyperplane.

The relevant dot products are therefore

$$f \cdot g_F = r \qquad \text{and} \qquad n_0 \cdot q_F = d.$$

## 6. The Face Reflection

### 6.1 Reflection normal

For a face $F$, define the unit reflection normal

$$m_0 = \operatorname{normalize}\left(\sin\left(\frac{\theta}{2}\right) n_0 - \cos\left(\frac{\theta}{2}\right)\tilde{f}\right).$$

For the regular cases used here, the two vectors $n_0$ and $\tilde{f}$ are orthogonal unit vectors. Consequently the expression is already normalized:

$$\left\| \sin\left(\frac{\theta}{2}\right) n_0 - \cos\left(\frac{\theta}{2}\right)\tilde{f} \right\| = 1.$$

The explicit normalization is retained computationally.

### 6.2 Position of the reflection hyperplane

The reflection hyperplane is

$$H_F = \{ x \in \mathbb{R}^4 : m_0 \cdot x = 0 \}.$$

This equation specifies both its orientation and its position. It passes through the origin. More importantly, it contains the complete embedded face.

To demonstrate this, evaluate the mirror normal at the lifted face centroid:

$$m_0 \cdot q_F = \sin\left(\frac{\theta}{2}\right)(n_0 \cdot q_F) - \cos\left(\frac{\theta}{2}\right)(\tilde{f} \cdot q_F).$$

Since

$$n_0 \cdot q_F = d \qquad \text{and} \qquad \tilde{f} \cdot q_F = f \cdot g_F = r,$$

we obtain

$$m_0 \cdot q_F = d\sin\left(\frac{\theta}{2}\right) - r\cos\left(\frac{\theta}{2}\right).$$

Using

$$d = r\cot\left(\frac{\theta}{2}\right) = r\,\frac{\cos(\theta/2)}{\sin(\theta/2)},$$

gives

$$m_0 \cdot q_F = 0.$$

Therefore $q_F \in H_F$.

Because every point of the face has the same values of the relevant face-plane equations, the entire lifted face lies in $H_F$, not merely its centroid.

Thus the reflection hyperplane is the actual geometric interface through which the neighbouring four-dimensional cell is generated.

## 7. Reflection Operator

Given a unit normal $m$, define the reflection matrix

$$R_m = I - 2mm^T.$$

Its action on a point $x \in \mathbb{R}^4$ is

$$R_m(x) = x - 2(x \cdot m)m.$$

This is an ordinary Euclidean reflection. It has the properties

$$R_m^2 = I \qquad \text{and} \qquad R_m^{-1} = R_m.$$

Any point lying on the reflection hyperplane satisfies $x \cdot m = 0$ and is therefore fixed:

$$R_m(x) = x.$$

Consequently the shared face is preserved exactly while the cell on one side of the hyperplane is reflected into the adjacent cell on the other side.

## 8. Why the Half-Angle Appears

The half-angle is a direct consequence of constructing the required rotation between adjacent cell normals by reflection.

For the current cell normal $n$,

$$m = \sin\left(\frac{\theta}{2}\right) n - \cos\left(\frac{\theta}{2}\right) f.$$

Because $n$ and $f$ are orthogonal unit vectors,

$$n \cdot m = \sin\left(\frac{\theta}{2}\right).$$

Reflecting $n$ gives

$$R_m(n) = n - 2(n \cdot m)m.$$

Substitution gives

$$R_m(n) = \cos\theta\, n + \sin\theta\, f.$$

Therefore

$$n \cdot R_m(n) = \cos\theta.$$

The angle between the two cell normals is consequently $\theta$.

The half-angle therefore does not represent an arbitrary adjustment. It arises because the reflection plane bisects the angular relationship required between the two cell orientations.

## 9. Transport to an Arbitrary Cell

Let $T_C \in O(4)$ be the orthogonal transformation that places the reference seed cell into the position and orientation of cell $C$.

For the reference cell,

$$T_0 = I.$$

The current cell normal is

$$n_C = T_C n_0.$$

For one of its faces, the corresponding transformed face normal is

$$f_C = T_C \tilde{f}.$$

Its transformed face position is

$$q_{F,C} = T_C q_F.$$

The corresponding reflection normal is

$$m_C = \operatorname{normalize}\left(\sin\left(\frac{\theta}{2}\right) n_C - \cos\left(\frac{\theta}{2}\right) f_C\right).$$

Because $T_C$ is orthogonal,

$$m_C = T_C m_0.$$

The reflection hyperplane for this face is therefore

$$H_{F,C} = \{ x \in \mathbb{R}^4 : m_C \cdot x = 0 \}.$$

This is the transformed origin-passing hyperplane containing the actual embedded shared face.

The construction therefore carries both orientation and position of the face into every recursively generated cell.

## 10. Recursive Cell Generation

Suppose cell $C$ has transformation $T_C$. For each face of that cell:

1. transform the corresponding face normal;
2. construct its reflection normal $m_C$;
3. construct the reflection matrix $R_{m_C}$;
4. reflect the cell transformation.

The neighbouring cell transformation is

$$T_{C'} = R_{m_C} T_C.$$

The neighbouring cell normal is

$$n_{C'} = R_{m_C} n_C.$$

Because $R_{m_C}^2 = I$, reflecting across the same face again returns to the original cell. Thus the adjacency relation is naturally reversible.

The complete four-dimensional complex is generated by repeatedly applying this operation across every available face of every newly reached cell.

No separate four-dimensional model needs to be stored for each supported polyhedron.

## 11. Closure

### 11.1 Closure as a reflection orbit

Repeated application of the face reflections generates an orbit of transformed copies of the seed cell. The construction continues until every newly generated state corresponds to a cell already reached.

Finite closure is therefore an observed property of the generated reflection orbit. There is no runtime selection between two alternative fold directions. The direction is determined by:

- the orientation of the current cell;
- the orientation of the selected face;
- the supplied value of $\theta$;
- the reflection construction itself.

Thus closure is not produced by choosing whichever of two possible folds happens to work.

### 11.2 The four verified closures

The current implementation produces the following finite complexes:

| Seed cell | $\theta$ | Cells | Adjacency degree | 4D polytope |
|---|---|---|---|---|
| Tetrahedron | 60° | 16 | 4 | 16-cell |
| Cube | 90° | 8 | 6 | Tesseract |
| Octahedron | 60° | 24 | 8 | 24-cell |
| Dodecahedron | 36° | 120 | 12 | 120-cell |

The cell counts and adjacency degrees are measured properties of the generated complexes. They are not used as hidden instructions telling the engine how many cells to create. The engine instead generates the reflection orbit and observes its closure.

### 11.3 Closure is not assumed for arbitrary seeds

RCP does not claim that every regular three-dimensional polyhedron, combined with an arbitrary value of $\theta$, necessarily produces a finite four-dimensional complex.

The current implementation supplies a verified value of $\theta$ for each of the four supported seeds. It does not search over $\theta$ until closure occurs.

The demonstrated implication is therefore:

> verified seed + verified $\theta$ + generic reflection recursion $\implies$ finite four-dimensional cell complex

rather than the converse.

This distinction is essential to the mathematical scope of the method.

## 12. Geometric Validity of the Generated Complex

Each reflection is an isometry of $\mathbb{R}^4$. Therefore all cells generated from the seed are congruent copies of the original embedded cell.

For every generated cell:

- edge lengths are preserved;
- face shapes are preserved;
- internal angles are preserved;
- three-dimensional cell volume is preserved;
- the complete cell geometry is obtained by an orthogonal transformation.

For adjacent cells $C$ and $C'$, the generated normals satisfy

$$n_C \cdot n_{C'} = \cos\theta.$$

The shared face is not merely placed approximately near the neighbouring cell. It is invariant under the defining reflection and is therefore geometrically coincident.

These properties provide direct tests of the generated four-dimensional geometry.

## 13. Finite Closure Versus Infinite Reflection Systems

A local face-reflection rule does not by itself imply finite closure. The same basic mechanism can generate an unbounded reflection orbit for other geometries or parameters.

Consequently, RCP treats closure as something to be generated and verified, rather than assumed from the existence of a local reflection rule.

For the four supported cases, the resulting finite structures correspond to the known regular four-dimensional polytopes.

This also provides an important distinction between:

1. the local geometric rule;
2. the global orbit generated by repeatedly applying that rule;
3. the finite closure of that orbit.

The first does not automatically imply the third.

## 14. Radial Projection

Once the complete four-dimensional cell complex has been constructed, its vertices can be represented in three dimensions using radial projection.

For a four-dimensional point $(x, y, z, w)$, define the projected point

$$\Pi(x, y, z, w) = \left( \frac{x}{d_v - w}, \frac{y}{d_v - w}, \frac{z}{d_v - w} \right),$$

where $d_v$ is the selected projection distance.

The projection is applied after four-dimensional generation. Thus:

$$\text{4D construction} \neq \text{3D projection}.$$

The projection does not determine the cell complex. It provides a three-dimensional representation of a complex that already exists in four-dimensional coordinates.

A numerical lower bound is applied to the projection denominator to prevent unstable or non-finite coordinates when a point approaches the projection hyperplane. This safeguard affects numerical representation only; it does not alter the underlying four-dimensional construction.

## 15. Dualization

The generated four-dimensional cell complex can also be dualized computationally.

For the generated 120-cell, the implementation produces a dual complex consisting of 600 tetrahedral cells.

The dual has:

- 600 tetrahedral cells;
- degree 4 adjacency;
- 1200 adjacency pairs;
- dual vertices equidistant from the origin.

This provides an additional independent structural test of the generated 120-cell.

Dualization is not required for RCP's primary construction. It is an operation that can be applied to the generated complex after construction.

## 16. Computational Architecture

The implementation follows a generic construction rather than four separately encoded four-dimensional objects.

The supplied information consists principally of:

- seed vertices;
- face definitions;
- oriented face normals;
- inradius;
- verified $\theta$.

The engine derives:

- the embedding depth $d$;
- lifted face positions;
- reflection normals;
- reflection matrices;
- cell transformations;
- cell positions and orientations;
- adjacency;
- shared-face geometry;
- the complete generated cell complex;
- its dual where requested;
- its radial projection.

The governing implementation principle is:

> **Derive, don't store.**

The purpose is not to replace mathematical data with procedural code. Rather, information that follows deterministically from the seed geometry is generated from that geometry instead of being duplicated as a separately maintained four-dimensional model.

## 17. Computational Verification

RCP is accompanied by a dedicated verification suite operating on the same generic construction engine. The verification suite tests the four supported seed cells through the same construction pathway.

### 17.1 Reflection sanity

The bisecting-mirror construction is tested independently to confirm the expected reflection behaviour for the tesseract case.

### 17.2 Supported-shape coverage

The four-dimensional-capable shape set contains exactly the four currently validated seed types: tetrahedron, cube, octahedron, dodecahedron. The corresponding parameter definitions cover all four.

### 17.3 Cell counts

The generated complexes are checked against the expected finite closures: 16, 8, 24, 120.

### 17.4 Adjacency degree

The generated cell adjacency degrees are checked against: 4, 6, 8, 12.

### 17.5 Adjacency pair counts

The complete generated adjacency relations are checked for the expected number of unique cell-to-cell connections.

### 17.6 Measured dihedral angle

The angle between generated adjacent cell normals is measured from the generated coordinates and compared with the supplied value of $\theta$. Thus the expected angle is not merely asserted by the parameter table; it is recoverable from the generated structure.

### 17.7 Isometry

Every generated cell is compared with the seed geometry. The verification checks that the generated cells remain undistorted isometric copies. The current test requires the worst pairwise-distance distortion to remain below $10^{-6}$.

### 17.8 Shared-face coincidence

Adjacent cells are tested to ensure that their corresponding face vertices literally coincide. This tests the geometric interface rather than merely the abstract adjacency graph.

### 17.9 Projection stability

The projection implementation is tested both near and at the projection-distance boundary to ensure that the resulting coordinates remain finite under the implemented numerical safeguard.

### 17.10 Dual verification

The dual of the generated 120-cell is checked to contain 600 tetrahedral cells and degree-4 adjacency, with 1200 adjacency pairs. The dual vertices are additionally tested for equal radial distance from the origin.

### 17.11 Scene integration

The radial projection scene builder is tested for all four supported complexes. The tests verify:

- a finite positive projection distance;
- finite projected vertices;
- a non-degenerate projected scene;
- variation in projected cell extent consistent with radial projection.

## 18. Polyhedraverse Integration

RCP is integrated into Polyhedraverse as a single four-dimensional viewing operation.

The user-facing control is:

> **View 4D**

rather than a collection of shape-specific controls.

For the four currently supported shapes, the same interface invokes the same generic RCP engine. The resulting previews contain:

- tetrahedron → 16 cells;
- cube → 8 cells;
- octahedron → 24 cells;
- dodecahedron → 120 cells.

This interface reflects the underlying computational architecture: the user is selecting a four-dimensional representation of a supported three-dimensional cell, not selecting among four independently authored four-dimensional models.

## 19. Relationship to Established Four-Dimensional Geometry

The four resulting structures correspond to well-established regular four-dimensional polytopes: the tesseract, the 16-cell, the 24-cell, and the 120-cell.

Radial projection of higher-dimensional polytopes into three dimensions is also an established mathematical technique.

Likewise, the mathematical work of Coxeter and Wythoff provides important established context for regular polytopes and their constructions.

RCP does not claim authorship of:

- the tesseract;
- the 16-cell;
- the 24-cell;
- the 120-cell;
- four-dimensional Euclidean geometry;
- reflection geometry as a mathematical concept;
- radial projection itself;
- Coxeter or Wythoff constructions.

Coxeter/Wythoff methods are instead relevant as independent mathematical context and as a means of validating the identity of structures produced by RCP.

The conceptual workflow is therefore:

```
RCP construction
      ↓
generated structure
      ↓
independent comparison
      ↓
validation
```

and **not**

```
Coxeter/Wythoff → RCP implementation
```

## 20. Nature of the Contribution

The contribution of RCP is the particular computational formulation in which a regular three-dimensional polyhedral cell is treated as the primary object from which a four-dimensional cell complex can be generated.

The method combines:

1. explicit embedding of the three-dimensional cell in four dimensions;
2. derivation of the embedding depth from the supplied dihedral parameter;
3. explicit positioning of each embedded face;
4. construction of an origin-centred reflection hyperplane containing that face;
5. recursive generation of neighbouring cells through four-dimensional reflection;
6. detection of finite closure;
7. independent geometric verification;
8. optional dualization;
9. radial projection of the resulting four-dimensional complex into three-dimensional space.

The central construction can therefore be summarized as:

```
regular 3D seed
      ↓
4D face-positioned reflection
      ↓
recursive closure
      ↓
radial projection
```

This is the RCP formulation developed for Polyhedraverse.

## 21. Provenance

Radial Cell Projection was conceived and developed by James Baker during the development of Polyhedraverse in 2026.

The method was developed as part of the computational exploration of polyhedral geometry within Polyhedraverse.

The known mathematical objects produced by the method are not claimed as new objects. The authorship claim concerns the RCP method and its implementation as a cell-first computational construction within Polyhedraverse.

The subsequent comparison of generated structures against established four-dimensional geometry serves as validation of the implementation.

## 22. Current Scope and Limitations

The present implementation has four verified regular seed cells: tetrahedron, cube, octahedron, dodecahedron.

The method should not presently be described as a universal generator for every three-dimensional polyhedron or every possible four-dimensional polytope. In particular:

- $\theta$ is presently supplied as a verified parameter rather than discovered automatically;
- finite closure is verified for the four supported cases rather than guaranteed for arbitrary inputs;
- the radial projection is a representation of the generated complex rather than its defining construction;
- additional seed cells require independent geometric verification before being described as supported RCP cases.

These restrictions are part of the current mathematical definition of the implementation and prevent the method from being described more broadly than the evidence supports.

## 23. Conclusion

Radial Cell Projection provides a cell-first computational route from regular three-dimensional polyhedral geometry to four-dimensional cell complexes.

The method does not begin with a pre-existing four-dimensional object and merely render it. Instead, it starts with a three-dimensional seed, embeds that seed into four-dimensional space, derives the positions of its faces, constructs reflection hyperplanes through those faces, recursively generates adjacent cells, and tests whether the resulting reflection orbit closes.

For the four validated cases, the construction produces:

- tetrahedron → 16-cell,
- cube → tesseract,
- octahedron → 24-cell,
- dodecahedron → 120-cell.

The resulting four-dimensional structures are then available for radial projection, visualization, interaction, and further computational operations such as dualization.

The defining principle is therefore not the invention of a new four-dimensional polytope, nor the invention of radial projection, but the construction of a generic computational bridge between three-dimensional polyhedral cells and their validated four-dimensional cell complexes:

> **Cell first. Reflection generates. Closure verifies. Projection reveals.**

Radial Cell Projection was conceived and developed by James Baker during the development of Polyhedraverse in 2026.

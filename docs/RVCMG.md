# Reversible Vertex-Coalescence Morphing Geometry (RVCMG)

**A Reversible Vertex-Based Framework for Transforming Polyhedral Interfaces**

Author: James Baker
Date: 2026
Part of: [Polyhedraverse](../README.md)

> **Vertices morph. Faces connect.**

---

## Table of contents

1. [Abstract](#abstract)
2. [Introduction](#1-introduction)
3. [Geometric object](#2-geometric-object)
4. [Primitive operation: vertex coalescence](#3-primitive-operation-vertex-coalescence)
5. [Adjacency constraint](#4-adjacency-constraint)
6. [One-sided and symmetric coalescence](#5-one-sided-and-symmetric-coalescence)
7. [State representation](#6-state-representation)
8. [The primal states](#7-the-primal-states)
9. [Composite coalescence](#8-composite-coalescence)
10. [Reversibility](#9-reversibility)
11. [Not a linear 6→5→4→3 system](#10-rvcmg-is-not-a-linear-65 43-system)
12. [The six-vertex interface as source state](#11-the-six-vertex-interface-as-the-source-state)
13. [Physical interpretation](#12-physical-interpretation)
14. [Adapter principle](#13-adapter-principle)
15. [Face connection](#14-face-connection)
16. [Geometric validity rules (V1–V10)](#15-geometric-validity-rules)
17. [Mathematical form of a primitive transformation](#16-mathematical-form-of-a-primitive-transformation)
18. [Continuous morphing and discrete states](#17-continuous-morphing-and-discrete-states)
19. [Symmetric versus one-sided paths](#18-symmetric-versus-one-sided-paths)
20. [State graph](#19-state-graph)
21. [Implementation model](#20-implementation-model)
22. [Physical implementation](#21-physical-implementation)
23. [Relationship to conventional polygon operations](#22-relationship-to-conventional-polygon-operations)
24. [Relationship to edge collapse](#23-relationship-to-edge-collapse)
25. [Open geometric requirements](#24-open-geometric-requirements)
26. [Verification requirements (25.1–25.8)](#25-verification-requirements)
27. [Development status](#26-development-status)
28. [Scope and non-claims](#27-scope-and-non-claims)
29. [Provenance](#28-provenance)
30. [Core principle](#29-core-principle)
31. [Implementation plan for Claude Code](#implementation-plan-for-claude-code)

---

## Abstract

Reversible Vertex-Coalescence Morphing Geometry (RVCMG) is a geometric framework conceived during the development of the Polyhedraverse system, for transforming a polyhedral interface by controlled coalescence of its vertices.

The framework is based on a specific geometric distinction:

> **Vertices morph. Faces connect.**

The primitive operation in RVCMG is therefore **vertex coalescence**, not edge collapse. When two or more adjacent interface vertices are brought into coincidence, the intervening edge disappears as a consequence of the vertex transformation. The resulting polygonal interface may consequently have fewer vertices while representing a continuous geometric transformation of the original interface.

The principal RVCMG interface is the irregular hexagonal cut face produced by a hemi-rhombic-dodecahedral component. Its six interface vertices provide the initial six-vertex state. Controlled coalescence of adjacent vertices can produce states with five, four, or three distinct interface vertices, corresponding to pentagonal, quadrilateral, and triangular interface states.

The framework is explicitly **reversible**. A state is not defined solely by its number of vertices, and the allowed transformations are not necessarily a linear sequence `6 → 5 → 4 → 3`.

Instead, RVCMG treats geometry as a reversible state system in which different coalescence and separation operations may connect multiple states, including transitions that change the vertex count by more than one step and, where geometrically valid, transitions between states having the same vertex count.

The resulting framework provides a geometric basis for adapter pieces whose external connection interfaces remain face-based while their internal interface geometry can transform between discrete or continuously morphable states.

---

## 1. Introduction

Polyhedral construction normally treats a face as a fixed geometric entity.

RVCMG begins from a different question:

> Can the geometry of a connection interface itself be transformed by moving and coalescing its vertices, while retaining the interface as the physical location through which components connect?

The answer proposed by RVCMG is yes.

The framework separates two functions that are often treated as one:

- vertices define and transform geometry;
- faces provide connection interfaces.

This distinction is expressed by the central principle:

> **Vertices morph. Faces connect.**

RVCMG therefore does not regard an interface polygon merely as a polygon whose edges are independently collapsed. Instead, the polygon is represented by its ordered vertices, and the fundamental transformation acts on those vertices.

Edge disappearance is consequently a derived combinatorial result of vertex coincidence.

---

## 2. Geometric object

### 2.1 The hemi-rhombic-dodecahedral interface

The principal RVCMG component begins with a rhombic dodecahedron divided into two complementary halves.

The exposed cut interface of one half is a six-sided polygon.

This interface is not a regular Euclidean hexagon. It is an irregular hexagonal interface determined by the actual geometry of the hemi-rhombic-dodecahedral component.

Let its ordered vertices be

```
V = (v1, v2, v3, v4, v5, v6)
```

where consecutive vertices define the six interface edges.

The interface therefore begins in the six-vertex state:

> **S6 = { v1, ..., v6 }**

The actual hemi-RD coordinates, rather than an ideal regular-hexagon approximation, define the physical geometry of the RVCMG interface.

---

## 3. Primitive operation: vertex coalescence

### 3.1 Definition

Let two interface vertices `vi, vj` be selected for coalescence.

A coalescence operation produces a new geometric state in which:

> **vi = vj = vij**

The two formerly distinct vertices therefore become one geometric vertex.

If `vi` and `vj` are adjacent in the interface boundary, the edge connecting them has zero length in the resulting state and disappears from the boundary representation.

Thus the edge collapse is a consequence:

> vertex coalescence ⇒ zero-length edge ⇒ edge removal

RVCMG therefore defines vertex coalescence as the primitive operation. It does **not** define edge collapse as the primitive operation.

---

## 4. Adjacency constraint

A fundamental validity rule is:

> **Only adjacent interface vertices may directly coalesce.**

If `vi` and `vi+1` are consecutive vertices of the interface boundary, their direct coalescence is permitted.

Non-adjacent vertices cannot be declared to have coalesced without an additional geometric transformation that brings the intervening structure into a valid configuration.

This restriction preserves the local topology of the interface during a primitive transformation. It also distinguishes genuine vertex coalescence from arbitrary deletion of vertices from a polygonal representation.

---

## 5. One-sided and symmetric coalescence

The number of remaining vertices alone does not completely specify an RVCMG state.

Consider two adjacent vertices `vi, vi+1`. They may be brought into coincidence through different geometric paths, in particular:

- a predominantly **one-sided** displacement, in which one vertex moves toward the other;
- a **symmetric** displacement, in which both vertices move toward a common position.

Both can result in the same number of distinct vertices. However, they need not produce the same geometric configuration.

Consequently:

> **vertex count ≠ complete state description**

A rigorous RVCMG state must retain sufficient geometric information to distinguish configurations having the same number of vertices.

---

## 6. State representation

An RVCMG interface state can be represented as an ordered set of distinct interface vertices

```
S = (u1, u2, ..., uk)
```

together with their geometric coordinates and their boundary connectivity.

The integer `k = |S|` is the vertex count of the state.

The principal states discussed in the initial framework are:

> **S6, S5, S4, S3**

corresponding to six-, five-, four-, and three-vertex interface configurations.

These should not automatically be interpreted as a single linear sequence.

---

## 7. The primal states

The initial primal state is the six-vertex hemi-RD interface: **6**.

From this state, valid adjacent-vertex coalescences can generate lower-vertex configurations.

The principal three-, four-, and five-vertex configurations are treated as primal states because they can be directly related to the primitive interface geometry through vertex transformations.

Thus:

> **3, 4, 5, 6**

form the primary state vocabulary of the framework. The numbers describe the number of distinct interface vertices, not an imposed chronological sequence.

---

## 8. Composite coalescence

A single primitive coalescence may reduce the vertex count by one.

However, a sequence of valid primitive operations can produce a larger change. For example, a transformation from five vertices to three may be achieved through a sequence of adjacent coalescences: `5 → 4 → 3`.

The existence of such a route does not imply that every transformation between two states must pass through every intermediate vertex count.

The important distinction is between a **primitive operation** and a **composite transformation**.

RVCMG therefore permits the description of a `5 → 3` transformation as a composite result without redefining `5 → 3` as a primitive operation.

---

## 9. Reversibility

The defining property of RVCMG is that vertex coalescence is reversible.

If a valid transformation brings two distinct vertices into coincidence, `vi, vj → vij`, the reverse operation separates the coincident state into the corresponding distinct vertices:

> **vij → vi, vj**

Thus the state transition is bidirectional:

> **SA ↔ SB**

Reversibility is not merely the ability to undo a user action. It is part of the geometric definition of the state system.

A valid transformation must therefore have a geometrically defined reverse transformation.

---

## 10. RVCMG is not a linear 6→5→4→3 system

Because states are defined geometrically rather than solely numerically, RVCMG should not be represented as a ladder: `6 → 5 → 4 → 3`.

The state system is better represented as a graph:

> **Si ↔ Sj**

where an edge represents a valid reversible transformation.

Depending on the permitted geometry, this may include `6 ↔ 5`, `5 ↔ 4`, `4 ↔ 3`, as well as composite transformations such as `5 ↔ 3`.

The framework also permits the conceptual possibility of transitions between distinct configurations with the same vertex count: `S6(a) ↔ S6(b)`.

Likewise, where the geometry permits it, a transition may connect states whose vertex counts differ by more than one.

The state graph is therefore determined by geometric validity, not by numerical ordering.

---

## 11. The six-vertex interface as the source state

The six-vertex hemi-RD interface is important because it provides a single physical interface from which multiple lower-vertex configurations can be derived.

The transformation does not require replacing the entire component with a collection of unrelated polygonal pieces. Instead, the same interface geometry is treated as a morphable system.

The six vertices provide the degrees of freedom through which the interface can transform.

This gives RVCMG a common geometric origin for the different adapter states.

---

## 12. Physical interpretation

The geometric framework has a direct physical interpretation.

The edges of the interface polygon correspond to boundaries between the exposed cut-face regions of the hemi-RD component. When adjacent interface vertices coalesce, the corresponding boundary edge is eliminated.

The transformation can therefore be interpreted physically as a deformation in which neighbouring portions of the cut interface are brought together.

The connection mechanism itself remains associated with the face/interface. Thus the mathematical transformation acts on vertices while physical attachment occurs through faces.

This gives the framework its fundamental separation:

> **morphing variable = vertex**
> **connection surface = face**

---

## 13. Adapter principle

RVCMG provides a basis for an adapter component in which one geometric connection system can transform into another.

The adapter is not defined as a collection of unrelated polygonal caps. Instead, it is a single morphable geometric system whose interface can occupy multiple valid states.

The same underlying component may consequently present different interface geometries while preserving a common connection architecture.

This is the geometric basis of the RVCMG adapter principle.

---

## 14. Face connection

RVCMG does not replace face-based physical connection.

The physical connection occurs through the interface faces of the component. Potential implementations may use mechanical, magnetic, or other face-based coupling systems.

The precise physical connector is an implementation choice and is not part of the mathematical definition of RVCMG. The geometric framework therefore remains independent of a particular hardware mechanism.

---

## 15. Geometric validity rules

A valid RVCMG transformation must satisfy the following principles.

| # | Rule | Description |
|---|------|-------------|
| V1 | Vertex primacy | The primitive transformation acts on interface vertices. |
| V2 | Adjacent coalescence | A primitive coalescence may occur only between adjacent interface vertices. |
| V3 | Coincidence | Coalescence requires the selected vertices to occupy the same geometric position in the resulting state. |
| V4 | Boundary consequence | An edge joining two coalesced adjacent vertices becomes degenerate and is removed from the boundary representation. |
| V5 | Geometry preservation elsewhere | Vertices and interface regions not involved in the transformation must obey the specified deformation rules and must not be arbitrarily regenerated. |
| V6 | Reversibility | Every permitted transformation must have a geometrically defined inverse. |
| V7 | State distinction | Vertex count alone does not uniquely identify a state. |
| V8 | Composite transformations | Multiple primitive coalescences may form a composite transition. |
| V9 | No imposed numerical ordering | The validity of a transformation is determined geometrically, not by whether its vertex counts are numerically adjacent. |
| V10 | Physical interface continuity | The transformed interface must remain a valid physical interface of the underlying component. |

---

## 16. Mathematical form of a primitive transformation

Let the interface state contain vertices `v1, ..., vn`.

For a permitted adjacent pair `(vi, vi+1)`, define a target position `c ∈ R³` for their coalescence.

The transformed vertices satisfy:

> **vi' = vi+1' = c**

All remaining vertices are transformed according to the specified deformation map `Φ: R³ → R³`.

Thus `vj' = Φ(vj)` for vertices not directly coalesced, subject to the geometric constraints of the particular morph.

The resulting state is obtained by removing duplicate coincident vertices from the ordered boundary representation. The mathematical operation is therefore:

> **S' = Distinct(Φ(S))**

with the additional requirement that the coalescence satisfies the RVCMG validity rules.

The framework does not prescribe a single universal interpolation function `Φ`. Different physically realizable morph mechanisms may provide different continuous deformation paths between the same discrete endpoint states.

---

## 17. Continuous morphing and discrete states

RVCMG distinguishes between:

1. a continuous geometric deformation;
2. a discrete topological state.

During a morph, two vertices may approach one another continuously. Before coincidence, they remain two distinct vertices. At coincidence, `vi = vj`, the state has one fewer distinct vertex.

Thus the discrete state transition occurs at a geometrically identifiable event within a continuous deformation.

This allows RVCMG to support both continuous morphing and discrete state classification.

---

## 18. Symmetric versus one-sided paths

Suppose vertices `vi` and `vj` are to coalesce at `c`.

A symmetric path can be written schematically as:

```
vi(t) = (1-t)vi + t*c
vj(t) = (1-t)vj + t*c
```

for `0 ≤ t ≤ 1`. At `t = 1`, `vi(1) = vj(1) = c`.

A one-sided path can instead hold one vertex fixed while moving the other toward it.

Both paths reach a one-vertex coincidence. They are therefore topologically equivalent with respect to vertex count, but not necessarily geometrically equivalent.

This demonstrates why RVCMG must distinguish state topology from morph path.

---

## 19. State graph

The complete RVCMG system can be represented as a graph `G = (S, E)`, where:

- `S` is the set of valid geometric interface states;
- `E` is the set of reversible transformations.

For every transformation `(Si, Sj) ∈ E`, the inverse transformation satisfies `(Sj, Si) ∈ E`.

Therefore the state graph is undirected at the level of valid state connectivity.

A labelled edge may additionally record: which vertices coalesced; the target geometry; the morph path; whether the transition is primitive or composite; and the inverse operation.

This provides a formal framework for representing RVCMG as a reversible geometric state network rather than as a one-way sequence.

---

## 20. Implementation model

An implementation can represent an RVCMG interface using:

- ordered vertex coordinates;
- boundary adjacency;
- state identity;
- permitted coalescence pairs;
- transformation parameters;
- inverse transformation data.

A primitive operation selects a permitted adjacent vertex pair and applies the associated deformation.

The implementation then recomputes or updates: vertex coordinates; coincidence relations; boundary connectivity; vertex count; state identity.

A reverse operation restores the separated state.

The implementation should preserve geometric state rather than identifying states solely by the integer vertex count.

---

## 21. Physical implementation

The mathematical framework is compatible with physical implementations in which the connection surface is subdivided into corresponding interface regions.

The hemi-RD component provides the geometric basis. The adapter's mechanical realization may use: flexible or deformable material; articulated structures; magnetic face connectors; other reversible mechanisms.

These are implementation possibilities rather than mathematical requirements. The mathematical RVCMG state exists independently of the material used to realize it.

---

## 22. Relationship to conventional polygon operations

RVCMG should not be reduced to ordinary polygon simplification.

A conventional polygon algorithm may remove a vertex because it is unnecessary for representing a curve or because a tolerance criterion has been met.

RVCMG is different. The vertices have geometric and physical significance. A vertex disappears only because a specified geometric transformation has caused it to coalesce with another vertex.

The distinction can be expressed as:

> ordinary simplification: **remove** a vertex
> RVCMG: **transform** vertices until coincidence occurs

The resulting reduction in polygon complexity is therefore a consequence of geometry, not an arbitrary simplification rule.

---

## 23. Relationship to edge collapse

Edge collapse is a useful description of the resulting combinatorial change, but it is not the primitive geometric operation.

If `vi = vi+1`, then the edge `[vi, vi+1]` has length `‖vi - vi+1‖ = 0`.

The edge has consequently become degenerate. Its removal from the polygon boundary is therefore mathematically consequential.

Thus:

> **RVCMG is vertex-coalescence geometry whose edge collapses are derived consequences.**

This distinction is fundamental to the framework.

---

## 24. Open geometric requirements

A fully numerical specification of the RVCMG system requires the actual validated coordinates of the hemi-RD interface and the corresponding endpoint configurations.

For a definitive numerical implementation, the following must therefore be fixed from the actual geometry:

1. the six initial interface vertices;
2. the coordinate system and scale;
3. the allowed adjacent-vertex coalescences;
4. the exact coordinates of each validated endpoint state;
5. the geometric constraints governing each morph;
6. the inverse mapping for every reversible transition.

These quantities should be taken from the actual hemi-RD construction, not approximated.

**Resolved (2026-09-15):** the actual hemi-RD interface has been derived from Polyhedraverse's own verified rhombic-dodecahedron registry entry (`app/lib/rvcmg/hemiRdInterface.ts`) and confirmed computationally to be a genuinely non-regular hexagon (D2h symmetry — 4 edges of one length, 2 opposite edges of a longer length). All six requirements above are satisfied by the shipped implementation; see `docs/rvcmg-adapter-pieces-spec.md` for the full record.

---

## 25. Verification requirements

RVCMG should be verified geometrically rather than only visually. For each proposed state transition, verification should establish:

**25.1 Vertex coincidence** — The designated vertices satisfy `‖vi' - vj'‖ = 0` within the numerical tolerance of the implementation.

**25.2 Adjacency validity** — The coalescing vertices were adjacent in the source state.

**25.3 Correct vertex count** — The resulting state contains the expected number of distinct vertices.

**25.4 Boundary validity** — The resulting boundary contains no unintended zero-length edges or invalid crossings.

**25.5 Endpoint geometry** — The resulting interface agrees with the independently specified endpoint geometry.

**25.6 Reversibility** — Applying the inverse transformation restores the original state within numerical tolerance.

**25.7 Path independence where claimed** — If two different transformation paths are claimed to produce the same state, their resulting geometries must be explicitly compared rather than assumed equivalent.

**25.8 State identity** — States having equal vertex counts must not automatically be treated as identical. Their geometric coordinates and connectivity must be compared.

---

## 26. Development status

The conceptual framework establishes:

- the hemi-RD six-vertex interface as the source geometry;
- vertex coalescence as the primitive transformation;
- adjacency as a validity constraint;
- 3-, 4-, 5-, and 6-vertex configurations as principal states;
- composite transformations;
- reversibility;
- a state-graph interpretation;
- separation between morphing vertices and connecting faces.

The numerical endpoint geometries and transformation maps should be regarded as implementation data and independently verified against the actual hemi-RD geometry.

This separation prevents the conceptual framework from being confused with any particular interpolation algorithm or physical mechanism.

**Implemented and independently verified (2026-09-15)**: `coalesce()`, `separate()`, the state graph, `interpolate()`, and the full §25.1–§25.8 verification suite are built and passing (`app/lib/rvcmg/`, `npm run verify:rvcmg-*` + `test:rvcmg`). The framework's own reversibility principle (§9) is additionally proven as a true multiply/divide duality — `splitVertex()` implements the general "one vertex → two" inverse of `coalesce()` for any vertex, not only a vertex previously produced by coalescence — and demonstrated by constructing real 7- and 8-vertex regular interface states from the 6-vertex source (`app/lib/rvcmg/split-demos/`), not only the 3-, 4-, and 5-vertex reductions this document names as the principal states. See `docs/rvcmg-adapter-pieces-spec.md` for the full build record, including the six derived physical adapter states.

---

## 27. Scope and non-claims

RVCMG does not claim to introduce:

- polygonal vertices;
- polygonal edge collapse;
- reversible deformation as a general mathematical concept;
- polyhedral geometry;
- magnetic or mechanical connectors;
- the rhombic dodecahedron itself.

The proposed framework concerns the specific organization of these familiar geometric concepts into a reversible vertex-coalescence system based on the hemi-rhombic-dodecahedral interface.

The principal contribution is the identification and formalization of the interface as a reversible geometric state system whose primitive transformation is vertex coalescence.

---

## 28. Provenance

Reversible Vertex-Coalescence Morphing Geometry (RVCMG) was conceived and developed by James Baker during the development of the Polyhedraverse system in 2026.

The framework arose from the development of transformable polyhedral adapter geometry based on the hemi-rhombic-dodecahedral interface.

Its defining distinction is:

> **Vertices morph. Faces connect.**

---

## 29. Core principle

RVCMG can be reduced to the following sequence:

> hemi-RD interface → vertex transformation → vertex coalescence → new interface state → reversible separation

The geometry is therefore not a collection of independently selected polygons. It is one transformable interface capable of occupying multiple geometrically defined states.

The fundamental principle is:

> **A face is the connection. A vertex is the transformation.**

And the resulting system is not a ladder of polygon counts but a reversible geometric state network:

> **RVCMG = reversible geometry through vertex coalescence.**

---

## Implementation

A staged, Claude-Code-ready implementation plan for this specification (module scaffolding, the `coalesce()`/`separate()` primitives, the state graph, interpolation, and the §25 verification suite) is maintained separately as **`docs/RVCMG-implementation-plan.md`** in the Polyhedraverse project docs. This document is the normative geometric specification; that plan (and its execution) is built against it.

**Status (2026-09-15): built and verified**, `app/lib/rvcmg/` — every stage of the implementation plan, the general multiply/divide duality (`coalesce()`/`splitVertex()`, `separate()` as the narrower coalesce-undo convenience), and a family of physical adapter pieces derived from the hemi-RD interface for real hexagon-, triangle-, square-, pentagon-, rhombus-, and kite-faced polyhedra. Full build record, including real bugs found only by implementing this specification (not by reading it), in **`docs/rvcmg-adapter-pieces-spec.md`**.

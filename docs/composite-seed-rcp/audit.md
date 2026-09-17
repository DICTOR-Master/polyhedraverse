# Stage 0 — Repo Audit

Per `claude_Composite_Seed_RCP_Investigation_Plan.md` Stage 0. Goal: find
and characterize what already exists before building anything new for
the composite-seed investigation. No new geometry in this document —
every claim below is either a direct file citation or a computation run
against the cited file's own exported values.

## 1. The RCP reference engine

**Location:** `app/lib/polyhedra/radialProjection.ts` (549 lines), with a
supporting classifier at `app/lib/polyhedra/fourD.ts` (115 lines).

### 1.1 Formula-level match against RCP.pdf §4–§7

Checked by direct comparison of the repo's own code against
`RCP-spec.md`'s formal statements — not assumed equivalent from naming
alone:

| RCP.pdf quantity | Repo implementation | Match |
|---|---|---|
| `d = r·cot(θ/2)` (seed embedding depth) | `radialProjection.ts:270`: `const depth = inradius / Math.tan(thetaRad / 2);` | Exact — `cot(x) = 1/tan(x)`, `r` = `inradius` (computed at line 244–247 as the face-centroid·own-normal dot product, checked uniform across all faces, throwing if not — line 248–250) |
| `m₀ = normalize(sin(θ/2)·n₀ − cos(θ/2)·f̃)` (bisecting mirror) | `bisectingMirror()`, `radialProjection.ts:107–112`: `norm4([s*n[0]-c*f[0], ...])` with `s=sin(half)`, `c=cos(half)` | Exact |
| `R_m = I − 2mmᵀ` (reflection operator) | `reflectionMatrix()`, `radialProjection.ts:115–123`: `(i===j?1:0) - 2*m[i]*m[j]` | Exact |
| `Π(x,y,z,w) = (x,y,z)/(d_v − w)` (radial projection) | `projectVec4ToVec3()`, `radialProjection.ts:316–319`, with a `MIN_VIEW_DENOMINATOR` clamp for numerical safety near the viewpoint | Exact (clamp is a rendering-safety addition, not a formula change) |
| Four verified (seed, θ) pairs | `FOUR_D_SHAPE_PARAMS`, `radialProjection.ts:156–167`: tetrahedron→16-cell (60°), cube→tesseract (90°), octahedron→24-cell (60°), dodecahedron→120-cell (36°) | Matches RCP.pdf's four cases. Plus two more the repo has *already gone beyond the spec's stated four*: tetrahedron→5-cell (θ=arccos(−1/4), derived not hand-typed, line 154) and, via `dualize()` rather than a direct θ, tetrahedron→600-cell (`build600CellFromDodecahedron()`, line 545–549) — six verified closures total, per `docs/radial-cell-projection.md` section 21 (already noted in this session's earlier README work as more complete than the Downloads copy of the spec). |

**Conclusion:** the reference engine's core primitives (`bisectingMirror`,
`reflectionMatrix`, the `depth` formula, `projectVec4ToVec3`) are a
faithful, already-verified implementation of RCP.pdf §4–§7's formulas.
Per the investigation plan's own instruction ("built on the Stage 0
reference RCP engine's actual `d`, `m₀`, `R_m` definitions... do not
invent a parallel definition"), Stage 1's `rcpMap.ts` should import and
reuse these four functions directly rather than redefining them.

### 1.2 Generic-seed vs. hardcoded — the important nuance for this plan

The plan asks: "note... whether it's generic-seed... or hardcodes the
four cases." The honest answer is **both, at different layers**:

- The **mechanism** (`bisectingMirror`, `reflectionMatrix`, the BFS in
  `buildCellComplex`) is fully seed-agnostic — it operates on any
  `PolyhedronSpec` plus a `theta`, via `buildFaceConnectors(spec)`.
  Nothing in the BFS loop (lines 278–306) references which shape it is.
- The **parameter table** (`FOUR_D_SHAPE_PARAMS`) is a fixed lookup by
  registry id (`D4`/`CUBE`/`D8`/`DODECAHEDRON`), resolved via
  `resolveParamsKey()` (lines 179–187) which also matches any
  vertex-for-vertex congruent duplicate shape — but there is no
  automatic *derivation* of θ for an arbitrary new seed; every entry's
  θ was independently hand-verified (see the file's own header comment,
  lines 18–36) and added by hand.
- **Critically, `buildCellComplex` hard-requires uniform inradius**
  (lines 244–250: `if (inradii.some((r) => Math.abs(r - inradius) >
  1e-6)) throw ...`) — i.e. it requires the seed to be a genuine
  face-transitive regular/uniform solid with ONE well-defined inradius.

**This directly bears on the composite-seed hypothesis.** A finite
aggregate of RD cells assembled into an approximate cube/octahedron
boundary is *not* face-transitive and has no single inradius — its
exposed facets sit at varying distances from the aggregate's centroid
by construction (that's the whole "positional residual" question Stage
2 exists to measure). So `buildCellComplex()` **cannot be called
directly on a composite seed** — it would throw at line 249 before ever
reaching the reflection math. Stage 1's `rcpMap.ts` must reuse the four
primitives in §1.1 above directly (they take `Vec4`s/scalars, not a
`PolyhedronSpec`), but needs its own facet-extraction / boundary logic
for an aggregate — exactly as the plan already anticipates by asking
for new `S_cube(L)`/`S_oct(L)`/`S_tet(L)` boundary-selection functions
rather than reusing `buildFaceConnectors`.

The same nuance applies to `fourD.ts`'s `dihedralAngleDeg()` /
`closureClass()` / `is4DCapable()`: this classifier requires a *single*
dihedral angle across all edges (`fourD.ts:66–70`, throws to `null`
otherwise) — a composite RD aggregate has no single dihedral angle
either (its "seams" are a mix of true RD-RD dihedral angles internally
and cut faces at the boundary). `FOURD_CAPABLE_IDS` (the derived list of
registered shapes eligible for this classifier) is therefore also not
applicable to a composite seed, and Stage 1+ needs to treat θ_cube/θ_oct
as newly-measured quantities from the aggregate's own geometry, not
looked up from this classifier.

### 1.3 Public API surface (for Stage 1's imports)

Everything `radialProjection.ts` exports: `Vec4`, `Mat4x4`, `IDENTITY4`,
`matMul`, `matVec`, `dot4`, `norm4`, `bisectingMirror`,
`reflectionMatrix`, `FourDShapeParams`, `FOUR_D_SHAPE_PARAMS`,
`resolveParamsKey`, `FourDCell`, `FourDCellComplex`, `buildCellComplex`,
`projectVec4ToVec3`, `cellVertices`, `RadialProjectionScene`,
`buildRadialProjectionScene`, `DualCell`, `DualCellComplex`, `dualize`,
`CellLikeCell`, `CellLikeComplex`, `dualToCellLikeComplex`,
`build600CellFromDodecahedron`. (`MAX_CELLS_GUARD` and
`MIN_VIEW_DENOMINATOR` are internal, unexported constants.)

`fourD.ts` exports: `dihedralAngleDeg`, `ClosureKind`, `ClosureOption`,
`closureClass`, `is4DCapable`, `FOURD_CAPABLE_IDS`.

## 2. RD (rhombic dodecahedron) geometry — two independent sources, checked against each other

### 2.1 Polyhedraverse: `app/lib/polyhedra/catalan.ts`

`VERTS_RHOMBIC_DODECAHEDRON` (lines 56–61): 8 order-3 ("cube-type")
vertices at `(±0.5, ±0.5, ±0.5)` and 6 order-4 ("octahedron-type")
vertices at `(±1, 0, 0)`-type positions (the `1.4953e-17` terms
scattered through the array are floating-point noise from the hull-merge
generation process the file's own comment at lines 66–69 describes —
exact zeros, not a real geometric feature).

Registered via `makeSpecByCircumradius()` (`core.ts:116–128`), which
centers the vertex set then divides every vertex by the maximum radius
found. Here the octahedron-type vertices are already at radius exactly
`1.0` (the max), so this normalization is a no-op — `POLYHEDRA.
RHOMBIC_DODECAHEDRON.vertices` is byte-identical to the raw array above:
circumradius 1, cube-type vertices at radius `√3/2 ≈ 0.866`.

Header comment (`catalan.ts:53`) explicitly labels this
`RHOMBIC_DODECAHEDRON — dual of CUBOCTAHEDRON`.

### 2.2 Rhombiverse: `src/core/lattice.js`

`rdRawVerts(s = 1)` (lines 15–21): cube-type vertices at
`(±s/2, ±s/2, ±s/2)`, octahedron-type at `(±s, 0, 0)`-type, built from
`CUBE_VERTS`/`OCTA_VERTS` (lines 5–13). At the default `s = 1` this is
**byte-for-byte the same absolute coordinates** as §2.1: cube-type
`±0.5`, octa-type `±1.0`. The two apps' RD conventions already agree
exactly on shape, orientation, and the relative scale between the two
vertex classes — Rhombiverse just exposes `s` as an explicit size knob
where Polyhedraverse's is fixed by `makeSpecByCircumradius`'s
normalization.

### 2.3 Comparison against the hypothesis doc's §2.1 realization

`RCP-spec.md`'s own hypothesis-doc lineage states RD vertices as
`(±1,±1,±1)` (cube-type) plus `(±2,0,0)`-type (octa-type). **This is
exactly the repo's realization scaled by a uniform factor of 2** — repo
cube-verts × 2 = hypothesis cube-verts, repo octa-verts × 2 = hypothesis
octa-verts. Same shape, same orientation, same vertex-type assignment,
differing only in overall scale. Recorded explicitly per the plan's
instruction to state the exact transform rather than assume equivalence:

```
hypothesis_coords = 2 × repo_coords   (equivalently: repo_coords = 0.5 × hypothesis_coords)
```

Stage 1's `lattice.ts` should pick ONE of these two scales and say so in
a comment, per the plan's own requirement — the repo's own
circumradius-1 convention (§2.1) is the natural choice since it's
already what both `radialProjection.ts` and every other registered
Polyhedraverse solid uses, keeping the composite-seed work on the same
scale as the rest of the registry it will need to interoperate with.

### 2.4 FCC / cuboctahedron-duality claim — confirmed in-repo, not just asserted

The hypothesis doc's claim that "the RD is the FCC Voronoi cell and dual
of the cuboctahedron" is genuinely reflected in existing code on both
sides, checked directly rather than taken on the comment's word:

- Rhombiverse's `NEIGHBOR_OFFSETS` (`lattice.js:141–145`) — the 12 real
  RD face-sharing neighbor directions — are exactly the 12 permutations
  of `(±1, ±1, 0)`.
- Polyhedraverse's own `POLYHEDRA.CUBOCTAHEDRON` raw vertex data
  (`archimedean.ts:82–86`, `VERTS_CUBOCTAHEDRON`) is **exactly the same
  12 permutations of `(±1, ±1, 0)`** — confirmed by direct comparison of
  the two arrays' values, not inferred from either file's naming.
- `isValidCell(x,y,z)` (`lattice.js:160–162`, `(x+y+z) % 2 === 0`) is the
  standard FCC lattice parity constraint, confirming the RD centers are
  already treated as FCC lattice points in Rhombiverse's own code, not
  just described that way in prose.

**Conclusion:** the RD-dual-of-cuboctahedron / FCC-Voronoi-cell claim is
already structurally present in-repo (same 12 directions used for both
the RD's face normals and the cuboctahedron's vertices), and does not
need to be re-derived from scratch in Stage 1 — it can be cited to these
four exact locations.

## 3. What Stage 1+ must build new (nothing reused silently)

| Stage 1 deliverable | Reuses (cited) | New work required |
|---|---|---|
| `lattice.ts` | RD vertex data (§2.1/§2.2), `NEIGHBOR_OFFSETS` (§2.4) — pick repo's circumradius-1 scale (§2.3) | Export as named constants/functions in the plan's required shape (cell-centre lattice Λ_RD, offsets Δ_RD, facet-centroid offsets, facet normals) — none of these exist pre-packaged in either app today; `lattice.js`'s exports serve Rhombiverse's own render/collision needs, not this plan's Appendix A checklist verbatim |
| `rcpMap.ts` | `bisectingMirror`, `reflectionMatrix`, the `depth = r·cot(θ/2)` formula, `norm4`/`matVec` (§1.1) — reuse directly, not reimplement | The map itself (`𝒜_RD → 𝒮_eff`) — `buildCellComplex()` cannot be reused directly (§1.2, uniform-inradius requirement) |
| `S_cube(L)`, `S_oct(L)`, `S_tet(L)` | — | Entirely new; no boundary-selection-by-aggregate code exists in either app today |

## 4. Acceptance check

Per Stage 0's acceptance criterion ("every geometric primitive used in
later stages is traced to either (a) existing repo code, cited by path,
or (b) new code this plan will produce"): §1–§2 above trace every reused
primitive to an exact file/line citation; §3 explicitly lists what has
no existing counterpart and must be built fresh in Stage 1. Nothing in
this document was re-derived from memory — every formula and coordinate
claim was checked against the cited file's actual current contents on
2026-09-17.

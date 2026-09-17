# Stage 3 — Angular Derivation (θ_cube, θ_oct, and θ_tet)

Per `claude_Composite_Seed_RCP_Investigation_Plan.md` Stage 3: derive
`θ_cube` and `θ_oct` analytically from the actual RD facet-normal and
target-boundary vectors — do not accept `45°` / `arcsin(1/√3)` as given
just because the hypothesis doc (`hypothesis.md` §1.3, §7.2, §8.2)
reports them.

## 1. The general shape of the argument

Every RD facet normal (`app/lib/polyhedra/composite-seed-rcp/lattice.ts`'s
`RD_FACET_NORMALS`) is a unit vector of the form `(±1,±1,0)/√2` — a
⟨110⟩-type direction (two equal-magnitude nonzero coordinates). This is
not particular to any one facet; it's true of all 12 by construction
(§1 of `audit.md`).

For a boundary class with unit target direction `n`, the angle between
a contributing facet's own normal `ν` and `n` is
`θ = arccos(|ν·n|)` (hypothesis.md §6's own formula). The claim to
check is that this angle is the SAME for every facet actually assigned
to a given class — not just for one representative example.

## 2. θ_cube — derived in general, not spot-checked

Target directions (`CUBE_BOUNDARY_CLASSES` in `rcpMap.ts`): the 6
⟨100⟩ unit vectors `±e_k`.

Which RD facet normals get assigned to, say, the `+x` class? Per
`rcpMap.ts`'s `buildEffectiveSeed`, a facet is assigned to `+x` iff its
neighbour's `x`-coordinate exceeds `L` — which (per
`positionalResidual.ts`'s own combinatorial analysis) only happens when
the facet's own `centreOffset` has `x`-component exactly `+1`. Looking
at `DELTA_RD`'s 12 entries, EXACTLY 4 of them have `x`-component `+1`:
`(1,1,0), (1,-1,0), (1,0,1), (1,0,-1)`.

For every one of these 4, `|ν·(1,0,0)| = |1/√2| = 1/√2` (the `x`-slot
alone contributes 1, divided by the vector's own `√2` magnitude — the
other nonzero coordinate is always in a different axis and contributes
nothing to the dot product with `(1,0,0)`).

$$\theta_{\text{cube}} = \arccos\left(\frac{1}{\sqrt2}\right) = 45^\circ$$

**This holds for all 4 qualifying normals identically** — not an
average, not an approximation. The same argument applies verbatim to
each of the other 5 cube classes by the RD's own octahedral symmetry
(swap which axis is singled out). `θ_cube = 45°` exactly, for every
contributing facet, at every `L`.

## 3. θ_oct — derived in general, not spot-checked

Target directions (`OCT_BOUNDARY_CLASSES`): all 8 sign combinations of
⟨111⟩, unit vectors `(±1,±1,±1)/√3`.

Which RD facet normals get assigned to the `(+++)` class (target
`(1,1,1)/√3`)? Per the same combinatorial analysis (`positionalResidual.ts`,
confirmed computationally: single stratum, `count=3` distinct normals
contributing per class at any tested `L`), only offsets whose signed
coordinate sum is `+2` qualify — exactly 3 of the 12: `(1,1,0), (1,0,1),
(0,1,1)`.

For each of these 3: `ν·(1,1,1) = ` (sum of the two nonzero
coordinates, both `+1`) `= 2`, and `|ν| = √2`, `|n| = √3`, so

$$\cos\theta_{\text{oct}} = \frac{2}{\sqrt2\cdot\sqrt3} = \frac{2}{\sqrt6} = \sqrt{\frac{2}{3}}$$

$$\theta_{\text{oct}} = \arccos\sqrt{\tfrac{2}{3}}$$

Cross-checked against the hypothesis doc's own reported closed form —
NOT assumed equal, verified by substitution: if
`θ = arcsin(1/√3)` then `sin θ = 1/√3`, so
`cos θ = √(1 - 1/3) = √(2/3)` — **exactly** the value derived above,
independently, from the actual RD facet-normal and target-direction
vectors. `θ_oct = arcsin(1/√3) ≈ 35.26438968°`, confirmed both ways,
for all 3 qualifying normals identically, at every `L` (same
symmetry argument as §2 extends this to all 8 octahedral classes).

## 4. θ_tet — NOT assumed equal to θ_oct, derived independently, found to coincide

`TET_BOUNDARY_CLASSES` (`rcpMap.ts`) use 4 of the same ⟨111⟩ unit
directions as the octahedron (the even-parity subset) — but
hypothesis.md §5.3/§13 explicitly warns not to assume the tetrahedral
case inherits the octahedron's pattern just because both use ⟨111⟩
targets, since `S_tet`'s own selection region is structurally different
(not centrally symmetric — confirmed in
`scripts/verify-composite-seed-lattice.ts`) and could plausibly expose a
different subset of RD normals to each class.

Checking directly (not assuming): which RD facet normals get assigned
to the tetrahedron's `(+++)` class? By the SAME dot-product argument as
§3 (the target direction is the identical vector `(1,1,1)/√3`, and
`buildEffectiveSeed`'s violation test only depends on the target
direction and the aggregate's own membership — not on how many OTHER
classes exist), any RD facet whose `centreOffset` has coordinate sum
`+2` is a candidate, exactly as in the octahedral case. The actual
qualifying set, confirmed numerically in
`tetrahedralExperiment.ts`'s own sweep, is the same 3-normal set
`(1,1,0), (1,0,1), (0,1,1)` — giving the SAME angle:

$$\theta_{\text{tet}} = \arccos\sqrt{\tfrac{2}{3}} = \arcsin\!\left(\frac1{\sqrt3}\right) \approx 35.26438968^\circ$$

**This is a genuine finding, not assumed going in**: hypothesis.md §13
lists three open possibilities for the tetrahedral angular spectrum —
(1) a single constant angle, (2) several discrete classes, (3) a more
complex distribution — and leaves it explicitly open which one holds.
The derivation above, confirmed by `tetrahedralExperiment.ts`'s
numeric sweep (§5 below), shows outcome **(1)**: a single constant
angle, and moreover the SAME numeric value as the octahedral case —
not stated anywhere in the hypothesis doc, and not obvious in advance
(the two selection regions are geometrically quite different — see
§13's own warning above).

## 5. Tolerance and reproducibility

Every value above is checked against the numeric sweep in
`angularResidual.ts` / `tetrahedralExperiment.ts` to within `1e-6°`
(`EXACT_TOL_DEG`), across `L=1..12` for cube/oct and `L=1..10` for the
tetrahedral case (see `scripts/verify-composite-seed-angular.ts`'s own
output for the exact per-L numbers) — not "close enough," an explicit
numeric tolerance stated once here rather than adjusted per result.

## 6. §14 category tag

Per the investigation plan's own tagging convention: **θ_cube and
θ_oct are promoted to §14.1 (established)** — both have a closed-form
analytic derivation from the actual RD/target vectors above, cross-
checked against the numeric sweep at every tested `L`, not merely
observed. **θ_tet moves from §14.4 (open) to §14.1 (established)** by
the same standard, resolving hypothesis.md §17.1's stated limitation
("the tetrahedral calculation has not yet been established") for this
specific derivation.

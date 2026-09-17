# Composite-Seed RCP Investigation — Report

Status as of 2026-09-17. Covers Stages 0–5 of
`claude_Composite_Seed_RCP_Investigation_Plan.md` in full. **Stage 6
(latent reflection-group question) is explicitly NOT attempted** — see
§5 below for why, rather than a shallow, inconclusive pass presented as
done. Every numeric claim below traces to a specific file and was
measured, not copied from `hypothesis.md`.

## 1. Established background (§14.1)

Unchanged from `hypothesis.md` §14.1, re-confirmed against Stage 0's
audit (`audit.md`): the RD is a 12-faced, space-filling polyhedron,
dual of the cuboctahedron, associated with FCC packing (`audit.md` §2.4
confirms this structurally in-repo, not just by citation). The six
regular convex 4-polytopes and their Coxeter types (A4/B4/F4/H4) are
standard and unchanged.

**Newly promoted to §14.1 this investigation** (were §14.2/§14.3/§14.4
in `hypothesis.md`):

- `θ_cube = 45°` and `θ_oct = arcsin(1/√3)` — both now have a closed-form
  analytic derivation from the actual RD facet-normal and target-
  direction vectors (`angularDerivation.md` §2–§3), not merely observed
  numerically.
- `θ_tet` — resolves `hypothesis.md` §17.1's stated limitation
  ("has not yet been established"). Derived analytically
  (`angularDerivation.md` §4) and confirmed by sweep
  (`tetrahedralExperiment.ts`, `L=1..10`): **`θ_tet = θ_oct` exactly**,
  not a new value.
- Proposition P1 (positional closure) for **cube, octahedron, AND
  tetrahedron** — the tetrahedral case was untested in `hypothesis.md`
  and is a genuine addition here (§5 of `tetrahedralExperiment.ts`'s own
  output).

## 2. Computed results (§14.2)

None remain in this weaker category for cube/oct/tet's core P1/P2
numbers — all were promoted to §14.1 above once the analytic derivation
matched the numeric sweep. What remains genuinely §14.2 (measured, no
closed-form proof yet):

- The exact facet-count growth of each selection region with `L`
  (e.g. cube class sizes `340, ...` at `L=6` — `positionalResidual.test.ts`'s
  own output) — a real, reproducible measurement, but no closed-form
  formula was derived for it in this pass.

## 3. Results now analytically proved vs. still requiring proof

**Proved** (this investigation, not `hypothesis.md`):
- `ε_pos(L) = 0` exactly for cube, octahedron, and tetrahedron, at
  every tested `L` (cube/oct: `L=1..12`; tet: `L=1..10`), via a real
  combinatorial-stratum argument (`positionalResidual.ts`'s
  `analyzeCombinatorialStrata`), not only a numeric near-zero
  measurement. `hypothesis.md` §14.3 asked for exactly this proof; it
  is done for all three shapes.
- `θ_cube`, `θ_oct`, `θ_tet` — closed-form, general derivations
  (`angularDerivation.md`), not spot-checked on one example each.

**Still requiring proof:**
- WHY the octahedron's and tetrahedron's target direction families
  necessarily draw the SAME 3-normal subset of Δ_RD (both landing on
  the coordinate-sum-`+2` offsets) is shown by direct computation and a
  short combinatorial argument (`angularDerivation.md` §4), but a fully
  general statement — "for ANY sign-restricted subset of ⟨111⟩ used as
  target directions, the qualifying RD-normal subset and angle are the
  same" — was checked for the two cases tested here, not proved for
  every possible subset in the abstract.
- Facet-count growth formulas (§2 above).

## 4. Open hypotheses (§14.4)

- **The latent reflection-group question (Stage 6, hypothesis.md
  §11–§12) remains fully open.** Not attempted in this pass — see §5.
- Generality across OTHER RD selection rules beyond cube/oct/tet
  (hypothesis.md's own "generality across other RD selection rules"
  open item) — untested here.
- Whether the RD `⟨110⟩` geometry is naturally associated with some
  OTHER 4D structure beyond the four already-verified RCP closures —
  untested here.

## 5. Why Stage 6 is deferred, not faked

Stage 6 asks for the complete microscopic hyperplane system's Gram
matrix, its positive-definiteness/rank, AND an orbit-growth test "run
to enough depth to distinguish slow finite convergence from genuine
unboundedness, not stopped early" (the plan's own words). This is
qualitatively different from Stages 3–5: those each had a single
closed-form answer to find and confirm. Stage 6 is an open-ended
computational search with no guaranteed termination criterion — a
shallow pass (a few iterations, a small Gram matrix) would produce a
number that LOOKS like an answer but isn't backed by the "run to enough
depth" standard the plan itself sets. Rather than report a shallow
orbit-growth run as if it settled the question, this is left explicitly
for a dedicated follow-up pass with its own time budget. **This is not
"harder than expected mid-task" — it was foreseeable from the plan text
itself and is called out here rather than discovered as a surprise.**

## 6. Final verdict — Propositions P1 and P2, per shape

| Shape | P1 (positional) | P2 (orientational, `lim_{L→∞} ε_ang(L)=0`) |
|---|---|---|
| Cube | **CONFIRMED** — exact at every tested `L`, proved combinatorially | **REFUTED** for this construction — `ε_ang(L) = 45°` constant at every tested `L`, Coxeter-compatible (`m=4`) but that alone doesn't rescue P2 |
| Octahedron | **CONFIRMED** — exact at every tested `L`, proved combinatorially | **REFUTED** for this construction — `ε_ang(L) = arcsin(1/√3) ≈ 35.264°` constant at every tested `L`, not Coxeter-compatible with any integer `m` |
| Tetrahedron | **CONFIRMED** — exact at every tested `L` (new result; untested in `hypothesis.md`) | **REFUTED** for this construction — `ε_ang(L) = arcsin(1/√3)` constant (same value as octahedron, a genuine finding — see below), not Coxeter-compatible |

Per `hypothesis.md` §4.2's own framing: this refutation is scoped to
**this specific fine-grained RCP/facet interpretation** — it does not
rule out another projection, another microscopic data choice, another
RD-derived composite, or a different higher-dimensional structure
generated by the fixed-angle mirrors (Stage 6's own open question).

## 7. The one finding not anticipated by either source document

`θ_tet = θ_oct` exactly, not merely "also a single constant angle."
The reason, once seen, is structural rather than coincidental: the
angular offset between an RD facet normal (always ⟨110⟩-type) and a
target direction depends ONLY on which direction FAMILY the target
belongs to — `⟨100⟩` gives `45°`, `⟨111⟩` gives `arcsin(1/√3)` — not on
which particular sign-restricted subset of that family is used, nor on
the shape of the selection region built around it. The octahedron uses
all 8 ⟨111⟩ directions; the tetrahedron uses only the even-parity 4;
both land on the identical qualifying RD-normal subset and therefore
the identical angle. The "two flat lines" phenomenon `hypothesis.md`
describes is, at bottom, a statement about the relationship between two
FIXED direction families (⟨110⟩ vs. ⟨100⟩/⟨111⟩) — the specific target
solid (cube, octahedron, or tetrahedron) is almost incidental to it.

/**
 * Canonical family/facet data layer, shared by PolyhedralWheel and the
 * ShapeBrowser (karaoke-style picker). Single source of truth so the two
 * UIs can never disagree about family membership, labels, or symbols.
 *
 * A shape's family isn't always singular. The registry's own comments say
 * so directly: platonic.ts skips the tetrahedron/octahedron/icosahedron
 * because "they're D4/D8/D20 in ./deltahedra.ts" (they ARE Platonic
 * solids, just not re-derived there), and prisms.ts skips the 4-gonal
 * prism and 3-gonal antiprism because those ARE the cube and the
 * octahedron. So a shape can carry more than one family tag -- encoded
 * below as an explicit, documented overlap patch (EXTRA_MEMBERSHIP)
 * layered on top of the registry's own per-family id arrays, never
 * guessed at runtime.
 */

import {
  POLYHEDRA,
  DELTAHEDRON_IDS,
  PLATONIC_ADDITION_IDS,
  ARCHIMEDEAN_ADDITION_IDS,
  JOHNSON_ADDITION_IDS,
  CATALAN_ADDITION_IDS,
  PRISM_ANTIPRISM_ADDITION_IDS,
  MISCELLANEOUS_ADDITION_IDS,
  type PolyhedronSpec,
} from './index';
import { POLYTOPE_4D_IDS } from './polytopes4d';
import { APERIODIC_ADDITION_IDS, APERIODIC_PAIRS } from './aperiodic';
import { BRIDGES_3D_IDS } from './bridges';
import { STELLATION_IDS } from './stellations';

export type FamilyKey =
  | 'DELTAHEDRA'
  | 'PLATONIC'
  | 'ARCHIMEDEAN'
  | 'JOHNSON'
  | 'CATALAN'
  | 'PRISMS'
  | 'ANTIPRISMS'
  | 'BRIDGES_3D'
  | 'POLYTOPES_4D'
  | 'STELLATIONS'
  | 'PARALLELOHEDRA'
  | 'SPACE_FILLING_PAIRS'
  | 'APERIODIC'
  | 'MISCELLANEOUS';

// Parallelohedra + Space-Filling Pairs moved up next to the classical
// families (direct request 2026-09-24: "should be higher up list rather
// than next to miscellaneous") -- Fedorov's five and their pair
// companions are headline results, not catch-all add-ons. Wheel faces are
// keyed by FamilyKey (PolyhedralWheel's FAMILY_FACE_SLOTS), not by this
// order, so the wheel is unaffected.
export const FAMILY_ORDER: FamilyKey[] = [
  'DELTAHEDRA',
  'PLATONIC',
  'ARCHIMEDEAN',
  'JOHNSON',
  'CATALAN',
  'STELLATIONS',
  'PARALLELOHEDRA',
  'SPACE_FILLING_PAIRS',
  'APERIODIC',
  'PRISMS',
  'ANTIPRISMS',
  'BRIDGES_3D',
  'POLYTOPES_4D',
  'MISCELLANEOUS',
];

// Single source of truth for both PolyhedralWheel and the ShapeBrowser
// (HomeScreen/SearchScreen already import FAMILY_META directly, so a
// symbol changed here updates everywhere at once -- there was never
// actually a second, independently-chosen "karaoke view" symbol set to
// reconcile, just a request for more universally-distinct glyphs).
// Revised for real distinctiveness, not picked freehand: every symbol
// has its own base SHAPE (triangle/pentagon/hexagon/diamond/rectangle),
// no two sharing one the way Catalan's old small-diamond (⬦) and
// Platonic's own diamond (◇) once did. Outline-vs-filled is used
// deliberately, not decoratively, for the two families with a genuine
// real-world relationship: Archimedean/Catalan (true polar duals -- see
// this level's own comment in PolyhedralWheel.tsx) share the hexagon
// outline/fill pair, and Prisms/Antiprisms (a natural paired
// construction family, though not strict duals of each other) share
// the rectangle outline/fill pair -- so the symbol choice itself
// reinforces which families are related, not just avoids collisions.
// PLATONIC is a pentagon (⬠) as a direct count mnemonic -- there are
// exactly five Platonic solids. JOHNSON took over the diamond (◇) that
// pentagon displaced (Johnson has no dual/pairing relationship to
// encode, so any distinct outline shape works). ★ is deliberately
// NOT used by any convex family here -- reserved for a possible future
// non-interactive "star polyhedra" category (Kepler-Poinsot and other
// non-convex forms), where it would actually mean something.
export const FAMILY_META: Record<FamilyKey, { label: string; symbol: string }> = {
  DELTAHEDRA: { label: 'Deltahedra', symbol: '△' },
  PLATONIC: { label: 'Platonic', symbol: '⬠' },
  ARCHIMEDEAN: { label: 'Archimedean', symbol: '⬡' },
  JOHNSON: { label: 'Johnson', symbol: '◇' },
  CATALAN: { label: 'Catalan', symbol: '⬢' },
  // Stellations (stellations/): face pieces that stellate the Platonic
  // and Catalan solids, from flat to their third stellation. A four-
  // pointed star, distinct from the star-polyhedra ★ and Aperiodic ✺.
  STELLATIONS: { label: 'Stellations', symbol: '✦' },
  PRISMS: { label: 'Prisms', symbol: '▭' },
  ANTIPRISMS: { label: 'Antiprisms', symbol: '▬' },
  // 4D Polytopes (polytopes4d.ts, direct decisions 2026-09-30): the six
  // convex regular 4-polytopes themselves, each built by RCP-C2B from its
  // seed cell. Not 3D shapes, so its members are polytope ids, not
  // registry ids. It replaces the old 4D-Capable family of seed cells,
  // which live on in 3D+ Bridges' Cells section; the gold 4D badge still
  // marks them (FOURD_CAPABLE_IDS). "Two joined squares" evokes the
  // tesseract's classic projection.
  POLYTOPES_4D: { label: '4D Polytopes', symbol: '⧉' },
  // 3D+ Bridges (bridges.ts): 3D shapes that cross a dimensional boundary; the
  // "+" matches Rhombiverse's 1D+/2D+/3D+ naming. A diagonal
  // two-way arrow: passing between dimensions, distinct from ⇄ (pairs).
  BRIDGES_3D: { label: '3D+ Bridges', symbol: '⤢' },
  // Fedorov's 5 real parallelohedra (Cube, Hexagonal Prism, Rhombic
  // Dodecahedron, Elongated Dodecahedron, Truncated Octahedron) -- the
  // only convex solids that tile 3D space by translation alone. A
  // cross-cutting family layered on top of each shape's own native family
  // (all keep their original membership; see BASE_IDS.PARALLELOHEDRA
  // below), not a new geometry source. The orthogonal-crosshatch "mosaic"
  // glyph reads as tiled squares -- the defining property of this family
  // -- distinct from 4D Polytopes' diagonal-crosshatch ⧉ (a
  // tesseract-projection cue, not a tiling one).
  PARALLELOHEDRA: { label: 'Parallelohedra', symbol: '▦' },
  // Space-Filling Pairs (2026-09-24, direct request: "complementary space
  // fillers... pairs that fill space together") -- the companion to
  // Parallelohedra: shapes that can't tile space alone but DO as a pair.
  // A half-filled circle reads as "two halves make a whole", and the
  // circle is a base shape no other family symbol uses.
  SPACE_FILLING_PAIRS: { label: 'Space-Filling Pairs', symbol: '◐' },
  // Graded pyramids and, eventually, the RVCMG adapter pieces (see
  // docs/rvcmg-adapter-pieces-spec.md) -- irregular add-ons that don't
  // belong to one of the classical families above. A house/roof
  // pictograph reads as "a peaked shape sitting on a base," distinct
  // from every base shape already claimed above (no outline triangle,
  // pentagon, hexagon, diamond, or rectangle reused).
  APERIODIC: { label: 'Aperiodic Sets', symbol: '✺' },
  MISCELLANEOUS: { label: 'Miscellaneous', symbol: '⌂' },
};

// Base membership, derived (never hand-copied) from the registry's own
// per-family id arrays. PRISM_ANTIPRISM_ADDITION_IDS arrives as a single
// merged array from prisms.ts (built from both PRISM_<n>/ANTIPRISM_<n>
// keys) -- split it by id prefix so Prisms and Antiprisms are two
// separate, independently browsable families.
/**
 * Space-Filling Pairs: two convex shapes that together tile 3D space
 * face-to-face, each a classical uniform honeycomb (confirmed with the
 * user 2026-09-24, all 7; the 12-gonal prism + triangular prism pair also
 * qualifies but this registry's prisms stop at 10 sides). Every pair is
 * re-checked by scripts/verify-space-filling-pairs.py (dihedral angles
 * closing to 360 degrees around each edge type) -- not taken on
 * reputation alone.
 */
export const SPACE_FILLING_PAIR_LIST: Array<{ ids: [string, string]; honeycomb: string }> = [
  { ids: ['D4', 'D8'], honeycomb: 'Octet truss (tetrahedral-octahedral)' },
  { ids: ['D4', 'TRUNCATED_TETRAHEDRON'], honeycomb: 'Pyrochlore (quarter cubic)' },
  { ids: ['D8', 'CUBOCTAHEDRON'], honeycomb: 'Rectified cubic' },
  { ids: ['D8', 'TRUNCATED_CUBE'], honeycomb: 'Truncated cubic' },
  { ids: ['CUBE', 'PRISM_3'], honeycomb: 'Elongated triangular prismatic' },
  { ids: ['PRISM_3', 'PRISM_6'], honeycomb: 'Trihexagonal prismatic' },
  { ids: ['CUBE', 'PRISM_8'], honeycomb: 'Truncated square prismatic' },
];

/** Fedorov's five parallelohedra, one of each type in its most symmetric form. */
export const FEDOROV_FIVE = ['CUBE', 'PRISM_6', 'RHOMBIC_DODECAHEDRON', 'ELONGATED_DODECAHEDRON', 'TRUNCATED_OCTAHEDRON'];
/**
 * Notable variants (direct decision 2026-09-30: "Fedorov's five + notable
 * variants"): sheared members of the same types that fill space by
 * translation just the same. The rhombohedron (a sheared cube), DICTO's
 * Zometool leaning hexagonal prism and its two blocks (parallelepipeds).
 */
export const PARALLELOHEDRON_VARIANTS = ['RHOMBOHEDRON', 'DICTO_LEANING_HEX_PRISM', 'DICTO_SQUARE_FACED_BLOCK', 'DICTO_ALL_RHOMBUS_BLOCK', 'DICTO_SKEWED_RD', 'DICTO_FLATTENED_RHOMBOHEDRON'];
// Cells found and checked in Kaleidoverse (direct request 2026-10-01: the
// Bain stretch's equal-edge cells, grouped as "Kaleidoverse verified").
export const KALEIDOVERSE_VERIFIED = ['BAIN_RD', 'REGULAR_HEX_ED', 'BAIN_ED'];
// The regular nine (direct request 2026-10-01): every equal-edge space-filler
// whose faces are only squares, regular hexagons and 60 degree rhombi, found
// complete by Kaleidoverse's two-way search. Five were already here; the
// four new ones (miscellaneous/regular-nine) are REGULAR_NINE_NEW.
export const REGULAR_NINE_NEW = ['RHOMBOHEDRON_60', 'RHOMBIC_PRISM_60', 'LEANING_SQUARE_PRISM', 'LEANING_HEX_PRISM_60'];
export const REGULAR_NINE = ['CUBE', 'RHOMBOHEDRON_60', 'LEANING_SQUARE_PRISM', 'RHOMBIC_PRISM_60', 'PRISM_6', 'LEANING_HEX_PRISM_60', 'BAIN_RD', 'REGULAR_HEX_ED', 'TRUNCATED_OCTAHEDRON'];

const BASE_IDS: Record<FamilyKey, string[]> = {
  DELTAHEDRA: DELTAHEDRON_IDS,
  PLATONIC: PLATONIC_ADDITION_IDS,
  ARCHIMEDEAN: ARCHIMEDEAN_ADDITION_IDS,
  JOHNSON: JOHNSON_ADDITION_IDS,
  CATALAN: CATALAN_ADDITION_IDS,
  STELLATIONS: STELLATION_IDS,
  PRISMS: PRISM_ANTIPRISM_ADDITION_IDS.filter((id) => id.startsWith('PRISM_')),
  ANTIPRISMS: PRISM_ANTIPRISM_ADDITION_IDS.filter((id) => id.startsWith('ANTIPRISM_')),
  POLYTOPES_4D: POLYTOPE_4D_IDS,
  // The 5 real Fedorov parallelohedra, by their existing POLYHEDRA ids
  // (CUBE: platonic.ts: PRISM_6: prisms.ts; RHOMBIC_DODECAHEDRON:
  // catalan.ts; ELONGATED_DODECAHEDRON: miscellaneous/rd-relatives;
  // TRUNCATED_OCTAHEDRON: archimedean.ts) -- a cross-cutting list, not a
  // new geometry source. Curated by hand, since there are exactly 5 types
  // and they're a fixed, named mathematical result (Fedorov 1885).
  PARALLELOHEDRA: [...FEDOROV_FIVE, ...PARALLELOHEDRON_VARIANTS, ...KALEIDOVERSE_VERIFIED, ...REGULAR_NINE_NEW],
  // Every shape appearing in SPACE_FILLING_PAIRS below (deduped) -- the
  // pair structure itself is what the browser shows (pair rows), this is
  // just membership for counts/search/cross-family badges.
  SPACE_FILLING_PAIRS: Array.from(new Set(SPACE_FILLING_PAIR_LIST.flatMap((p) => p.ids))),
  // ELONGATED_DODECAHEDRON moves OUT of Miscellaneous into its real
  // family above (Miscellaneous was always just a catch-all for shapes
  // without a proper family, and Parallelohedra is one). Every other
  // Miscellaneous shape's membership is untouched.
  // Two aperiodic pairs (aperiodic.ts): the golden rhombohedra (the 3D
  // Penrose tiling) and the Penrose rhombus prisms. Each piece fills
  // space alone; each pair can also fill it with no repeat.
  APERIODIC: APERIODIC_ADDITION_IDS,
  BRIDGES_3D: BRIDGES_3D_IDS,
  MISCELLANEOUS: MISCELLANEOUS_ADDITION_IDS.filter((id) => id !== 'ELONGATED_DODECAHEDRON'),
};

// Explicit, documented cross-family overlap patch -- encodes facts that
// today only live as comments in platonic.ts / prisms.ts, plus the
// registry's own deliberate split of "strictly convex deltahedra" into
// their own D-id family instead of J-numbering them:
//   - D4 (tetrahedron), D8 (octahedron), D20 (icosahedron):
//     Deltahedra AND Platonic
//   - CUBE: Platonic AND Prisms ("PRISM_4 = CUBE, already Platonic")
//   - D8 (octahedron): also Antiprisms ("ANTIPRISM_3 = OCTAHEDRON")
//   - D6/D10/D12/D14/D16: Deltahedra AND Johnson -- these ARE the
//     canonical J12 (triangular bipyramid), J13 (pentagonal bipyramid),
//     J84 (snub disphenoid), J51 (triaugmented triangular prism), and J17
//     (gyroelongated square bipyramid) respectively, just stored under
//     their D-id here rather than duplicated as separate J-id entries.
//     Without this patch, familyIds('JOHNSON') undercounts at 87 instead
//     of the canonical 92, and these 5 shapes wouldn't be findable by
//     filtering/searching for "Johnson" even though they genuinely are
//     Johnson solids.
// Keyed by the REAL POLYHEDRA id used elsewhere (D4/D8/D20/CUBE/D6/D10/
// D12/D14/D16), never a synthetic PRISM_4/ANTIPRISM_3/J12/J13/J17/J51/J84
// id -- those are never separate POLYHEDRA entries, and BASE_IDS above
// already correctly omits them.
const EXTRA_MEMBERSHIP: Array<{ id: string; family: FamilyKey }> = [
  { id: 'D4', family: 'PLATONIC' },
  { id: 'D8', family: 'PLATONIC' },
  { id: 'D20', family: 'PLATONIC' },
  { id: 'CUBE', family: 'PRISMS' },
  { id: 'D8', family: 'ANTIPRISMS' },
  { id: 'D6', family: 'JOHNSON' },
  { id: 'D10', family: 'JOHNSON' },
  { id: 'D12', family: 'JOHNSON' },
  { id: 'D14', family: 'JOHNSON' },
  { id: 'D16', family: 'JOHNSON' },
];

const membershipMap: Map<string, Set<FamilyKey>> = (() => {
  const m = new Map<string, Set<FamilyKey>>();
  const add = (id: string, family: FamilyKey) => {
    if (!m.has(id)) m.set(id, new Set());
    m.get(id)!.add(family);
  };
  for (const family of FAMILY_ORDER) {
    for (const id of BASE_IDS[family]) add(id, family);
  }
  for (const { id, family } of EXTRA_MEMBERSHIP) add(id, family);
  return m;
})();

/** Every family a shape belongs to, in canonical FAMILY_ORDER order. */
export function familiesFor(specOrId: PolyhedronSpec | string): FamilyKey[] {
  const id = typeof specOrId === 'string' ? specOrId : specOrId.id;
  const set = membershipMap.get(id);
  if (!set) return [];
  return FAMILY_ORDER.filter((f) => set.has(f));
}

// Within a family, order by face type then face count, smallest to
// largest -- a geometrically intuitive browse order (simplest/most
// familiar shapes first) rather than registry-insertion order. Moved
// here (verbatim from PolyhedralWheel.tsx) so both the wheel and the new
// browser derive catalog numbers from the exact same order.
export function faceTypeSortKey(id: string): [number, number, number] {
  const spec = POLYHEDRA[id];
  const faceSizes = spec.faces.map((f) => f.length);
  const distinctSizes = new Set(faceSizes);
  return [Math.min(...faceSizes), distinctSizes.size, spec.faceCount];
}

function sortByFaceType(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const ka = faceTypeSortKey(a);
    const kb = faceTypeSortKey(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return 0;
  });
}

const familyIdsCache = new Map<FamilyKey, string[]>();

/** Every shape id in a family (base + documented overlaps), face-type sorted. */
export function familyIds(family: FamilyKey): string[] {
  const cached = familyIdsCache.get(family);
  if (cached) return cached;
  // The 4D polytopes aren't 3D shapes: they keep their own order (A4, B4, F4, H4).
  if (family === 'POLYTOPES_4D') {
    familyIdsCache.set(family, BASE_IDS.POLYTOPES_4D);
    return BASE_IDS.POLYTOPES_4D;
  }
  const ids = sortByFaceType(
    FAMILY_ORDER.includes(family)
      ? Array.from(new Set([...BASE_IDS[family], ...EXTRA_MEMBERSHIP.filter((e) => e.family === family).map((e) => e.id)]))
      : [],
  );
  familyIdsCache.set(family, ids);
  return ids;
}

/** 1-indexed catalog position of every shape within a given family's own order. */
export function catalogByFamily(family: FamilyKey): Record<string, number> {
  const ids = familyIds(family);
  return Object.fromEntries(ids.map((id, i) => [id, i + 1]));
}

/**
 * A shape's complementary pieces: its Space-Filling Pairs partners (in
 * list order) and its Aperiodic Sets partner. The face-attach
 * picker lists these first (direct request 2026-09-30: "the complementary
 * pair piece should be at top of choices").
 */
export function pairPartners(id: string): string[] {
  const out: string[] = [];
  for (const { ids: [a, b] } of SPACE_FILLING_PAIR_LIST) {
    if (a === id && !out.includes(b)) out.push(b);
    if (b === id && !out.includes(a)) out.push(a);
  }
  for (const [a, b] of APERIODIC_PAIRS) {
    if (a === id && !out.includes(b)) out.push(b);
    if (b === id && !out.includes(a)) out.push(a);
  }
  return out;
}

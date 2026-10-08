import { FAMILY_ORDER, FAMILY_META, familyIds, familiesFor } from '../krp-core/src/polyhedra/families.js';
import { POLYHEDRON_IDS } from '../krp-core/src/polyhedra/index.js';
import { FOURD_CAPABLE_IDS } from '../krp-core/src/polyhedra/fourD.js';
import { POLYTOPES_4D } from '../krp-core/src/polyhedra/polytopes4d.js';

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error('FAIL:', msg);
  } else {
    console.log('ok:', msg);
  }
}

FAMILY_ORDER.forEach((f) => console.log(f, FAMILY_META[f].symbol, familyIds(f).length));

assert(familyIds('DELTAHEDRA').length === 8, 'Deltahedra has 8 members');
assert(familyIds('PLATONIC').length === 5, 'Platonic has 5 members (2 additions + D4/D8/D20)');
assert(familyIds('JOHNSON').length === 92, 'Johnson has all 92 canonical members (87 dedicated + D6/D10/D12/D14/D16)');
assert(familyIds('PRISMS').length === 8, 'Prisms has 8 members (7 dedicated + CUBE)');
assert(familyIds('ANTIPRISMS').length === 8, 'Antiprisms has 8 members (7 dedicated + D8)');

const d8 = familiesFor('D8');
assert(
  d8.includes('DELTAHEDRA') && d8.includes('PLATONIC') && d8.includes('ANTIPRISMS'),
  'D8 (octahedron) belongs to Deltahedra, Platonic, and Antiprisms: ' + JSON.stringify(d8),
);
const cube = familiesFor('CUBE');
assert(
  cube.includes('PLATONIC') && cube.includes('PRISMS'),
  'CUBE belongs to Platonic and Prisms: ' + JSON.stringify(cube),
);
const d4 = familiesFor('D4');
assert(
  d4.includes('DELTAHEDRA') && d4.includes('PLATONIC'),
  'D4 (tetrahedron) belongs to Deltahedra and Platonic: ' + JSON.stringify(d4),
);

const intersection = familyIds('DELTAHEDRA').filter((id) => familiesFor(id).includes('PLATONIC'));
assert(
  intersection.length === 3 && intersection.includes('D4') && intersection.includes('D8') && intersection.includes('D20'),
  'Deltahedra ∩ Platonic = exactly {D4, D8, D20}: ' + JSON.stringify(intersection),
);

const deltaJohnson = familyIds('DELTAHEDRA').filter((id) => familiesFor(id).includes('JOHNSON'));
assert(
  deltaJohnson.length === 5 && ['D6', 'D10', 'D12', 'D14', 'D16'].every((id) => deltaJohnson.includes(id)),
  'Deltahedra ∩ Johnson = exactly {D6, D10, D12, D14, D16} (J12/J13/J84/J51/J17 respectively): ' + JSON.stringify(deltaJohnson),
);

// 4D Polytopes (polytopes4d.ts): the six regular 4-polytopes, which are
// polytope ids rather than 3D shapes, and the seed cells behind the gold
// 4D badge (FOURD_CAPABLE_IDS, computed in fourD.ts; verify-4d-closure.ts
// owns the math).
const polytopes = familyIds('POLYTOPES_4D');
assert(
  polytopes.length === 6 && POLYTOPES_4D.every((p) => polytopes.includes(p.id)),
  '4D Polytopes = exactly the six regular 4-polytopes: ' + JSON.stringify(polytopes),
);
assert(
  FOURD_CAPABLE_IDS.length === 5 && ['D4', 'PYRAMID_TRI_G2', 'D8', 'CUBE', 'DODECAHEDRON'].every((id) => FOURD_CAPABLE_IDS.includes(id)),
  'the 4D seed cells = exactly {D4, PYRAMID_TRI_G2 (the regular tetrahedron as a grade-2 pyramid), D8, CUBE, DODECAHEDRON}: ' + JSON.stringify(FOURD_CAPABLE_IDS),
);
assert(
  POLYTOPES_4D.every((p) => FOURD_CAPABLE_IDS.includes(p.seed)),
  'every 4D polytope grows from a 4D seed cell',
);

// Cross-cutting families re-list shapes whose home is elsewhere, by design:
// Parallelohedra, Space-Filling Pairs and 3D+ Bridges (whose
// one new shape, the rhombic icosahedron, lives only there). Every id has
// exactly one HOME family, EXCEPT the documented overlaps between the
// classical families (D4/D8/D20 Deltahedra + Platonic, D8 also
// Antiprisms, CUBE Platonic + Prisms, D6..D16 Deltahedra + Johnson).
// 4D Polytopes holds polytope ids, not shapes, so it's left out too.
const CROSS_CUTTING = new Set(['POLYTOPES_4D', 'PARALLELOHEDRA', 'SPACE_FILLING_PAIRS', 'BRIDGES_3D']);
const OVERLAP_IDS = new Set(['D4', 'D8', 'D20', 'CUBE', 'D6', 'D10', 'D12', 'D14', 'D16']);
const counts = new Map<string, number>();
FAMILY_ORDER.filter((f) => !CROSS_CUTTING.has(f)).forEach((f) => familyIds(f).forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
let unexpectedMultiMembership = 0;
counts.forEach((count, id) => {
  if (count > 1 && !OVERLAP_IDS.has(id)) {
    unexpectedMultiMembership++;
    console.error('Unexpected multi-family id:', id, count);
  }
});
assert(unexpectedMultiMembership === 0, 'no undocumented multi-family memberships among home families');
// Structural checks only, no member counts: more shapes are coming
// (direct note 2026-09-30), and a count would break with each one.
const inAnyFamily = new Set(FAMILY_ORDER.flatMap((f) => familyIds(f)));
const homeless = POLYHEDRON_IDS.filter((id) => !inAnyFamily.has(id));
assert(homeless.length === 0, 'every shape belongs to at least one family: ' + JSON.stringify(homeless));
const unknown = FAMILY_ORDER.filter((f) => f !== 'POLYTOPES_4D').flatMap((f) => familyIds(f).filter((id) => !POLYHEDRON_IDS.includes(id)).map((id) => `${f}:${id}`));
assert(unknown.length === 0, 'every family member (bar the 4D polytopes) is a real registry shape: ' + JSON.stringify(unknown));

console.log(failures === 0 ? `\nAll checks passed.` : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);

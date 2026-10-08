import { test, expect } from './fixtures';
import { getCanvasCenter, resetTo, findOnCanvas, openFullCatalog } from './utils';
import { FAMILY_ORDER, FAMILY_META, familyIds } from '../../krp-core/src/polyhedra/families.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

test('renders the canvas, and every shape of every family has its card in the Full Catalog', async ({ page }) => {
  await expect(page.getByRole('main').locator('canvas')).toBeVisible();

  await page.getByRole('button', { name: /^Start over with/ }).click();
  await openFullCatalog(page);
  const seen = new Set(await page.locator('[data-spec-id]').evaluateAll((els) => els.map((el) => el.getAttribute('data-spec-id'))));
  // 4D Polytopes holds polytopes, not shapes (4d-polytopes.spec covers them); Space-Filling Pairs
  // lists pairs of shapes that have their own cards in their own families.
  for (const key of FAMILY_ORDER.filter((k) => k !== 'POLYTOPES_4D' && k !== 'SPACE_FILLING_PAIRS')) {
    for (const id of familyIds(key)) expect(seen.has(id), `${FAMILY_META[key].label} should list ${id}`).toBe(true);
  }
});

test('"Start over" resets to a single fresh shape with no selection', async ({ page }) => {
  await resetTo(page, 'D8');
  await expect(page.locator('text=/Click a highlighted/')).toBeVisible();
});

test('a non-triangulated shape (cube) renders and its vertices are hoverable', async ({ page }) => {
  // buildFaceGeometry fan-triangulates each face for rendering (deltahedra
  // faces are already triangles, so this path was never exercised before
  // CUBE/DODECAHEDRON existed) -- this is the part the pure-math verify
  // scripts (which only check vertex positions, never face rendering) can't
  // catch, so it needs an actual browser render to confirm.
  await resetTo(page, 'CUBE');
  const { cx, cy } = await getCanvasCenter(page);
  const vertexHit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity 3$/.test(t), {
    click: false,
  });
  expect(vertexHit, 'expected to find a degree-3 cube vertex (every cube vertex has degree 3)').not.toBeNull();
});

test('a hexagon-faced shape (truncated tetrahedron) renders and its vertices are hoverable', async ({ page }) => {
  // Exercises the n>4 fan-triangulation path (hexagons) for the first time
  // in a real browser -- CUBE only exercised n=4, DODECAHEDRON n=5.
  await resetTo(page, 'TRUNCATED_TETRAHEDRON');
  const { cx, cy } = await getCanvasCenter(page);
  const vertexHit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity 3$/.test(t), {
    click: false,
  });
  expect(
    vertexHit,
    'expected to find a degree-3 truncated-tetrahedron vertex (every vertex has degree 3)',
  ).not.toBeNull();
});

test('a decagon-faced shape (truncated dodecahedron) renders and its vertices are hoverable', async ({ page }) => {
  // Exercises the n=10 fan-triangulation path for the first time in a real
  // browser -- the largest n among any shape in the registry (batch 1 only
  // reached n=6). Every vertex here has degree 3 (one triangle + two
  // decagons meet at each), same invariant as the other spot-checks above.
  await resetTo(page, 'TRUNCATED_DODECAHEDRON');
  const { cx, cy } = await getCanvasCenter(page);
  const vertexHit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity 3$/.test(t), {
    click: false,
  });
  expect(
    vertexHit,
    'expected to find a degree-3 truncated-dodecahedron vertex (every vertex has degree 3)',
  ).not.toBeNull();
});

test('a mixed-vertex-degree shape (square pyramid) renders and its apex is hoverable', async ({ page }) => {
  // Every shape before the Johnson family is vertex-transitive (every
  // vertex has the same degree) -- J1's 4 base vertices are degree 3 but
  // its apex is degree 4 (it meets all 4 triangular faces), the first
  // shape in this registry with more than one vertex-capacity value.
  // Exercises that a real browser render/hover shows the correct
  // per-vertex capacity rather than a uniform one.
  await resetTo(page, 'J1_SQUARE_PYRAMID');
  const { cx, cy } = await getCanvasCenter(page);
  const apexHit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity 4$/.test(t), {
    click: false,
  });
  expect(apexHit, 'expected to find the degree-4 apex vertex of the square pyramid').not.toBeNull();
});

test('a no-degree-3-vertex shape (gyroelongated square pyramid) renders both its vertex degrees', async ({ page }) => {
  // Every prior shape in the registry has at least some degree-3
  // vertices; J10's own connectors are only degree 4 (the antiprism
  // ring) and degree 5 (the apex-adjacent square-pyramid ring) --
  // confirms nothing in the render/hover path silently assumes a
  // degree-3 vertex exists somewhere.
  await resetTo(page, 'J10_GYROELONGATED_SQUARE_PYRAMID');
  const { cx, cy } = await getCanvasCenter(page);
  const degree4Hit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity 4$/.test(t), {
    click: false,
  });
  expect(degree4Hit, 'expected to find a degree-4 vertex').not.toBeNull();
  const degree5Hit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity 5$/.test(t), {
    click: false,
  });
  expect(degree5Hit, 'expected to find a degree-5 vertex').not.toBeNull();
});

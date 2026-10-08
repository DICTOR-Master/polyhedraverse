import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

// 4D Polytopes (direct decisions 2026-09-30): the six regular 4-polytopes
// in symmetry sections; Build places the seed cell and starts RCP-C2B with
// that polytope already chosen, no picker.
test('4D Polytopes shows the six by symmetry, and Build starts the 24-cell from an octahedron', async ({ page }) => {
  await page.locator('[data-testid="tools-column"]').getByRole('button', { name: 'Shape browser' }).click();
  await page.getByRole('button', { name: /4D Polytopes/ }).first().click();
  for (const group of ['A4', 'B4', 'F4', 'H4']) await expect(page.locator(`[data-testid="polytope-section-${group}"]`)).toHaveCount(1);
  await expect(page.locator('[data-testid^="polytope-card-"]')).toHaveCount(6);
  await expect(page.locator('[data-testid="polytope-card-POLYTOPE_8_CELL"]')).toContainText('8-cell (tesseract)');

  const card = page.locator('[data-testid="polytope-card-POLYTOPE_24_CELL"]');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page.locator('[data-testid="polytope-facts"]')).toContainText('{3,4,3}');
  await expect(page.locator('[data-testid="polytope-facts"]')).toContainText('24 octahedron cells');
  await expect(page.locator('[data-testid="polytope-facts"]')).toContainText('Self-dual');
  await page.getByRole('button', { name: 'Build it, cell by cell' }).click();

  // The octahedron seed is placed, selected and building the 24-cell: its first cell button shows.
  await expect(page.getByRole('button', { name: /Add next cell \(0 \/ \d+\)/ })).toBeVisible();
  await page.getByRole('button', { name: /Add next cell \(0 \/ \d+\)/ }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('polyhedraverse:assembly') || '{}'));
  const root = saved.nodes.find((n: { rcpPolytope?: unknown }) => n.rcpPolytope);
  expect(root.shape).toBe('D8');
  expect(root.rcpPolytope.target).toBe('24-cell');
  expect(saved.nodes).toHaveLength(2);
});

test('the 600-cell offers a vertex-first build too', async ({ page }) => {
  await page.locator('[data-testid="tools-column"]').getByRole('button', { name: 'Shape browser' }).click();
  await page.getByRole('button', { name: /4D Polytopes/ }).first().click();
  const card = page.locator('[data-testid="polytope-card-POLYTOPE_600_CELL"]');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page.locator('[data-testid="polytope-facts"]')).toContainText('Dual of the 120-cell');
  await page.getByRole('button', { name: 'Build it from a vertex' }).click();
  await expect(page.getByRole('button', { name: /Add next cell \(0 \/ 19\)/ })).toBeVisible();
});

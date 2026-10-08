import { test, expect } from './fixtures';
import { getCanvasCenter, getSavedAssembly, resetTo } from './utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

// Stellations (direct decisions 2026-09-30): face pieces for the Platonic
// and Catalan solids, in one Full Catalog section per solid.
test('the Stellations card opens one section per stellated solid', async ({ page }) => {
  await page.locator('[data-testid="tools-column"]').getByRole('button', { name: 'Shape browser' }).click();
  await page.getByRole('button', { name: /^✦?\s*Stellations/ }).first().click();
  await expect(page.locator('[data-testid^="stellation-section-"]')).toHaveCount(18);
  await expect(page.locator('[data-testid="stellation-section-D4"]')).toBeInViewport();
  const dodecahedron = page.locator('[data-testid="stellation-section-DODECAHEDRON"]');
  await expect(dodecahedron.getByRole('button', { name: /dodecahedron stellation \d/ })).toHaveCount(4);
  await expect(dodecahedron.getByRole('button', { name: /great stellated dodecahedron/ }).first()).toBeVisible();
});

// A piece attaches by its base to its own Catalan's face, and only there.
test('a third-stellation piece face-attaches onto a rhombic dodecahedron', async ({ page }) => {
  await resetTo(page, 'RHOMBIC_DODECAHEDRON');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected RHOMBIC_DODECAHEDRON node \\(face \\d+, 4-gon\\)/')).toBeVisible();
  await page.getByRole('button', { name: 'Attach via face…' }).click();
  // Attach via face opens the Full Catalog filtered to shapes that fit.
  const rd = page.locator('[data-testid="stellation-section-RHOMBIC_DODECAHEDRON"]');
  await expect(rd.getByRole('button', { name: /rhombic dodecahedron stellation \d/ })).toHaveCount(4);
  await expect(page.locator('[data-testid="stellation-section-TRIAKIS_TETRAHEDRON"]')).toHaveCount(0);
  const card = rd.getByRole('button', { name: /rhombic dodecahedron stellation 4/ }).first();
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.getByRole('button', { name: 'Add to Scene' }).click();
  await expect(page.locator('text=/Placing STELLATION_RHOMBIC_DODECAHEDRON_4/')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  // The build name describes it.
  await page.getByRole('button', { name: 'Show assembly description' }).click();
  await expect(page.getByRole('dialog', { name: 'Assembly description' })).toContainText(/rhombic dodecahedron \+ face-attached rhombic dodecahedron stellation 4/i);
  const assembly = await getSavedAssembly(page);
  expect(assembly.nodes.map((n: { shape: string }) => n.shape).sort()).toEqual(['RHOMBIC_DODECAHEDRON', 'STELLATION_RHOMBIC_DODECAHEDRON_4']);
  expect(assembly.connections[0].kind).toBe('face');
});

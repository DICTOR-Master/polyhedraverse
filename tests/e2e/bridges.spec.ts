import { test, expect } from './fixtures';
import { openFullCatalog } from './utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

// 3D+ Bridges (direct decisions 2026-09-30): shown in sections by bridge
// type, and each member's details say which higher polytope it bridges to.
test('3D+ Bridges shows its four sections and the rhombic icosahedron\'s bridge', async ({ page }) => {
  await page.getByRole('button', { name: /^Start over with/ }).click();
  await openFullCatalog(page);
  for (const sec of ['cells', 'shadows', 'slices', 'corners']) {
    await expect(page.locator(`[data-testid="bridge-section-${sec}"]`)).toHaveCount(1);
  }
  const card = page.locator('[data-testid="bridge-section-shadows"]').getByRole('button', { name: /rhombic icosahedron/ }).first();
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page.locator('[data-testid="bridge-note"]')).toContainText('5-cube');
});

// Direct report 2026-09-30 ("cant make out four sections"): the Home
// screen's 3D+ Bridges card opens the Full Catalog at its sections.
test('the 3D+ Bridges family card opens its four sections', async ({ page }) => {
  await page.locator('[data-testid="tools-column"]').getByRole('button', { name: 'Shape browser' }).click();
  await page.getByRole('button', { name: /3D\+ Bridges/ }).first().click();
  for (const sec of ['cells', 'shadows', 'slices', 'corners']) {
    await expect(page.locator(`[data-testid="bridge-section-${sec}"]`)).toHaveCount(1);
  }
  await expect(page.locator('[data-testid="bridge-section-cells"]')).toBeInViewport();
});

import { test, expect } from './fixtures';
import { openBrowserWheel, clickWheelLabel, exactLabel } from './utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

/**
 * Space-Filling Pairs (2026-09-24, direct request): the family renders as
 * one row per pair -- the honeycomb's name, then both shapes -- not as a
 * flat shape grid like every other family. All 7 pairs are verified
 * geometrically by scripts/verify-space-filling-pairs.ts; this checks the
 * user-facing rows.
 */
test('Full Catalog shows Space-Filling Pairs as 7 named pair rows', async ({ page }) => {
  await page.getByRole('button', { name: /^Start over with/ }).click();
  await openBrowserWheel(page);
  await clickWheelLabel(page, exactLabel('Full Catalog'));
  const rows = page.locator('[data-testid="space-filling-pair"]');
  await expect(rows).toHaveCount(7);
  const pyro = rows.filter({ hasText: 'Pyrochlore (quarter cubic)' });
  await pyro.scrollIntoViewIfNeeded();
  await expect(pyro).toBeVisible();
  await expect(pyro.locator('text=/truncated tetrahedron/i').first()).toBeVisible();
});

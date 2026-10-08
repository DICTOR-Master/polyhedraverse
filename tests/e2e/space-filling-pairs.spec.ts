import { test, expect } from './fixtures';
import { openBrowserWheel, clickWheelLabel, exactLabel } from './utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

/**
 * Space-Filling Pairs (2026-09-24, direct request): the family renders as
 * one row per pair -- the honeycomb's name, then both shapes -- not as a
 * flat shape grid like every other family. The 7 convex pairs are verified
 * geometrically by scripts/verify-space-filling-pairs.ts, the Dragon Jewel
 * and stella octangula by scripts/verify-stella-jewel.ts, and the seamed
 * dodecahedron and Dogstar by scripts/verify-sunstar.ts;
 * this checks the user-facing rows.
 */
test('Full Catalog shows Space-Filling Pairs as 9 named pair rows', async ({ page }) => {
  await page.getByRole('button', { name: /^Start over with/ }).click();
  await openBrowserWheel(page);
  await clickWheelLabel(page, exactLabel('Full Catalog'));
  const rows = page.locator('[data-testid="space-filling-pair"]');
  await expect(rows).toHaveCount(9);
  await expect(rows.filter({ hasText: 'Stella–Jewel Lattice' })).toHaveCount(1);
  await expect(rows.filter({ hasText: 'Sunstar Lattice' })).toHaveCount(1);
  const pyro = rows.filter({ hasText: 'Pyrochlore (quarter cubic)' });
  await pyro.scrollIntoViewIfNeeded();
  await expect(pyro).toBeVisible();
  await expect(pyro.locator('text=/truncated tetrahedron/i').first()).toBeVisible();
});

// Direct decision 2026-09-30: a pair piece's card shows its partners as
// small gold wireframes -- but not in the pair rows, where the partner
// already sits beside it.
test('pair pieces show gold partner minis, except in the pair rows', async ({ page }) => {
  await page.getByRole('button', { name: /^Start over with/ }).click();
  await openBrowserWheel(page);
  await clickWheelLabel(page, exactLabel('Full Catalog'));
  await expect(page.locator('[data-testid="space-filling-pair"] [data-testid="pair-minis"]')).toHaveCount(0);
  const octa = page.locator('[data-testid="pair-minis"][title*="tetrahedron, cuboctahedron, truncated cube"]').first();
  await octa.scrollIntoViewIfNeeded();
  await expect(octa).toBeVisible();
  await expect(octa.locator('canvas')).toHaveCount(3);
});

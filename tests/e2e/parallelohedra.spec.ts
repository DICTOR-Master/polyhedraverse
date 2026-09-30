import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

// Parallelohedra (direct decision 2026-09-30): Fedorov's five, then their
// variants, including DICTO's Zometool leaning hexagonal prism and blocks.
test('Parallelohedra shows Fedorov\'s five and the variants, with the Zometool credit', async ({ page }) => {
  await page.evaluate(() => (document.querySelector('[data-testid="corner-hud-wheel"]') as unknown as { __hudTriggerAction: (i: number) => void }).__hudTriggerAction(1));
  await page.getByRole('button', { name: /Parallelohedra/ }).first().click();
  const fedorov = page.locator('[data-testid="parallelohedra-section-fedorov"]');
  const variants = page.locator('[data-testid="parallelohedra-section-variants"]');
  await expect(fedorov).toBeInViewport();
  // One card per shape: the card is the only role=button element that is a div.
  await expect(fedorov.locator('div[role="button"]')).toHaveCount(5);
  await expect(variants.locator('div[role="button"]')).toHaveCount(4);
  const prism = variants.locator('div[role="button"]', { hasText: 'DICTO leaning hexagonal prism' }).first();
  await prism.scrollIntoViewIfNeeded();
  await prism.click();
  await expect(page.locator('[data-testid="zome-credit"]')).toContainText('Zometool');
});

import { KALEIDOHEDRA_VERIFIED } from '../../app/lib/polyhedra/families';
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
  await expect(variants.locator('div[role="button"]')).toHaveCount(6);
  const prism = variants.locator('div[role="button"]', { hasText: 'DICTO leaning hexagonal prism' }).first();
  await prism.scrollIntoViewIfNeeded();
  await prism.click();
  await expect(page.locator('[data-testid="zome-credit"]')).toContainText('Zometool');
});

// Kaleidohedra verified (direct request 2026-10-01): the Bain stretch's
// equal-edge cells, plus (2026-10-01) DICTO's skewed ED in two forms, in
// their own section, with where they came from.
test('Parallelohedra shows the Kaleidohedra verified section, with the Bain credit', async ({ page }) => {
  await page.evaluate(() => (document.querySelector('[data-testid="corner-hud-wheel"]') as unknown as { __hudTriggerAction: (i: number) => void }).__hudTriggerAction(1));
  await page.getByRole('button', { name: /Parallelohedra/ }).first().click();
  const kaleido = page.locator('[data-testid="parallelohedra-section-kaleidohedra"]');
  await expect(kaleido).toContainText('Kaleidohedra verified');
  await expect(kaleido.locator('div[role="button"]')).toHaveCount(KALEIDOHEDRA_VERIFIED.length);
  const ed = kaleido.locator('div[role="button"]', { hasText: 'Regular-hexagon elongated dodecahedron' }).first();
  await ed.scrollIntoViewIfNeeded();
  await ed.click();
  await expect(page.locator('[data-testid="bain-credit"]')).toContainText('Bain stretch');
});

// The Kaleidohedra Regular 9 (direct request 2026-10-01, framing updated
// 2026-10-01): all nine together, the new four with their credit.
test('Parallelohedra shows the Kaleidohedra Regular 9, with the credit on a new member', async ({ page }) => {
  await page.evaluate(() => (document.querySelector('[data-testid="corner-hud-wheel"]') as unknown as { __hudTriggerAction: (i: number) => void }).__hudTriggerAction(1));
  await page.getByRole('button', { name: /Parallelohedra/ }).first().click();
  const nine = page.locator('[data-testid="parallelohedra-section-regularNine"]');
  await expect(nine).toContainText('The Kaleidohedra Regular 9');
  await expect(nine.locator('div[role="button"]')).toHaveCount(9);
  const r = nine.locator('div[role="button"]', { hasText: '60° rhombohedron' }).first();
  await r.scrollIntoViewIfNeeded();
  await r.click();
  await expect(page.locator('[data-testid="regular-nine-credit"]')).toContainText('Kaleidohedra Regular 9');
});

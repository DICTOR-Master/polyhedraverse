import { test, expect } from './fixtures';
import { openFullCatalog } from './utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

test('the tools column toggles the shape browser, whose Full Catalog button opens the catalogue', async ({ page }) => {
  const tools = page.locator('[data-testid="tools-column"]');
  await expect(tools).toBeVisible();
  const browser = page.getByRole('dialog', { name: 'Shape browser' });

  await tools.getByRole('button', { name: 'Shape browser' }).click();
  await expect(browser).toBeVisible();
  await openFullCatalog(page);
  await expect(browser.locator('[data-spec-id="CUBE"]').first()).toBeVisible();
  await browser.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(browser).toBeHidden();
});

test('the tools column cycles the projection, reopens the welcome, and changes the language', async ({ page }) => {
  const tools = page.locator('[data-testid="tools-column"]');
  const projection = tools.locator('[data-testid="projection-toggle"]');
  await expect(projection).toHaveText('3D');
  await projection.click();
  await expect(projection).toHaveText('∥');
  await projection.click();
  await expect(projection).toHaveText('ISO');
  await projection.click();
  await expect(projection).toHaveText('3D');

  await tools.getByRole('button', { name: /^Language:/ }).click();
  await expect(tools.getByRole('button', { name: '概要' })).toBeVisible();
  await tools.getByRole('button', { name: /^言語:/ }).click();
  await tools.getByRole('button', { name: /^Idioma:/ }).click(); // es → fr …
  for (let i = 0; i < 4; i++) await tools.locator('button').last().click(); // … back round to English
  await expect(tools.getByRole('button', { name: 'About' })).toBeVisible();

  await tools.getByRole('button', { name: 'About' }).click();
  await expect(page.getByRole('dialog', { name: 'Welcome to Polyhedraverse' })).toBeVisible();
  await expect(tools).toBeHidden();
});

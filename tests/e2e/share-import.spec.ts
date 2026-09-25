import { test, expect } from './fixtures';
import { getCanvasCenter, resetTo, findOnCanvas, openBrowserWheel, clickWheelLabel, exactLabel, getSavedAssembly } from './utils';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  await resetTo(page, 'D4');
});

async function attachD6(page: Page) {
  const { cx, cy } = await getCanvasCenter(page);
  const hit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity \d+$/.test(t));
  expect(hit).not.toBeNull();
  await page.getByRole('button', { name: 'Attach via vertex…' }).click();
  await openBrowserWheel(page);
  await clickWheelLabel(page, exactLabel('Deltahedra'));
  await clickWheelLabel(page, 'D6');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('text=/Placing D6/')).toHaveCount(0);
}

async function savedNodeCount(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  return (await getSavedAssembly(page)).nodes.length;
}

test('Copy share link round-trips the whole build, and wins over the saved one', async ({ page }) => {
  await attachD6(page);
  // Capture what would go to the clipboard.
  await page.evaluate(() => {
    (window as unknown as { __copied: string }).__copied = '';
    navigator.clipboard.writeText = async (text: string) => { (window as unknown as { __copied: string }).__copied = text; };
  });
  await page.getByRole('button', { name: 'File ▾' }).click();
  await page.getByRole('menuitem', { name: 'Copy share link' }).click();
  await expect(page.locator('text=Share link copied.')).toBeVisible();
  const url = await page.evaluate(() => (window as unknown as { __copied: string }).__copied);
  expect(url).toMatch(/\?a=[A-Za-z0-9_-]+$/);

  // A different saved build must not override the link.
  await resetTo(page, 'D8');
  expect(await savedNodeCount(page)).toBe(1);

  await page.goto(url);
  await expect(page.locator('text=Opened a shared build.')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('a'), 'the ?a= param is cleared after loading').toBe(false);
  const assembly = (await savedNodeCount(page), await getSavedAssembly(page));
  expect(assembly.nodes).toHaveLength(2);
  expect(assembly.nodes.map((n) => n.shape).sort()).toEqual(['D4', 'D6']);
});

test('Import JSON replaces the build with an exported file, and rejects junk', async ({ page }) => {
  await attachD6(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const exported = await getSavedAssembly(page);

  await resetTo(page, 'D8');
  const input = page.locator('input[type=file][accept*="json"]');
  await input.setInputFiles({ name: 'build.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
  await expect(page.locator('text=Imported build.json.')).toBeVisible();
  expect(await savedNodeCount(page)).toBe(2);

  await input.setInputFiles({ name: 'junk.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.locator('text=That file isn’t a Polyhedraverse build.')).toBeVisible();
  expect(await savedNodeCount(page), 'a rejected file leaves the build alone').toBe(2);
});

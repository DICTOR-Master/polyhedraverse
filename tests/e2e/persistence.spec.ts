import { test, expect } from './fixtures';
import { getCanvasCenter, resetTo, findOnCanvas, readTooltipAt, openBrowserWheel, clickWheelLabel, exactLabel } from './utils';

test('saving and reloading restores the assembly exactly', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  await resetTo(page, 'D8');

  const { cx, cy } = await getCanvasCenter(page);
  const vertexHit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity/.test(t));
  expect(vertexHit).not.toBeNull();
  const { dx, dy } = vertexHit!;

  // Real leftover fixed live: this used to click a flat "D4" button
  // rendered directly in the nav -- vertex-attach now opens the same
  // family-grouped picker face-attach already uses, via "Attach via
  // vertex…" (see attach.spec.ts's own identical fix).
  await page.getByRole('button', { name: 'Attach via vertex…' }).click();
  await openBrowserWheel(page);
  await clickWheelLabel(page, exactLabel('Deltahedra'));
  await clickWheelLabel(page, 'D4');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('text=/Click a highlighted/')).toBeVisible();

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // The same screen point that found the free vertex should now show the
  // attached D4 there: the vertex reads occupied, or (since the camera
  // re-fits to the restored two-shape build) the D4's own body covers it.
  // Either proves the D4 child survived the reload; a lone D8 would still
  // read the vertex as free.
  const textAfter = await readTooltipAt(page, cx + dx, cy + dy);
  expect(
    textAfter,
    `expected the attached D4 at the same spot after reload (got "${textAfter}")`,
  ).toMatch(/occupied|D4 node/);
});

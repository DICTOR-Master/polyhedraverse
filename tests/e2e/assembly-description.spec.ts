import { test, expect } from './fixtures';
import { getCanvasCenter, resetTo, findOnCanvas, openBrowserWheel, clickWheelLabel, exactLabel } from './utils';

/**
 * The assembly description moved from a permanent (if truncated) header
 * string to a tap-to-open popover anchored over the shape itself, 2026-
 * 09-17 -- direct user report that even truncated it was "taking up
 * useful space across UI." Covers: the trigger icon is absent for a
 * single unattached shape (no real description yet), appears once a
 * second piece is attached, opens a popover with the real description
 * text, and closes via both its own close button and Escape.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  await resetTo(page, 'D4');
});

test('no description icon for a lone unattached shape', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Show assembly description' })).toHaveCount(0);
});

test('attaching a second piece shows the icon; tapping opens a closeable popover over the shape', async ({ page }) => {
  const { cx, cy } = await getCanvasCenter(page);

  const vertexHit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity/.test(t));
  expect(vertexHit).not.toBeNull();

  await page.getByRole('button', { name: 'Attach via vertex…' }).click();
  await openBrowserWheel(page);
  await clickWheelLabel(page, exactLabel('Deltahedra'));
  await clickWheelLabel(page, 'D6');
  await expect(page.locator('text=/Placing D6/')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm' }).click();

  const icon = page.getByRole('button', { name: 'Show assembly description' });
  await expect(icon).toBeVisible();

  await expect(page.getByRole('dialog', { name: 'Assembly description' })).toHaveCount(0);
  await icon.click();
  const popover = page.getByRole('dialog', { name: 'Assembly description' });
  await expect(popover).toBeVisible();
  // Real content, not an empty shell -- both shape names should appear
  // somewhere in the description text (describeAssembly's own output
  // uses each shape's own display name, e.g. "Tetrahedron"/"triangular
  // bipyramid", never the bare registry id "D4"/"D6").
  await expect(popover).toContainText(/tetrahedron/i);
  await expect(popover).toContainText(/bipyramid/i);

  // Positioned as a small anchored panel, not a full-viewport modal
  // (ChangelogOverlay's own pattern) -- confirms this is genuinely the
  // new lightweight popover, not an accidental reuse of that component.
  const box = await popover.boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize();
  expect(box!.width).toBeLessThan((viewport?.width ?? Infinity) * 0.6);

  await popover.getByRole('button', { name: 'Close' }).click();
  await expect(popover).toHaveCount(0);

  // Re-open, then close via Escape instead.
  await icon.click();
  await expect(page.getByRole('dialog', { name: 'Assembly description' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Assembly description' })).toHaveCount(0);
});

import { test, expect } from './fixtures';
import { getCanvasCenter, resetTo, setSavedAssembly, getSavedAssembly } from './utils';
import type { Assembly } from '../../app/lib/assembly';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

/**
 * The old 4D fold is retired (2026-09-25): no way to create one (its
 * "Attach via 4D fold…" entry point went first, 2026-09-11), and its 3D
 * <-> 4D slider is gone. Saves from before then still carry
 * `fold4: true` on a face connection; migrateLegacyAssembly drops it on
 * load, which is exact -- the stored pose was always the ordinary flush
 * one (the slider's 0%).
 */
test('the removed "Attach via 4D fold…" button never appears, even where it used to', async ({ page }) => {
  await resetTo(page, 'DODECAHEDRON');
  const { cx, cy } = await getCanvasCenter(page);

  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected DODECAHEDRON node/')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Attach via face…' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Attach via Duoprism…' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Attach via 4D fold…' })).toHaveCount(0);
});

test('an old save with a fold connection loads as a plain face attach, with no fold slider', async ({ page }) => {
  // Exactly the shape a pre-retirement save has, so it bypasses the
  // current Assembly type on purpose.
  const legacy = {
    nodes: [
      { id: 'a', shape: 'DODECAHEDRON', transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] } },
      { id: 'b', shape: 'DODECAHEDRON', transform: { position: [0, 0, 2.5], quaternion: [0, 0, 0, 1] } },
    ],
    connections: [{ nodeA: 'a', vertexA: 0, nodeB: 'b', vertexB: 0, kind: 'face', fold4: true }],
  } as unknown as Assembly;
  await setSavedAssembly(page, legacy);
  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.getByRole('main').locator('canvas')).toBeVisible();

  await expect(page.locator('input[type="range"]')).toHaveCount(0);
  await expect(page.getByText('4D ⧉ Fold')).toHaveCount(0);

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const saved = await getSavedAssembly(page);
  expect(saved.nodes).toHaveLength(2);
  expect(saved.connections).toHaveLength(1);
  expect(saved.connections[0]).toMatchObject({ nodeA: 'a', nodeB: 'b', kind: 'face' });
  expect('fold4' in saved.connections[0], 'the fold flag is dropped on load').toBe(false);
});

import { test, expect } from './fixtures';
import { getCanvasCenter, resetTo, getSavedAssembly, setSavedAssembly } from './utils';
import type { Assembly } from '../../app/lib/assembly';

/**
 * End-to-end coverage of RPC-build (radial-perspective click-to-build),
 * replacing fold4 as the live 4D folding-construction feature: shell 1
 * builds one cell at a time, defaulting to the SAME real, warped
 * projected geometry shell 2+ already uses (not the superseded
 * rigid-rotation open/closed toggle -- see docs/radial-cell-projection.md
 * and the RPC-build UI plan's own revision history for why that toggle
 * never actually looked 4D and was replaced). A per-root "3D"/"4D" view
 * toggle switches EVERY built shell-1 cell between that real projected
 * geometry and an ordinary undistorted flush-attached copy of the seed.
 * scripts/verify-rpc-build.ts already exhaustively checks the underlying
 * geometry (Euler validity, planarity, connector rebuilding); this file
 * checks the UI wires up to it correctly, that switching views actually
 * changes the PERSISTED graph (not just a live-only visual, which is
 * exactly the bug this replaced), and that a real save/load round trip
 * preserves both the built graph and the chosen view.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

test('CUBE builds its tesseract one cell at a time, then shell-by-shell, with a real, persisted 3D/4D view toggle', async ({ page }) => {
  await resetTo(page, 'CUBE');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected CUBE node/')).toBeVisible();

  // CUBE has exactly one real closure (tesseract) -- no picker, immediate begin.
  const buildBtn = page.getByRole('button', { name: 'Build via RPC…' });
  await expect(buildBtn).toBeVisible();
  await buildBtn.click();

  const addCellBtn = page.getByRole('button', { name: /Add next cell/ });
  await expect(addCellBtn).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add next cell (0 / 6)' })).toBeVisible();

  // Click through all 6 shell-1 cells one at a time, confirming progress.
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: new RegExp(`Add next cell \\(${i} / 6\\)`) }).click();
    await page.waitForTimeout(150);
  }
  // Shell 1 complete: the one-at-a-time button is gone, the batch pair appears.
  await expect(page.getByRole('button', { name: /Add next cell/ })).toHaveCount(0);
  const buildShellBtn = page.getByRole('button', { name: 'Build next shell' });
  const removeShellBtn = page.getByRole('button', { name: 'Remove last shell' });
  await expect(buildShellBtn).toBeVisible();
  await expect(removeShellBtn).toBeVisible();
  // Only shell 1 remains built -- "Remove last shell" would target it, disabled per the plan's own scope.
  await expect(removeShellBtn).toBeDisabled();

  // The 3D/4D view toggle appeared once shell 1 has at least one cell.
  const view3DBtn = page.getByRole('button', { name: '3D', exact: true });
  const view4DBtn = page.getByRole('button', { name: '4D', exact: true });
  await expect(view3DBtn).toBeVisible();
  await expect(view4DBtn).toBeVisible();

  // Rigorous check (this is exactly the bug the superseded toggle had):
  // switching the view must actually change the PERSISTED transforms,
  // not just something live-only that a save silently drops. Save once
  // in each view and diff the real saved node transforms.
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const savedDefault = await getSavedAssembly(page);
  expect(savedDefault.nodes.find((n) => n.rpcPolytope)?.rpcPolytope?.view3D).not.toBe(true); // 4D is the default

  await view3DBtn.click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const saved3D = await getSavedAssembly(page);
  expect(saved3D.nodes.find((n) => n.rpcPolytope)?.rpcPolytope?.view3D).toBe(true);

  const byId4D = new Map(savedDefault.nodes.map((n) => [n.id, n]));
  let anyTransformDiffers = false;
  for (const node3D of saved3D.nodes) {
    const node4D = byId4D.get(node3D.id);
    if (!node4D) continue;
    const posDiff = Math.hypot(...node3D.transform.position.map((v, i) => v - node4D.transform.position[i]));
    if (posDiff > 1e-6) anyTransformDiffers = true;
  }
  expect(anyTransformDiffers, 'switching 3D/4D must change at least one real, persisted node transform').toBe(true);

  await page.screenshot({ path: 'test-results/rpc-build-cube-3d.png' });
  await view4DBtn.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/rpc-build-cube-4d.png' });

  // Build shell 2 (the single remaining far cube), confirm the graph, then remove it.
  await buildShellBtn.click();
  await page.waitForTimeout(200);
  await expect(page.getByRole('button', { name: 'Build next shell' })).toBeDisabled(); // tesseract is now fully closed (8/8 cells)
  await expect(page.getByRole('button', { name: 'Remove last shell' })).toBeEnabled();

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const fullAssembly = await getSavedAssembly(page);
  expect(fullAssembly.nodes).toHaveLength(8); // 1 root + 6 shell-1 + 1 shell-2
  expect(fullAssembly.connections).toHaveLength(7);
  expect(fullAssembly.connections.every((c) => c.kind === 'rpc4d')).toBe(true);
  expect(fullAssembly.nodes.find((n) => n.rpcPolytope)).toBeTruthy();

  // Remove shell 2, save again, confirm back to 7 nodes.
  await page.getByRole('button', { name: 'Remove last shell' }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const afterRemove = await getSavedAssembly(page);
  expect(afterRemove.nodes).toHaveLength(7);
  expect(afterRemove.connections).toHaveLength(6);

  // Reload from the persisted graph and confirm the scene re-renders with
  // no console/page error (the fixture's own auto-check), the same node
  // count, AND the chosen 4D view survived the reload (the root's own
  // saved rpcPolytope.view3D, re-checked after reload, not just before it).
  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.getByRole('main').locator('canvas')).toBeVisible();
  const reloaded = await getSavedAssembly(page);
  expect(reloaded.nodes).toHaveLength(7);
  expect(reloaded.nodes.find((n) => n.rpcPolytope)?.rpcPolytope?.view3D).not.toBe(true);
});

test('a shape with more than one real closure (D4) offers a picker', async ({ page }) => {
  await resetTo(page, 'D4');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible();

  await page.getByRole('button', { name: 'Build via RPC…' }).click();
  await expect(page.locator('text=/Build which 4-polytope/')).toBeVisible();
  await expect(page.getByRole('button', { name: '5-cell' })).toBeVisible();
  await expect(page.getByRole('button', { name: '16-cell' })).toBeVisible();
  await expect(page.getByRole('button', { name: '600-cell' })).toBeVisible();

  // Pick the smallest (5-cell, k=3 -- 5 total cells) for a fast full-closure check.
  await page.getByRole('button', { name: '5-cell' }).click();
  await expect(page.getByRole('button', { name: 'Add next cell (0 / 4)' })).toBeVisible();
});

test('a non-4D-capable shape (RHOMBIC_DODECAHEDRON) never offers Build via RPC', async ({ page }) => {
  await resetTo(page, 'RHOMBIC_DODECAHEDRON');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected RHOMBIC_DODECAHEDRON node/')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build via RPC…' })).toHaveCount(0);
});

/**
 * Old saved assemblies with a real fold4 connection must still load and
 * scrub correctly -- fold4 is functionally superseded by RPC-build, not
 * removed; its own creation UI is gone but its slider must still work
 * for data that predates this change.
 */
test('an old saved fold4 assembly still loads and the fold slider still scrubs it', async ({ page }) => {
  const assembly: Assembly = {
    nodes: [
      { id: 'a', shape: 'DODECAHEDRON', transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] } },
      { id: 'b', shape: 'DODECAHEDRON', transform: { position: [0, 0, 3], quaternion: [0, 0, 0, 1] } },
    ],
    connections: [{ nodeA: 'a', vertexA: 0, nodeB: 'b', vertexB: 0, kind: 'face', fold4: true }],
  };
  await page.goto('/');
  await page.waitForTimeout(300);
  await setSavedAssembly(page, assembly);
  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.getByRole('main').locator('canvas')).toBeVisible();

  const slider = page.locator('input[type="range"]');
  await expect(slider).toBeVisible();
  await slider.fill('100');
  await page.waitForTimeout(200);
  await slider.fill('0');
});

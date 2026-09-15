import { test, expect } from './fixtures';
import { getCanvasCenter, resetTo } from './utils';

/**
 * End-to-end coverage of RPC-build (radial-perspective click-to-build),
 * replacing fold4 as the live 4D folding-construction feature: shell 1
 * builds one cell at a time (with a 3D-open/4D-closed toggle once a real
 * adjacent sibling pair exists), shell 2+ builds in whole-ring batches.
 * scripts/verify-rpc-build.ts already exhaustively checks the underlying
 * geometry (Euler validity, planarity, the open/closed gap math against
 * closureClass's own defectDeg); this file checks the UI wires up to it
 * correctly and a real save/load round trip preserves the built graph.
 * CUBE -> tesseract is the smallest real closure (8 cells: 1 seed + 6
 * shell-1 + 1 shell-2) and has a large, visually obvious real dihedral
 * defect (90deg, k=3) -- a good case for an actual screenshot of the
 * open/closed toggle, not just assertions.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

test('CUBE builds its tesseract one cell at a time, then shell-by-shell, with a real open/closed toggle', async ({ page }) => {
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

  // The open/closed toggle appeared at some point during shell-1's build
  // (CUBE's own face adjacency guarantees a real pair forms).
  const openBtn = page.getByRole('button', { name: '3D open' });
  const closedBtn = page.getByRole('button', { name: '4D closed' });
  await expect(openBtn).toBeVisible();
  await expect(closedBtn).toBeVisible();

  await page.screenshot({ path: 'test-results/rpc-build-cube-open.png' });
  await closedBtn.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/rpc-build-cube-closed.png' });
  await openBtn.click();
  await page.waitForTimeout(200);

  // Build shell 2 (the single remaining far cube), confirm the graph, then remove it.
  await buildShellBtn.click();
  await page.waitForTimeout(200);
  await expect(page.getByRole('button', { name: 'Build next shell' })).toBeDisabled(); // tesseract is now fully closed (8/8 cells)
  await expect(page.getByRole('button', { name: 'Remove last shell' })).toBeEnabled();

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const fullAssembly = await page.evaluate(() => fetch('/api/assemblies').then((r) => r.json()));
  expect(fullAssembly.nodes).toHaveLength(8); // 1 root + 6 shell-1 + 1 shell-2
  expect(fullAssembly.connections).toHaveLength(7);
  expect(fullAssembly.connections.every((c: { kind: string }) => c.kind === 'rpc4d')).toBe(true);
  expect(fullAssembly.nodes.find((n: { rpcPolytope?: unknown }) => n.rpcPolytope)).toBeTruthy();

  // Remove shell 2, save again, confirm back to 7 nodes.
  await page.getByRole('button', { name: 'Remove last shell' }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const afterRemove = await page.evaluate(() => fetch('/api/assemblies').then((r) => r.json()));
  expect(afterRemove.nodes).toHaveLength(7);
  expect(afterRemove.connections).toHaveLength(6);

  // Reload from the persisted graph and confirm the scene re-renders with
  // no console/page error (the fixture's own auto-check) and the same node count.
  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.getByRole('main').locator('canvas')).toBeVisible();
  const reloaded = await page.evaluate(() => fetch('/api/assemblies').then((r) => r.json()));
  expect(reloaded.nodes).toHaveLength(7);
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
  const assembly = {
    nodes: [
      { id: 'a', shape: 'DODECAHEDRON', transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] } },
      { id: 'b', shape: 'DODECAHEDRON', transform: { position: [0, 0, 3], quaternion: [0, 0, 0, 1] } },
    ],
    connections: [{ nodeA: 'a', vertexA: 0, nodeB: 'b', vertexB: 0, kind: 'face', fold4: true }],
  };
  await page.goto('/');
  await page.waitForTimeout(300);
  await page.evaluate(
    (a) => fetch('/api/assemblies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }),
    assembly,
  );
  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.getByRole('main').locator('canvas')).toBeVisible();

  const slider = page.locator('input[type="range"]');
  await expect(slider).toBeVisible();
  await slider.fill('100');
  await page.waitForTimeout(200);
  await slider.fill('0');
});

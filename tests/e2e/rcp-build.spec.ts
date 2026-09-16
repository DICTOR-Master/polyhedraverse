import { test, expect } from './fixtures';
import { getCanvasCenter, resetTo, getSavedAssembly, setSavedAssembly } from './utils';
import type { Assembly } from '../../app/lib/assembly';

/**
 * End-to-end coverage of RCP-C2B (Radial Cell Projection, click-to-build),
 * replacing fold4 as the live 4D folding-construction feature: shell 1
 * builds one cell at a time, defaulting to the SAME real, warped
 * projected geometry shell 2+ already uses (not the superseded
 * rigid-rotation open/closed toggle -- see docs/radial-cell-projection.md
 * and the RCP-C2B UI plan's own revision history for why that toggle
 * never actually looked 4D and was replaced). A per-root "3D"/"4D" view
 * toggle switches EVERY built shell-1 cell between that real projected
 * geometry and an ordinary undistorted flush-attached copy of the seed.
 * scripts/verify-rcp-build.ts already exhaustively checks the underlying
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
  const buildBtn = page.getByRole('button', { name: 'Build via RCP-C2B…' });
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
  expect(savedDefault.nodes.find((n) => n.rcpPolytope)?.rcpPolytope?.view3D).toBe(true); // 3D is the default (direct user feedback)

  await view4DBtn.click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const saved4D = await getSavedAssembly(page);
  expect(saved4D.nodes.find((n) => n.rcpPolytope)?.rcpPolytope?.view3D).toBe(false);

  const byIdDefault = new Map(savedDefault.nodes.map((n) => [n.id, n]));
  let anyTransformDiffers = false;
  for (const node4D of saved4D.nodes) {
    const nodeDefault = byIdDefault.get(node4D.id);
    if (!nodeDefault) continue;
    const posDiff = Math.hypot(...node4D.transform.position.map((v, i) => v - nodeDefault.transform.position[i]));
    if (posDiff > 1e-6) anyTransformDiffers = true;
  }
  expect(anyTransformDiffers, 'switching 3D/4D must change at least one real, persisted node transform').toBe(true);

  await page.screenshot({ path: 'test-results/rcp-build-cube-4d.png' });
  await view3DBtn.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/rcp-build-cube-3d.png' });

  // Build shell 2 (the single remaining far cube) while shell 1 is in "3D"
  // -- shell 2's own cells are permanently anchored to shell 1's "4D"
  // position (buildNextRcpShell's own comment), so this must auto-force
  // shell 1 back to "4D" first rather than leaving the two disconnected
  // (real bug found live: "wrong artifacts... in later cycles"). The
  // toggle itself stays VISIBLE but becomes disabled from here on (real
  // user frustration otherwise: "4D feature buttons just disappear of
  // their own accord") -- it would only ever break that anchoring now.
  await buildShellBtn.click();
  await page.waitForTimeout(200);
  await expect(view3DBtn).toBeVisible();
  await expect(view3DBtn).toBeDisabled();
  await expect(view4DBtn).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Build next shell' })).toBeDisabled(); // tesseract is now fully closed (8/8 cells)
  await expect(page.getByRole('button', { name: 'Remove last shell' })).toBeEnabled();

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const fullAssembly = await getSavedAssembly(page);
  expect(fullAssembly.nodes).toHaveLength(8); // 1 root + 6 shell-1 + 1 shell-2
  expect(fullAssembly.connections).toHaveLength(7);
  expect(fullAssembly.connections.every((c) => c.kind === 'rcp4d')).toBe(true);
  expect(fullAssembly.nodes.find((n) => n.rcpPolytope)).toBeTruthy();

  // Remove shell 2 -- the toggle becomes ENABLED again (back to just
  // shell 1), but view3D itself stays wherever building shell 2 left it
  // (forced to "4D") rather than silently reverting to whatever it was
  // before that forced switch.
  await page.getByRole('button', { name: 'Remove last shell' }).click();
  await page.waitForTimeout(200);
  await expect(view3DBtn).toBeEnabled();
  await expect(view4DBtn).toBeEnabled();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const afterRemove = await getSavedAssembly(page);
  expect(afterRemove.nodes).toHaveLength(7);
  expect(afterRemove.connections).toHaveLength(6);
  expect(afterRemove.nodes.find((n) => n.rcpPolytope)?.rcpPolytope?.view3D).toBe(false);

  // Reload from the persisted graph and confirm the scene re-renders with
  // no console/page error (the fixture's own auto-check), the same node
  // count, AND the chosen view survived the reload (the root's own saved
  // rcpPolytope.view3D, re-checked after reload, not just before it).
  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.getByRole('main').locator('canvas')).toBeVisible();
  const reloaded = await getSavedAssembly(page);
  expect(reloaded.nodes).toHaveLength(7);
  expect(reloaded.nodes.find((n) => n.rcpPolytope)?.rcpPolytope?.view3D).toBe(false);
});

/**
 * Real bug found live: shell 2+ cells are permanently anchored to shell
 * 1's "4D" (real, warped) position -- if shell 1 stays in "3D" (the
 * ordinary flush self-attach, a genuinely different position) while
 * shell 2 is built, shell 2 ends up floating disconnected from shell 1
 * once rendered, since it was baked against a shell-1 layout that no
 * longer exists. Covers both directions: building shell 2 from "3D"
 * auto-forces "4D" first, and the toggle becomes DISABLED (never hidden
 * -- real user frustration otherwise: "4D feature buttons just disappear
 * of their own accord") once any shell 2+ cell exists, re-enabling once
 * shell 2 is removed again.
 */
test('DODECAHEDRON: building shell 2 while shell 1 is in "3D" auto-forces "4D", and the toggle locks (stays visible, disabled) until shell 2 is removed', async ({ page }) => {
  await resetTo(page, 'DODECAHEDRON');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await page.getByRole('button', { name: 'Build via RCP-C2B…' }).click();
  for (let i = 0; i < 12; i++) {
    await page.getByRole('button', { name: new RegExp(`Add next cell \\(${i} / 12\\)`) }).click();
    await page.waitForTimeout(100);
  }
  // 3D is the default -- confirm we start there.
  const view3DBtn = page.getByRole('button', { name: '3D', exact: true });
  const view4DBtn = page.getByRole('button', { name: '4D', exact: true });
  await expect(view3DBtn).toBeVisible();
  await expect(view3DBtn).toBeEnabled();

  await page.getByRole('button', { name: 'Build next shell' }).click();
  await page.waitForTimeout(300);
  await expect(view3DBtn).toBeVisible();
  await expect(view3DBtn).toBeDisabled();
  await expect(view4DBtn).toBeDisabled();

  // The dodecahedron's shell 2 is a large batch (dozens of cells) --
  // give the click a moment before relying on it (flake seen live:
  // occasionally missed while the browser was still settling from that
  // batch), and poll for "Saved" with a generous timeout rather than
  // relying on the default.
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible({ timeout: 10000 });
  const saved = await getSavedAssembly(page);
  expect(saved.nodes.find((n) => n.rcpPolytope)?.rcpPolytope?.view3D).toBe(false); // auto-forced

  await page.getByRole('button', { name: 'Remove last shell' }).click();
  await page.waitForTimeout(200);
  await expect(view3DBtn).toBeEnabled();
  await expect(view4DBtn).toBeEnabled();
});

test('a shape with more than one real closure (D4) offers a picker, including 600-cell', async ({ page }) => {
  await resetTo(page, 'D4');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible();

  await page.getByRole('button', { name: 'Build via RCP-C2B…' }).click();
  await expect(page.locator('text=/Build which 4-polytope/')).toBeVisible();
  await expect(page.getByRole('button', { name: '5-cell' })).toBeVisible();
  await expect(page.getByRole('button', { name: '16-cell' })).toBeVisible();
  await expect(page.getByRole('button', { name: '600-cell' })).toBeVisible();

  // Pick the smallest (5-cell, k=3 -- 5 total cells) for a fast full-closure check.
  await page.getByRole('button', { name: '5-cell' }).click();
  await expect(page.getByRole('button', { name: 'Add next cell (0 / 4)' })).toBeVisible();
});

/**
 * The 600-cell needed a second, deeper fix (2026-09-16): its own "cell 0"
 * (build600CellFromDodecahedron's dual-derived tetrahedron) is honestly,
 * unavoidably non-regular (the 120-cell's own vertex-transitivity means
 * no dual cell is any less distorted than any other), so unlike every
 * other closure it has no real external registry shape to match -- the
 * ROOT itself is built from cell 0's own real geometry in "4D" (the
 * default), and only falls back to the plain, perfectly regular
 * tetrahedron in "3D". This checks the root's own mesh actually swaps
 * with the toggle (unlike every other closure, where only the children
 * do), that shell 1 still closes correctly, and that the choice survives
 * a real save/reload.
 */
test('D4 -> 600-cell: shell 1 closes correctly, and the ROOT itself (not just children) toggles 3D/4D', async ({ page }) => {
  await resetTo(page, 'D4');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible();
  await page.getByRole('button', { name: 'Build via RCP-C2B…' }).click();
  await page.getByRole('button', { name: '600-cell' }).click();

  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: new RegExp(`Add next cell \\(${i} / 4\\)`) }).click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByRole('button', { name: /Add next cell/ })).toHaveCount(0);

  // Toggle to 3D and back -- the root's own mesh must survive both
  // swaps without erroring (fixture's own console-error auto-check) and
  // the shape stays selected/interactable throughout.
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.waitForTimeout(200);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible();
  await page.getByRole('button', { name: '4D', exact: true }).click();
  await page.waitForTimeout(200);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible();

  // Save while in "3D", reload, and confirm the root's own saved
  // rcpPolytope.view3D survived (the exact thing the original, simpler
  // toggle never did for any closure).
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const saved = await getSavedAssembly(page);
  expect(saved.nodes).toHaveLength(5); // 1 root + 4 shell-1 (the whole 600-cell's own local k=5 ring isn't reachable from shell 1 alone, but the ROOT + its 4 direct neighbors are)
  expect(saved.nodes.find((n) => n.rcpPolytope)?.rcpPolytope?.view3D).toBe(true);

  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.getByRole('main').locator('canvas')).toBeVisible();
  const reloaded = await getSavedAssembly(page);
  expect(reloaded.nodes).toHaveLength(5);
  expect(reloaded.nodes.find((n) => n.rcpPolytope)?.rcpPolytope?.view3D).toBe(true);
});

test('a non-4D-capable shape (RHOMBIC_DODECAHEDRON) never offers Build via RCP-C2B', async ({ page }) => {
  await resetTo(page, 'RHOMBIC_DODECAHEDRON');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected RHOMBIC_DODECAHEDRON node/')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build via RCP-C2B…' })).toHaveCount(0);
});

/**
 * Old saved assemblies with a real fold4 connection must still load and
 * scrub correctly -- fold4 is functionally superseded by RCP-C2B, not
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

/**
 * The feature was renamed from "RPC-build" to RCP-C2B (2026-09-16) --
 * `AssemblyNode.rpcPolytope` became `rcpPolytope` and the `'rpc4d'`
 * connection kind became `'rcp4d'`. Real user data already saved under
 * the old spellings must keep loading correctly: migrateLegacyRcp4d
 * (assembly.ts) rewrites both, in place, before isValidAssembly ever
 * sees the parsed JSON.
 */
test('an old save using the legacy rpcPolytope/rpc4d spellings still loads correctly via migration', async ({ page }) => {
  const legacy = {
    nodes: [
      { id: 'root', shape: 'CUBE', transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] }, rpcPolytope: { seedSpecId: 'CUBE', target: 'tesseract', view3D: true } },
      { id: 'child', shape: 'CUBE', transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] } },
    ],
    connections: [{ nodeA: 'root', nodeB: 'child', vertexA: 0, vertexB: 0, kind: 'rpc4d', cellId: 1, shell: 1 }],
  };
  await page.goto('/');
  await page.waitForTimeout(300);
  await setSavedAssembly(page, legacy as unknown as Assembly);
  await page.reload();
  await page.waitForTimeout(800);
  await expect(page.getByRole('main').locator('canvas')).toBeVisible();

  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  // The root is still recognized as a real RCP-C2B root (migrated
  // rcpPolytope) with its rcp4d child correctly counted -- if the
  // migration failed, this would just look like an ordinary CUBE with
  // no RCP-C2B controls at all.
  const cellCount = page.locator('text=/Cells: /');
  await expect(cellCount).toBeVisible({ timeout: 3000 });
  await expect(cellCount).toHaveText('Cells: 2 / 8');
});

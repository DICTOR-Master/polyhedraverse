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
 * never actually looked 4D and was replaced). A per-root "Open"/"Closed"
 * view toggle switches EVERY built shell-1 cell between that real
 * projected geometry and an ordinary undistorted flush-attached copy of
 * the seed. scripts/verify-rcp-build.ts already exhaustively checks the
 * underlying geometry (Euler validity, planarity, connector rebuilding);
 * this file checks the UI wires up to it correctly, that switching views
 * actually changes the PERSISTED graph (not just a live-only visual,
 * which is exactly the bug this replaced), and that a real save/load
 * round trip preserves both the built graph and the chosen view.
 *
 * A MAIN "3D / 4D" toggle (direct user feedback: showing every ordinary
 * control -- Delete, Attach via face, Attach via Duoprism -- alongside
 * every RCP-C2B build control at once was "too busy") gates which
 * control set is visible for an RCP-C2B-eligible node: "3D" shows the
 * ordinary controls, "4D" starts a build (if none exists yet) and shows
 * only the RCP-C2B controls. This is a genuinely different toggle from
 * the per-root "Open/Closed" one above (renamed FROM "3D/4D" specifically
 * so the two wouldn't collide) -- the main toggle is what every test
 * below clicks to begin a build in the first place.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

/** Clicks the MAIN 3D/4D mode toggle's "4D" button to begin (or switch into) an RCP-C2B build -- the "Build via RCP-C2B…" plain button no longer exists. */
async function clickMain4D(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '4D', exact: true }).click();
}

test('CUBE builds its tesseract one cell at a time, then shell-by-shell, with a real, persisted Open/Closed view toggle', async ({ page }) => {
  await resetTo(page, 'CUBE');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected CUBE node/')).toBeVisible();

  // CUBE has exactly one real closure (tesseract) -- no picker, immediate begin.
  await clickMain4D(page);

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

  // The Open/Closed view toggle appeared once shell 1 has at least one cell.
  const openBtn = page.getByRole('button', { name: 'Open', exact: true });
  const closedBtn = page.getByRole('button', { name: 'Closed', exact: true });
  await expect(openBtn).toBeVisible();
  await expect(closedBtn).toBeVisible();

  // Rigorous check (this is exactly the bug the superseded toggle had):
  // switching the view must actually change the PERSISTED transforms,
  // not just something live-only that a save silently drops. Save once
  // in each view and diff the real saved node transforms.
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const savedDefault = await getSavedAssembly(page);
  expect(savedDefault.nodes.find((n) => n.rcpPolytope)?.rcpPolytope?.view3D).toBe(true); // Open (3D) is the default (direct user feedback)

  await closedBtn.click();
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
  expect(anyTransformDiffers, 'switching Open/Closed must change at least one real, persisted node transform').toBe(true);

  await page.screenshot({ path: 'test-results/rcp-build-cube-4d.png' });
  await openBtn.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/rcp-build-cube-3d.png' });

  // Build shell 2 (the single remaining far cube) while shell 1 is Open
  // -- shell 2's own cells are permanently anchored to shell 1's Closed
  // position (buildNextRcpShell's own comment), so this must auto-force
  // shell 1 back to Closed first rather than leaving the two disconnected
  // (real bug found live: "wrong artifacts... in later cycles"). The
  // toggle itself stays VISIBLE but becomes disabled from here on (real
  // user frustration otherwise: "4D feature buttons just disappear of
  // their own accord") -- it would only ever break that anchoring now.
  await buildShellBtn.click();
  await page.waitForTimeout(200);
  await expect(openBtn).toBeVisible();
  await expect(openBtn).toBeDisabled();
  await expect(closedBtn).toBeDisabled();
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
  // (forced to Closed) rather than silently reverting to whatever it was
  // before that forced switch.
  await page.getByRole('button', { name: 'Remove last shell' }).click();
  await page.waitForTimeout(200);
  await expect(openBtn).toBeEnabled();
  await expect(closedBtn).toBeEnabled();
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
 * 1's Closed (real, warped) position -- if shell 1 stays Open (the
 * ordinary flush self-attach, a genuinely different position) while
 * shell 2 is built, shell 2 ends up floating disconnected from shell 1
 * once rendered, since it was baked against a shell-1 layout that no
 * longer exists. Covers both directions: building shell 2 while Open
 * auto-forces Closed first, and the toggle becomes DISABLED (never
 * hidden -- real user frustration otherwise: "4D feature buttons just
 * disappear of their own accord") once any shell 2+ cell exists,
 * re-enabling once shell 2 is removed again.
 */
test('DODECAHEDRON: building shell 2 while shell 1 is Open auto-forces Closed, and the toggle locks (stays visible, disabled) until shell 2 is removed', async ({ page }) => {
  await resetTo(page, 'DODECAHEDRON');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await clickMain4D(page);
  for (let i = 0; i < 12; i++) {
    await page.getByRole('button', { name: new RegExp(`Add next cell \\(${i} / 12\\)`) }).click();
    await page.waitForTimeout(100);
  }
  // Open (3D) is the default -- confirm we start there.
  const openBtn = page.getByRole('button', { name: 'Open', exact: true });
  const closedBtn = page.getByRole('button', { name: 'Closed', exact: true });
  await expect(openBtn).toBeVisible();
  await expect(openBtn).toBeEnabled();

  await page.getByRole('button', { name: 'Build next shell' }).click();
  await page.waitForTimeout(300);
  await expect(openBtn).toBeVisible();
  await expect(openBtn).toBeDisabled();
  await expect(closedBtn).toBeDisabled();

  // The dodecahedron's shell 2 is a large batch (dozens of cells) --
  // occasionally the very first Save click lands while the browser is
  // still settling from that batch and doesn't register (flake seen
  // live). "Saved" only shows for 2s (page.tsx's own saveStatusResetRef),
  // so retry the click rather than trusting a single one no matter how
  // long the wait before it.
  await page.waitForTimeout(300);
  await expect(async () => {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15000 });
  const saved = await getSavedAssembly(page);
  expect(saved.nodes.find((n) => n.rcpPolytope)?.rcpPolytope?.view3D).toBe(false); // auto-forced

  await page.getByRole('button', { name: 'Remove last shell' }).click();
  await page.waitForTimeout(200);
  await expect(openBtn).toBeEnabled();
  await expect(closedBtn).toBeEnabled();
});

test('a shape with more than one real closure (D4) offers a picker, including 600-cell', async ({ page }) => {
  await resetTo(page, 'D4');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible();

  await clickMain4D(page);
  await expect(page.locator('text=/Build which 4-polytope/')).toBeVisible();
  await expect(page.getByRole('button', { name: '5-cell' })).toBeVisible();
  await expect(page.getByRole('button', { name: '16-cell' })).toBeVisible();
  await expect(page.getByRole('button', { name: '600-cell', exact: true })).toBeVisible();

  // Pick the smallest (5-cell, k=3 -- 5 total cells) for a fast full-closure check.
  await page.getByRole('button', { name: '5-cell' }).click();
  await expect(page.getByRole('button', { name: 'Add next cell (0 / 4)' })).toBeVisible();
});

/**
 * Since 2026-09-24 the 600-cell is built by direct reflection, so its
 * cell 0 is the regular registry tetrahedron and the root behaves like
 * every other closure's (it used to swap its own mesh on Open/Closed,
 * because the old dual-derived cell 0 was skewed). Checks shell 1
 * closes, the toggle works both ways, and the view survives save/reload.
 */
test('D4 -> 600-cell: shell 1 closes correctly and toggles Open/Closed', async ({ page }) => {
  await resetTo(page, 'D4');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible();
  await clickMain4D(page);
  await page.getByRole('button', { name: '600-cell', exact: true }).click();

  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: new RegExp(`Add next cell \\(${i} / 4\\)`) }).click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByRole('button', { name: /Add next cell/ })).toHaveCount(0);

  // Toggle Open and back to Closed -- no console errors (fixture's own
  // auto-check) and the root stays selected/interactable throughout.
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await page.waitForTimeout(200);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible();
  await page.getByRole('button', { name: 'Closed', exact: true }).click();
  await page.waitForTimeout(200);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible();

  // Save while Open, reload, and confirm the root's own saved
  // rcpPolytope.view3D survived (the exact thing the original, simpler
  // toggle never did for any closure).
  await page.getByRole('button', { name: 'Open', exact: true }).click();
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

/**
 * Vertex-first 600-cell (2026-09-24): shell 1 is the 19 other cells
 * around one seed vertex (completing an icosahedral cluster), built one
 * per click. Open shows them as a flat fan with gaps, Closed at their
 * projected positions, and in this mode the root's own mesh swaps too
 * (verify-rcp-build.ts checks the geometry; this checks the flow).
 */
test('D4 -> 600-cell (vertex-first): 19 cells complete the icosahedral cluster, toggle Open/Closed, persist, then shell 2', async ({ page }) => {
  await resetTo(page, 'D4');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible();
  await clickMain4D(page);
  await page.getByRole('button', { name: '600-cell (vertex-first)', exact: true }).click();

  for (let i = 0; i < 19; i++) {
    await page.getByRole('button', { name: new RegExp(`Add next cell \\(${i} / 19\\)`) }).click();
    await page.waitForTimeout(100);
  }
  await expect(page.getByRole('button', { name: /Add next cell/ })).toHaveCount(0);

  // Shell colours on and off again (Open view also draws the gap overlay);
  // the fixture's console-error check covers both.
  await page.getByRole('button', { name: 'Shell colours' }).click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Shell colours' }).click();

  const openBtn = page.getByRole('button', { name: 'Open', exact: true });
  const closedBtn = page.getByRole('button', { name: 'Closed', exact: true });
  await closedBtn.click();
  await page.waitForTimeout(200);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible(); // root still selected after its own mesh swap
  await openBtn.click();
  await page.waitForTimeout(200);
  await expect(page.locator('text=/Selected D4 node/')).toBeVisible();

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  const saved = await getSavedAssembly(page);
  expect(saved.nodes).toHaveLength(20); // the whole icosahedral cluster
  const root = saved.nodes.find((n) => n.rcpPolytope);
  expect(root?.rcpPolytope?.target).toBe('600-cell (vertex-first)');
  expect(root?.rcpPolytope?.view3D).toBe(true);

  // Shell 2 (the 20 cells around the cluster) forces Closed and locks the
  // toggle. Built before reloading, while the root is still selected --
  // after a reload a canvas-centre click lands on a cluster cell instead.
  await page.getByRole('button', { name: 'Build next shell' }).click();
  await page.waitForTimeout(300);
  await expect(openBtn).toBeDisabled();
  await expect(async () => {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15000 });
  const afterShell2 = await getSavedAssembly(page);
  expect(afterShell2.nodes).toHaveLength(40);
  expect(afterShell2.nodes.find((n) => n.rcpPolytope)?.rcpPolytope?.view3D).toBe(false);

  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.getByRole('main').locator('canvas')).toBeVisible();
  const reloaded = await getSavedAssembly(page);
  expect(reloaded.nodes).toHaveLength(40);
});

test('a non-4D-capable shape (RHOMBIC_DODECAHEDRON) never offers the RCP-C2B main toggle', async ({ page }) => {
  await resetTo(page, 'RHOMBIC_DODECAHEDRON');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected RHOMBIC_DODECAHEDRON node/')).toBeVisible();
  // Neither the main mode toggle nor any RCP-C2B control renders at all
  // for a non-4D-capable shape -- checking "4D" specifically (not "3D",
  // which nothing else on this panel happens to say) is enough to prove
  // the whole toggle is absent.
  await expect(page.getByRole('button', { name: '4D', exact: true })).toHaveCount(0);
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
  // no RCP-C2B controls at all. The main mode toggle defaults to "4D"
  // whenever a build already exists (page.tsx's own rcpMainMode4D reset
  // logic), so the build controls (including this count) are visible
  // immediately, with no extra click needed.
  const cellCount = page.locator('text=/Cells: /');
  await expect(cellCount).toBeVisible({ timeout: 3000 });
  await expect(cellCount).toHaveText('Cells: 2 / 8');
});

/**
 * The "RCP-Coordinates" overlay shows each built cell's own real
 * generating coordinate (a purple point + line-from-center -- see
 * RcpComplex.cells[].coordPoint3D's own doc comment for why this is the
 * literal generating point, not just the vertex centroid) as a plain
 * on/off toggle, independent of the Open/Closed view. Also covers a real
 * bug found live alongside it: an OrbitControls camera-rotate drag still
 * fires a native 'click' at wherever the pointer ends up, which used to
 * run the selection logic and could silently deselect the current node
 * -- every RCP-C2B control (including this new toggle) would just
 * disappear (real user report: "why do 4D buttons just vanish... when
 * you touch or turn object").
 */
test('the "RCP-Coordinates" overlay toggles on/off, and orbiting the camera no longer deselects the node', async ({ page }) => {
  await resetTo(page, 'CUBE');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await clickMain4D(page);
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: new RegExp(`Add next cell \\(${i} / 6\\)`) }).click();
    await page.waitForTimeout(100);
  }

  const coordBtn = page.getByRole('button', { name: 'RCP-Coordinates' });
  await expect(coordBtn).toBeVisible();
  await coordBtn.click();
  await page.waitForTimeout(200);

  // Orbit the camera by dragging on empty space near the shape -- this
  // must NOT deselect the node (the bug: it used to clear the whole
  // toolbar, including this same toggle).
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 120, cy + 60, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await expect(page.locator('text=/Selected CUBE node/')).toBeVisible();
  await expect(coordBtn).toBeVisible();

  await coordBtn.click();
  await page.waitForTimeout(200);
});

/**
 * The "RCP-Coordinates" overlay's preview (direct user request: "one
 * shell further than current cell count would show where construction
 * goes next") must never show something the real build wouldn't do --
 * exercised across every stage a preview could exist or vanish: mid
 * shell-1, right as shell 1 completes (batch buttons appear), after
 * building the final shell (nothing left to preview), and after
 * removing that shell again (the preview reappears). No console errors
 * at any of those transitions is the real check here (the fixture's own
 * auto-check) -- the geometry itself is already covered by
 * nextRcpCellsToBuild reusing the exact same selection code the real
 * build buttons call.
 */
test('the "RCP-Coordinates" preview survives every build/remove stage without erroring', async ({ page }) => {
  await resetTo(page, 'CUBE');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await clickMain4D(page);
  await page.getByRole('button', { name: 'RCP-Coordinates' }).click();
  await page.waitForTimeout(200);

  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: new RegExp(`Add next cell \\(${i} / 6\\)`) }).click();
    await page.waitForTimeout(100);
  }
  await expect(page.getByRole('button', { name: 'Build next shell' })).toBeVisible();

  await page.getByRole('button', { name: 'Build next shell' }).click();
  await page.waitForTimeout(300);
  await expect(page.getByRole('button', { name: 'Build next shell' })).toBeDisabled(); // fully closed -- nothing left to preview

  await page.getByRole('button', { name: 'Remove last shell' }).click();
  await page.waitForTimeout(300);
  await expect(page.getByRole('button', { name: 'Build next shell' })).toBeEnabled(); // preview reappears
});

/**
 * The MAIN 3D/4D mode toggle itself (direct user feedback: "screen is
 * too busy... BUILD 3D/4D should be main toggle on 4D capable"): "3D"
 * shows this node's ordinary controls (Delete, Attach via face, Attach
 * via Duoprism), "4D" shows only the RCP-C2B build controls -- never
 * both at once. Delete stays visible in both modes by direct user
 * decision (you can remove the whole structure without switching back
 * to 3D first).
 */
test('the main 3D/4D toggle splits ordinary controls from RCP-C2B controls, never showing both', async ({ page }) => {
  await resetTo(page, 'CUBE');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected CUBE node/')).toBeVisible();

  // Default is 3D: ordinary controls visible, no RCP-C2B controls yet.
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add next cell/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'RCP-Coordinates' })).toHaveCount(0);

  await clickMain4D(page);
  // 4D: RCP-C2B controls visible, ordinary attach controls gone, Delete stays.
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add next cell/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Attach via face…' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Attach via Duoprism…' })).toHaveCount(0);

  // Switching back to 3D hides the RCP-C2B controls again -- the build
  // itself isn't lost, just not shown (switching back to 4D would reveal
  // it again, unlike a plain page.tsx re-render).
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('button', { name: /Add next cell/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
});

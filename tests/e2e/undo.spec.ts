import { test, expect } from './fixtures';
import { getCanvasCenter, resetTo, findOnCanvas, findNodeBody, openBrowserWheel, clickWheelLabel, exactLabel, getSavedAssembly } from './utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  await resetTo(page, 'D4');
});

test('Undo removes the most recently confirmed attach and frees its target vertex again', async ({ page }) => {
  const undoBtn = page.getByRole('button', { name: 'Undo', exact: true });
  // (Not disabled here: the beforeEach Start over is itself an undo step.)

  const { cx, cy } = await getCanvasCenter(page);
  const vertexHit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity/.test(t));
  expect(vertexHit).not.toBeNull();

  await page.getByRole('button', { name: 'Attach via vertex…' }).click();
  await openBrowserWheel(page);
  await clickWheelLabel(page, exactLabel('Deltahedra'));
  await clickWheelLabel(page, 'D6');
  await expect(page.locator('text=/Placing D6/')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('text=/Placing D6/')).toHaveCount(0);

  await expect(undoBtn).toBeEnabled();
  // The saved localStorage entry holds whatever was last SAVED, not live
  // client state -- confirming an attach only updates the browser's own
  // graph, never auto-saves. Real bug caught here: this check used to
  // read it without saving first, silently passing only because
  // whichever test happened to run immediately before it had coincidentally
  // left 2 nodes saved -- broke for real once a sibling spec (export.spec.ts)
  // started explicitly saving a clean 1-node state first. Save before
  // checking, same as the post-undo check below already correctly does.
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  let assembly = await getSavedAssembly(page);
  expect(assembly.nodes, 'expected two nodes after the confirmed attach').toHaveLength(2);

  await undoBtn.click();
  await expect(page.locator('text=/^Undone\./')).toBeVisible();

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();
  assembly = await getSavedAssembly(page);
  expect(assembly.nodes, 'expected the attach to be fully undone, back to the single root').toHaveLength(1);
  expect(assembly.connections).toHaveLength(0);

  // The vertex should be findable again as free (no "(occupied)" suffix).
  const reselect = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity \d+$/.test(t), {
    click: false,
  });
  expect(reselect, 'expected the undone vertex to be free again').not.toBeNull();
});

test('Undo is disabled while a new shape is waiting to be placed', async ({ page }) => {
  const undoBtn = page.getByRole('button', { name: 'Undo', exact: true });
  const { cx, cy } = await getCanvasCenter(page);
  const vertexHit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity/.test(t));
  expect(vertexHit).not.toBeNull();
  await page.getByRole('button', { name: 'Attach via vertex…' }).click();
  await openBrowserWheel(page);
  await clickWheelLabel(page, exactLabel('Deltahedra'));
  await clickWheelLabel(page, 'D6');
  await expect(page.locator('text=/Placing D6/')).toBeVisible();
  await expect(undoBtn).toBeDisabled();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(undoBtn).toBeEnabled();
});

test('Undo steps back through several attaches, most recent first', async ({ page }) => {
  test.setTimeout(300_000); // two canvas vertex hunts + four saves -- ran at ~2.5 min, right at the default limit
  const undoBtn = page.getByRole('button', { name: 'Undo', exact: true });
  const { cx, cy } = await getCanvasCenter(page);
  const attachD6AtFreeVertex = async () => {
    const hit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity \d+$/.test(t));
    expect(hit, 'expected a free vertex to attach at').not.toBeNull();
    await page.getByRole('button', { name: 'Attach via vertex…' }).click();
    await openBrowserWheel(page);
    await clickWheelLabel(page, exactLabel('Deltahedra'));
    await clickWheelLabel(page, 'D6');
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.locator('text=/Placing D6/')).toHaveCount(0);
  };
  const savedNodeCount = async () => {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('text=Saved')).toBeVisible();
    return (await getSavedAssembly(page)).nodes.length;
  };

  await attachD6AtFreeVertex();
  await attachD6AtFreeVertex();
  expect(await savedNodeCount()).toBe(3);

  await undoBtn.click();
  expect(await savedNodeCount(), 'first undo removes only the second attach').toBe(2);
  await expect(undoBtn).toBeEnabled();

  await undoBtn.click();
  expect(await savedNodeCount(), 'second undo removes the first attach too').toBe(1);
});

test('Undo also reverses a delete and a Start over, not just attaches', async ({ page }) => {
  const undoBtn = page.getByRole('button', { name: 'Undo', exact: true });
  const { cx, cy } = await getCanvasCenter(page);
  const nodes = async () => {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('text=Saved')).toBeVisible();
    return (await getSavedAssembly(page)).nodes.map((n) => n.shape).sort().join(',');
  };
  const hit = await findOnCanvas(page, cx, cy, (t) => /^vertex \d+ — capacity \d+$/.test(t));
  expect(hit).not.toBeNull();
  await page.getByRole('button', { name: 'Attach via vertex…' }).click();
  await openBrowserWheel(page);
  await clickWheelLabel(page, exactLabel('Deltahedra'));
  await clickWheelLabel(page, 'D6');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('text=/Placing D6/')).toHaveCount(0);
  expect(await nodes()).toBe('D4,D6');

  // Start over replaces the whole build -- undo brings it back.
  await resetTo(page, 'D8');
  expect(await nodes()).toBe('D8');
  await undoBtn.click();
  expect(await nodes()).toBe('D4,D6');

  // A delete is undoable too: delete the root (cascades to the D6), undo.
  const rootHit = await findNodeBody(page, cx, cy, (t) => t.includes('D4') && t.includes('select'));
  expect(rootHit, 'expected to find the D4 root node body').not.toBeNull();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('text=/Deleted node and 1 attached descendant/')).toBeVisible();
  expect(await nodes()).toBe('');
  await undoBtn.click();
  expect(await nodes()).toBe('D4,D6');
});

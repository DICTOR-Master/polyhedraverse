import { test, expect } from './fixtures';
import { getCanvasCenter, resetTo, readTooltipAt, findOnCanvas, getSavedAssembly, setSavedAssembly, pickShape } from './utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  await resetTo(page, 'CUBE');
});

test('selecting a CUBE face offers a matching face-attach, and confirming attaches it', async ({ page }) => {
  const { cx, cy } = await getCanvasCenter(page);

  // A freshly reset root is centered at the world origin, which projects to
  // the canvas center under the default camera -- click there to select the
  // whole node plus whichever face happens to be under the cursor.
  const text = await readTooltipAt(page, cx, cy);
  expect(text).toContain('CUBE');
  expect(text).toMatch(/attach via this 4-gon face/);
  await page.mouse.click(cx, cy);

  await expect(page.locator('text=/Selected CUBE node \\(face \\d+, 4-gon\\)/')).toBeVisible();

  const attachBtn = page.getByRole('button', { name: 'Attach via face…' });
  await expect(attachBtn).toBeVisible();
  await attachBtn.click();
  await pickShape(page, 'CUBE');

  await expect(page.locator('text=/Placing CUBE/')).toBeVisible();

  // Drag to cycle through the discrete face registrations. Unlike
  // vertex-attach's continuous twist, two glued faces have no free
  // rotation -- only n discrete states that keep them flush (see
  // scripts/verify-face-twist.ts) -- so this confirms the cycling
  // interaction is wired, not a continuous angle.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 200, cy, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('text=/registration \\d+\\/4/')).toBeVisible();

  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('text=/Placing CUBE/')).toHaveCount(0);

  // Re-hovering the same screen position is NOT a reliable check here: the
  // newly-attached cube sits between the camera and the root along the
  // glued face's normal, so it now correctly occludes the root at that
  // exact pixel (real 3D occlusion, not a bug) -- hovering there next finds
  // the *new* cube's own free far face, not the root's now-occupied one.
  // Verify the actual graph instead, via the real saved localStorage state.
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('text=Saved')).toBeVisible();

  const assembly = await getSavedAssembly(page);
  expect(assembly.nodes, 'expected two CUBE nodes after the face-attach').toHaveLength(2);
  expect(assembly.nodes.every((n: { shape: string }) => n.shape === 'CUBE')).toBe(true);
  expect(assembly.connections, 'expected exactly one connection').toHaveLength(1);
  expect(assembly.connections[0].kind, 'expected a face-kind connection').toBe('face');
});

test('cancelling a face-attach frees the target face again', async ({ page }) => {
  const { cx, cy } = await getCanvasCenter(page);

  await page.mouse.click(cx, cy);
  await page.getByRole('button', { name: 'Attach via face…' }).click();
  await pickShape(page, 'CUBE');
  await expect(page.locator('text=/Placing CUBE/')).toBeVisible();

  await page.getByRole('button', { name: 'Cancel (Esc)' }).click();
  await expect(page.locator('text=/Placing CUBE/')).toHaveCount(0);

  const textAfter = await readTooltipAt(page, cx, cy);
  expect(textAfter).toContain('CUBE');
  expect(textAfter).toMatch(/attach via this 4-gon face/);
});

/**
 * Real user request: "when attach a face is selected that relevant
 * options automatically appear across all groups." ShapeBrowser's own Home tab (family
 * tiles + Recent/Favorites shelves) and Favorites tab had the identical
 * gap: filterIds was never threaded through to them at all, so a face-
 * attach in progress still showed every family and every favorited shape
 * regardless of whether it could ever actually attach. Checked here via
 * RHOMBIC_DODECAHEDRON, whose rhombus only Catalan shapes share:
 * only Catalan has a real match, and TRIAKIS_TETRAHEDRON (also Catalan,
 * but not congruent to RD's own rhombus) is a real non-match.
 */
test('face-attaching onto an RD face filters Home and Favorites too', async ({ page }) => {
  // Favorite one compatible shape (RD itself) and one incompatible one
  // (TRIAKIS_TETRAHEDRON) via the plain, unfiltered 'reset' picker's
  // Search tab, before ever entering face-attach mode.
  await page.getByRole('button', { name: /^Start over with/ }).click();
  const searchInput = page.getByPlaceholder(/Search shapes/);

  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await searchInput.fill('rhombic dodecahedron');
  // exact: true matters here -- each ShapePreviewCard's own root <div> is
  // ALSO role="button" (the whole card is clickable to open the detail
  // drawer), and its computed accessible name happens to include the
  // nested Favorite button's own text as a substring. A plain substring
  // match on "Favorite" resolves .first() to that outer card div instead
  // of the real <button>, which opens the detail drawer rather than
  // toggling the favorite -- caught live: it hung the second fill()
  // beneath the now-opened, full-screen drawer.
  await page.getByRole('button', { name: 'Favorite', exact: true }).first().click();
  await searchInput.fill('triakis tetrahedron');
  await page.getByRole('button', { name: 'Favorite', exact: true }).first().click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await resetTo(page, 'RHOMBIC_DODECAHEDRON');
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await page.getByRole('button', { name: 'Attach via face…' }).click();

  const browser = page.getByRole('dialog', { name: 'Shape browser' });

  // ShapeBrowser stays mounted across opens (only `open` toggles), so its
  // internal `tab` state carries over from the earlier Search-tab visit
  // above rather than resetting to Home -- explicitly select Home first
  // rather than assuming it's still the landing tab.
  await browser.getByRole('button', { name: 'Home', exact: true }).click();

  // Home tab -- family tiles.
  await expect(browser.getByRole('button', { name: /Catalan/ })).toBeVisible();
  for (const fam of ['Platonic', 'Archimedean', 'Johnson', 'Prisms', 'Antiprisms', 'Deltahedra']) {
    await expect(browser.getByRole('button', { name: new RegExp(fam) })).toHaveCount(0);
  }

  // Home tab's own Favorites shelf -- only the compatible favorite shows (RD is in Recent too:
  // resetTo opened its details).
  await expect(browser.locator('text=/^rhombic dodecahedron$/i').first()).toBeVisible();
  await expect(browser.locator('text=/^triakis tetrahedron$/i')).toHaveCount(0);

  // Favorites tab -- same filtering, independently.
  await browser.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(browser.locator('text=/^rhombic dodecahedron$/i')).toBeVisible();
  await expect(browser.locator('text=/^triakis tetrahedron$/i')).toHaveCount(0);
});

test('Miscellaneous pyramid: pointed lateral face offers no attach at all, regular base skips straight to filtered Full Catalog', async ({ page }) => {
  // Seeded directly through the same localStorage key Save/Load use, then reloaded.
  await setSavedAssembly(page, {
    nodes: [{ id: 'a', shape: 'PYRAMID_SQUARE_G1', transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] } }],
    connections: [],
  });
  await page.reload();
  await page.waitForTimeout(500);

  const { cx, cy } = await getCanvasCenter(page);

  // A root node's centroid always projects to the canvas center -- for
  // this pyramid that centroid sits inside its lateral shell, so the
  // center reliably lands on a 3-gon (lateral, pointed) face, never the
  // 4-gon base. Confirmed directly (not assumed): this is exactly how the
  // "should offer nothing" case was found while building the gate.
  const lateralTip = await readTooltipAt(page, cx, cy);
  expect(lateralTip).toContain('PYRAMID_SQUARE_G1');
  expect(lateralTip).toMatch(/attach via this 3-gon face/);
  await page.mouse.click(cx, cy);
  await expect(page.locator('text=/Selected PYRAMID_SQUARE_G1 node \\(face \\d+, 3-gon\\)/')).toBeVisible();

  // Direct user instruction: a graded pyramid's pointed (non-regular)
  // lateral face must never offer face-attach at all, "so pointed
  // pyramids don't stick to each other" -- the button itself shouldn't
  // even render (faceAttachOptions.length > 0 gates it in page.tsx).
  await expect(page.getByRole('button', { name: 'Attach via face…' })).toHaveCount(0);

  // The base face is edge-on (near-zero screen width) under the default
  // camera angle -- confirmed directly via a screenshot while building
  // this test, not assumed. A modest orbit drag lands on ANOTHER edge-on
  // angle just as often (the base's 4-fold symmetry around the apex axis
  // means many azimuths are edge-on to some base edge) -- a wider, 320px
  // net horizontal drag was the smallest tried that actually cleared it,
  // confirmed empirically by trying several before picking this one, not
  // guessed. Dragging starts on empty space away from the shape (well
  // clear of its raycast target) so this is OrbitControls rotating the
  // view, not a click/drag on the shape itself.
  await page.mouse.move(cx - 160, cy);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(cx - 160 + i * 16, cy, { steps: 2 });
  }
  await page.mouse.up();
  await page.waitForTimeout(200);

  const found = await findOnCanvas(page, cx, cy, (text) => text.includes('PYRAMID_SQUARE_G1') && /attach via this 4-gon face/.test(text), { radius: 220, step: 30 });
  expect(found, 'expected to find the 4-gon base face somewhere around the canvas center').not.toBeNull();
  await expect(page.locator('text=/Selected PYRAMID_SQUARE_G1 node \\(face \\d+, 4-gon\\)/')).toBeVisible();

  const attachBtn = page.getByRole('button', { name: 'Attach via face…' });
  await expect(attachBtn).toBeVisible();
  await attachBtn.click();

  // The actual UX fix under test: opening face-attach mode must land
  // directly on the filtered Full Catalog (the "← Back" button, only
  // shown in Full Catalog), not the plain Home screen of family tiles --
  // real user complaint: "sometimes no shapes are offered and you have
  // to go looking."
  // A "Home"/"Favorites"/etc. bottom tab bar is always present regardless
  // of showFullCatalog (each tab click resets it back to false) -- the
  // real signal that this landed on Full Catalog directly, not Home, is
  // the "← Back" button (only rendered while showFullCatalog is true) and
  // the ABSENCE of Home-screen content like its family tiles.
  const browser = page.getByRole('dialog', { name: 'Shape browser' });
  await expect(browser.getByRole('button', { name: '← Back' })).toBeVisible();
  await expect(browser.getByRole('button', { name: /Catalan/ })).toHaveCount(0);
});

// Direct request 2026-09-30: with a pair set, face attach lists the
// complementary piece first, not down in its own family.
test('face-attach lists the selected shape\'s pair partners first', async ({ page }) => {
  const { cx, cy } = await getCanvasCenter(page);
  await page.mouse.click(cx, cy);
  await page.getByRole('button', { name: 'Attach via face…' }).click();
  const partners = page.locator('[data-testid="pair-partners"]');
  await expect(partners).toBeVisible();
  // CUBE pairs with the triangular and octagonal prisms (both fit a square face).
  await expect(partners.locator('text=/3-gonal prism/i').first()).toBeVisible();
  await expect(partners.locator('text=/8-gonal prism/i').first()).toBeVisible();
  // Above every family section.
  const first = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="pair-partners"]');
    const s = document.querySelector('[id^="fc-section-"]');
    return !!p && !!s && !!(p.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(first).toBe(true);
});

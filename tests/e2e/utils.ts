import type { Page } from '@playwright/test';
import { ASSEMBLY_STORAGE_KEY, type Assembly } from '../../krp-core/src/assembly/assembly.js';

/**
 * Save/load moved from a server API route to browser localStorage
 * 2026-09-16 (the route 500'd in production -- Vercel's serverless
 * filesystem is read-only outside /tmp; see app/lib/assembly.ts's own
 * ASSEMBLY_STORAGE_KEY doc comment). These replace every test's own
 * `fetch('/api/assemblies')` call with the same localStorage read/write
 * the app itself now does, importing the real key so tests can't drift
 * from it.
 */
export async function getSavedAssembly(page: Page): Promise<Assembly> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), ASSEMBLY_STORAGE_KEY);
  if (raw === null) throw new Error(`getSavedAssembly: nothing saved at localStorage key "${ASSEMBLY_STORAGE_KEY}" -- did the test Save first?`);
  return JSON.parse(raw);
}

export async function setSavedAssembly(page: Page, assembly: Assembly): Promise<void> {
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [ASSEMBLY_STORAGE_KEY, JSON.stringify(assembly)] as const);
}

export async function getCanvasCenter(page: Page): Promise<{ cx: number; cy: number }> {
  // Scoped to <main>: the shape browser's previews are canvases too.
  const canvas = page.getByRole('main').locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not found or not visible');
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
}

/** The open shape browser (Start over…/Attach via…/the tools column's ◈ opened it). */
function shapeBrowser(page: Page) {
  return page.getByRole('dialog', { name: 'Shape browser' });
}

/**
 * Picks specId in the open shape browser: Search for its id (search matches ids), open its own card
 * (data-spec-id, so "cube" never lands on "snub cube"), then Add to Scene. Whatever opened the
 * browser (start over, attach via face or vertex) decides what the pick does.
 */
export async function pickShape(page: Page, specId: string): Promise<void> {
  const browser = shapeBrowser(page);
  await browser.getByRole('button', { name: 'Search', exact: true }).click();
  await browser.getByPlaceholder(/Search shapes/).fill(specId.toLowerCase());
  await browser.locator(`[data-spec-id="${specId}"]`).first().click();
  await page.getByRole('button', { name: 'Add to Scene' }).click();
}

/** Opens the open shape browser's Full Catalog (its header button). */
export async function openFullCatalog(page: Page): Promise<void> {
  await shapeBrowser(page).getByRole('button', { name: 'Full Catalog', exact: true }).click();
}

/** Starts over with specId (Start over with… → pickShape) and waits for the reset to settle. */
export async function resetTo(page: Page, specId: string): Promise<void> {
  await page.getByRole('button', { name: /^Start over with/ }).click();
  await pickShape(page, specId);
  await page.waitForTimeout(300);
}

/** Reads the floating hover-tooltip's text after moving the mouse to (x, y), or '' if none is shown. */
export async function readTooltipAt(page: Page, x: number, y: number, settleMs = 50): Promise<string> {
  await page.mouse.move(x, y);
  await page.waitForTimeout(settleMs);
  const label = page.locator('.pointer-events-none.absolute.z-10');
  const visible = await label.isVisible().catch(() => false);
  return visible ? ((await label.textContent()) ?? '') : '';
}

export interface FindResult {
  dx: number;
  dy: number;
  text: string;
}

/**
 * Sweeps the mouse over a square region around (cx, cy) until the floating
 * tooltip's text satisfies `predicate`, then (by default) clicks there.
 *
 * Vertices and node bodies aren't separate DOM elements — they're raycast
 * hits against a WebGL canvas — so from outside the app a pixel sweep
 * reading the tooltip text is the only way to find one. This is
 * comparatively slow (each step is a real round-trip through the browser),
 * so callers should prefer a direct readTooltipAt() wherever the target's
 * screen position is already known or derivable (e.g. a root node's body
 * always projects to the canvas center) and reserve sweeping for genuinely
 * unknown positions like "some free vertex."
 */
export async function findOnCanvas(
  page: Page,
  cx: number,
  cy: number,
  predicate: (text: string) => boolean,
  opts: { click?: boolean; radius?: number; step?: number } = {},
): Promise<FindResult | null> {
  const { click = true, radius = 160, step = 16 } = opts;

  for (let dx = -radius; dx <= radius; dx += step) {
    for (let dy = -radius; dy <= radius; dy += step) {
      const text = await readTooltipAt(page, cx + dx, cy + dy, 10);
      if (text && predicate(text)) {
        if (click) await page.mouse.click(cx + dx, cy + dy);
        return { dx, dy, text };
      }
    }
  }
  return null;
}

/**
 * Finds a node's body by trying the canvas center first (a root node's
 * centroid is always the world origin, which projects there under the
 * default camera — no sweep needed for the common case) and only falls back
 * to a full sweep if that miss(es) — e.g. another node visually occludes it.
 */
export async function findNodeBody(
  page: Page,
  cx: number,
  cy: number,
  predicate: (text: string) => boolean,
): Promise<FindResult | null> {
  const direct = await readTooltipAt(page, cx, cy);
  if (direct && predicate(direct)) {
    await page.mouse.click(cx, cy);
    return { dx: 0, dy: 0, text: direct };
  }
  return findOnCanvas(page, cx, cy, predicate);
}

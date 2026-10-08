import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Save/load now persists to each test's own isolated browser-context
  // localStorage (see app/lib/assembly.ts's ASSEMBLY_STORAGE_KEY), not a
  // shared server-side file, so cross-test state races are no longer the
  // reason for serial execution -- but this Raspberry Pi dev environment
  // has its own separate constraint (confirmed directly: concurrent
  // `npx playwright test` invocations cause spurious ENOENT/timeout
  // failures from real resource contention), so serial/single-worker
  // stays the right setting regardless.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  // findOnCanvas (tests/e2e/utils.ts) sweeps the mouse pixel-by-pixel over a
  // WebGL canvas looking for a tooltip — there's no DOM element to wait on,
  // so this is legitimately slower than typical UI interactions. The default
  // 30s test timeout was cutting these off mid-sweep.
  timeout: 150_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

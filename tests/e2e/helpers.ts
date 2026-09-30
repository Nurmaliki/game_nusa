import { expect, type Page } from '@playwright/test';

/**
 * Shared E2E helpers (Phase 15).
 *
 * The app is SSR/prerendered, so a page's markup is visible before SvelteKit has
 * hydrated it — clicking an SSR button too early is a no-op. These helpers wait
 * for a deterministic readiness signal instead of racing hydration or using
 * arbitrary sleeps.
 */

/** Wait until the app has hydrated (event handlers attached). */
export async function waitForHydration(page: Page): Promise<void> {
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached({ timeout: 15000 });
}

/** Start a brand-new game from the menu and land on /play with the engine up. */
export async function startNewGame(page: Page): Promise<void> {
	await page.goto('/');
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Game Baru' }).click();
	await expect(page).toHaveURL(/\/play/, { timeout: 15000 });
	// The engine is lazy-loaded; wait until Phaser is actually running.
	await expect(page.locator('.game-root[data-engine-ready="true"]')).toBeAttached({
		timeout: 15000
	});
}

/**
 * Make the page controlled by the service worker. We never call
 * `clients.claim()`, so a page becomes controlled only on the navigation *after*
 * the worker activates. Under parallel load the first reload can land before
 * activation finishes, so reload until the controller is present.
 */
export async function ensureServiceWorkerControl(page: Page): Promise<void> {
	await page.waitForFunction(() => navigator.serviceWorker?.ready != null, undefined, {
		timeout: 20000
	});
	await expect
		.poll(
			async () => {
				if (await page.evaluate(() => navigator.serviceWorker?.controller != null)) return true;
				await page.reload();
				return page.evaluate(() => navigator.serviceWorker?.controller != null);
			},
			{ timeout: 30000, intervals: [500, 1000, 1500, 2000] }
		)
		.toBe(true);
}

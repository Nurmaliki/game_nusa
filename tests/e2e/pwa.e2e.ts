import { expect, test } from '@playwright/test';
import { ensureServiceWorkerControl } from './helpers';

/**
 * Phase 12 PWA/offline: the manifest is served and well-formed, the service
 * worker registers and controls the page, and a reload works with the network
 * cut off (served from cache).
 */
test('pwa: manifest is served and valid', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await page.goto('/');

	// The manifest link is present and resolves to valid JSON with icons.
	const href = await page.getAttribute('link[rel="manifest"]', 'href');
	expect(href).toBe('/manifest.webmanifest');

	const res = await page.request.get('/manifest.webmanifest');
	expect(res.ok()).toBe(true);
	const manifest = (await res.json()) as {
		name: string;
		start_url: string;
		display: string;
		icons: { src: string; sizes: string }[];
	};
	expect(manifest.name).toContain('Nusantara');
	expect(manifest.display).toBe('standalone');
	expect(manifest.start_url).toBe('/');
	expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
	// Every named icon is actually served.
	for (const icon of manifest.icons) {
		const r = await page.request.get(icon.src);
		expect(r.ok(), `icon ${icon.src}`).toBe(true);
		expect(r.headers()['content-type']).toContain('image/png');
	}

	// The theme-color + apple meta are wired.
	await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#10331f');

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});

test('pwa: service worker registers and controls the page', async ({ page, context }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await page.goto('/');
	await expect(page.getByRole('heading', { name: /NUSANTARA/i })).toBeVisible();

	// Wait for the SW to register and take control (retries the reload under load).
	await ensureServiceWorkerControl(page);

	const scope = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? '');
	expect(scope).toContain('/sw.js');

	// The shell should now be cached: verify the cache store exists.
	const cacheNames = await page.evaluate(() => caches.keys());
	expect(cacheNames.some((n) => n.startsWith('nusantara-'))).toBe(true);

	// Offline reload: cut the network, reload, and the shell must still render.
	await context.setOffline(true);
	await page.reload();
	await expect(page.getByRole('heading', { name: /NUSANTARA/i })).toBeVisible({ timeout: 15000 });
	await context.setOffline(false);

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});

test('pwa: the game boots offline after the first visit', async ({ page, context }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	// First visit: warm the SW + precache the shell.
	await page.goto('/');
	await ensureServiceWorkerControl(page);
	// Visit /play once so its HTML + chunks are cached.
	await page.goto('/play');
	await page.waitForFunction(() => navigator.serviceWorker?.controller != null, undefined, {
		timeout: 15000
	});

	// Now cut the network entirely and boot the game.
	await context.setOffline(true);
	await page.goto('/play');
	// The engine is lazy-loaded from cached chunks; wait until it is running.
	await expect(page.locator('.game-root[data-engine-ready="true"]')).toBeAttached({
		timeout: 20000
	});
	await expect(page.locator('.clock .time')).toBeVisible();
	await context.setOffline(false);

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});

test('pwa: offline indicator appears while disconnected', async ({ page, context }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: /NUSANTARA/i })).toBeVisible();

	await context.setOffline(true);
	// The browser fires an `offline` event when context goes offline.
	await page.evaluate(() => window.dispatchEvent(new Event('offline')));
	await expect(page.getByText(/Mode offline/)).toBeVisible();
	await context.setOffline(false);
});

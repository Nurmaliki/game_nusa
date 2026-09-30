import { expect, test } from '@playwright/test';

/**
 * Phase 15 release-candidate checks: the build carries real metadata (not the
 * dev placeholder), the About panel surfaces it, the controls reference renders
 * from the live key map, and the static build advertises the right caching /
 * content types. (The Vercel-only security headers live in vercel.json and are
 * not applied by the local preview server, so they are asserted there instead.)
 */
test('release: build metadata is real and surfaced in About', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await page.goto('/about');

	// The version is a semver triple and the build id is a real value, never 'dev'.
	const version = await page.locator('dt:has-text("Versi") + dd').textContent();
	expect(version?.trim()).toMatch(/^\d+\.\d+\.\d+$/);

	const build = await page.locator('dt:has-text("Build") + dd').textContent();
	expect(build?.trim()).toBeTruthy();
	expect(build?.trim()).not.toBe('dev');

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});

test('release: settings lists the live key map', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await page.goto('/settings');
	await expect(page.getByRole('heading', { name: 'Peta Tombol' })).toBeVisible();

	// Movement shows both aliases, and the hotbar collapses to a 1–5 range.
	await expect(page.locator('kbd', { hasText: 'W / ↑' })).toBeVisible();
	await expect(page.locator('kbd', { hasText: '1–5' })).toBeVisible();
	await expect(page.locator('kbd', { hasText: 'Spasi' })).toBeVisible();

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});

test('release: static assets advertise correct caching and content types', async ({ page }) => {
	// The manifest carries the correct content type.
	const manifest = await page.request.get('/manifest.webmanifest');
	expect(manifest.ok()).toBe(true);
	expect(manifest.headers()['content-type']).toContain('application/manifest+json');

	// Hashed immutable assets are cached forever.
	const html = await (await page.request.get('/')).text();
	const assetMatch = html.match(/\/_app\/immutable\/[^"']+\.js/);
	expect(assetMatch, 'an immutable app asset is referenced').not.toBeNull();
	if (assetMatch) {
		const asset = await page.request.get(assetMatch[0]);
		expect(asset.ok()).toBe(true);
		expect(asset.headers()['cache-control']).toContain('immutable');
	}

	// The service worker is served (long-term caching policy is set on Vercel).
	const sw = await page.request.get('/sw.js');
	expect(sw.ok()).toBe(true);
});

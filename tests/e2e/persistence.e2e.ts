import { expect, test } from '@playwright/test';
import { startNewGame, waitForHydration } from './helpers';

/**
 * Phase 11 persistence: a played slot shows up in the menu, can be exported to
 * a file, and that file can be re-imported — with checksum validation and no
 * page errors. Exercises the full round trip through IndexedDB + integrity.
 */
test('persistence: save appears in menu, exports and re-imports', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	// Play a fresh game so an autosave/slot exists.
	await startNewGame(page);

	// Force a save, then quit to the menu.
	await page.getByRole('button', { name: 'Simpan' }).click();
	await page.waitForTimeout(400);
	await page.getByRole('button', { name: 'Keluar' }).click();
	await expect(page).toHaveURL(/\/$/);

	// The slot manager lists the played slot.
	await expect(page.getByRole('heading', { name: 'Slot Tersimpan' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Lanjut' }).first()).toBeVisible();

	// Inspect reports the slot is valid.
	await page.getByRole('button', { name: 'Cek' }).first().click();
	await expect(page.getByText(/^OK/)).toBeVisible();

	// Export: capture the download and read it back.
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Ekspor' }).first().click();
	const download = await downloadPromise;
	const path = await download.path();
	expect(path).toBeTruthy();

	// The exported file is a checksummed envelope.
	const fs = await import('node:fs/promises');
	const text = await fs.readFile(path!, 'utf-8');
	const parsed = JSON.parse(text) as { format?: string; checksum?: string; data?: unknown };
	expect(parsed.format).toBe('nusantara-save');
	expect(typeof parsed.checksum).toBe('string');
	expect(parsed.data).toBeTruthy();

	// Re-import the exported file through the UI.
	const chooser = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'Impor…' }).click();
	const fc = await chooser;
	await fc.setFiles({
		name: 'roundtrip.json',
		mimeType: 'application/json',
		buffer: Buffer.from(text)
	});
	await expect(page).toHaveURL(/\/play/);
	await page.waitForTimeout(800);

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});

test('persistence: tampered export is rejected on import', async ({ page }) => {
	await page.goto('/');
	await waitForHydration(page);
	await page.getByRole('button', { name: 'Game Baru' }).click();
	await expect(page).toHaveURL(/\/play/);
	await expect(page.locator('.game-root[data-engine-ready="true"]')).toBeAttached({
		timeout: 15000
	});
	await page.getByRole('button', { name: 'Keluar' }).click();
	await expect(page).toHaveURL(/\/$/);

	// Build a valid-looking but tampered envelope.
	const tampered = JSON.stringify({
		format: 'nusantara-save',
		envelopeVersion: 1,
		schemaVersion: 2,
		gameVersion: '1.0.0',
		exportedAt: 0,
		checksum: 'deadbeef',
		data: { saveId: 'x', schemaVersion: 2 }
	});

	const chooser = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'Impor…' }).click();
	const fc = await chooser;
	await fc.setFiles({
		name: 'tampered.json',
		mimeType: 'application/json',
		buffer: Buffer.from(tampered)
	});

	// We stay on the menu and see a failure notice.
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText(/Impor gagal/)).toBeVisible();
});

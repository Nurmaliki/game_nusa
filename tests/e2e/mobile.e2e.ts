import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Phase 9 mobile controls: on a touch device the on-screen joystick + action
 * buttons render and are usable without crashing the simulation.
 */
test.describe('mobile controls', () => {
	test.use({
		hasTouch: true,
		isMobile: true,
		viewport: { width: 844, height: 390 }
	});

	test('joystick and action buttons render on a touch device', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));

		await startNewGame(page);

		// The on-screen controls appear on touch devices.
		const joystick = page.getByRole('button', { name: 'Tuas gerak', exact: true });
		await expect(joystick).toBeVisible();
		await expect(page.getByRole('button', { name: 'Serang', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Bangun', exact: true })).toBeVisible();

		// Dragging the joystick should not throw and the sim keeps ticking.
		const box = await joystick.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 4 });
			await page.mouse.up();
		}

		// Tap the attack button.
		await page.getByRole('button', { name: 'Serang', exact: true }).click();
		await page.waitForTimeout(300);

		await expect(page.locator('.clock .time')).toBeVisible();
		expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
	});

	test('portrait phone shows the rotate hint', async ({ page }) => {
		// Override to a portrait, small viewport.
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/play');
		await page.waitForTimeout(1200);

		const hint = page.getByRole('alertdialog', { name: 'Putar perangkat' });
		await expect(hint).toBeVisible();
		await expect(hint.getByText('Putar Perangkat')).toBeVisible();
	});
});

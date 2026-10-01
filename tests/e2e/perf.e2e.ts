import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Performance guard (post-release).
 *
 * A live per-chunk `Graphics` once re-tessellated every frame and silently
 * stalled the game to ~5 fps. Nothing caught it because no test measured frame
 * rate. This test boots the world, then samples requestAnimationFrame for a few
 * seconds and asserts a floor.
 *
 * The threshold is deliberately conservative (well under a healthy 60 fps) so
 * it stays green on slow CI runners and software rendering, while still failing
 * loudly on a stall of the kind we hit. If a future environment is slower still,
 * lower PERF_MIN_FPS rather than deleting the check.
 */
const PERF_MIN_FPS = 15;
const SAMPLE_MS = 3000;

test('perf: the world renders at a stable frame rate', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	await startNewGame(page);
	// Let chunk streaming, wildlife spawn, and the ambient pass settle.
	await page.waitForTimeout(2000);

	const measure = () =>
		page.evaluate(
			(ms) =>
				new Promise<number>((resolve) => {
					let frames = 0;
					const start = performance.now();
					const tick = () => {
						frames++;
						const elapsed = performance.now() - start;
						if (elapsed >= ms) resolve((frames * 1000) / elapsed);
						else requestAnimationFrame(tick);
					};
					requestAnimationFrame(tick);
				}),
			SAMPLE_MS
		);

	// Idle frame rate.
	const idle = await measure();
	// Moving frame rate (stresses chunk churn / ground (re)bake).
	await page.keyboard.down('d');
	const moving = await measure();
	await page.keyboard.up('d');

	// Emit both numbers in the failure message so regressions are diagnosable.
	expect(idle, `idle fps too low: ${idle.toFixed(1)}`).toBeGreaterThan(PERF_MIN_FPS);
	expect(moving, `moving fps too low: ${moving.toFixed(1)}`).toBeGreaterThan(PERF_MIN_FPS);

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});

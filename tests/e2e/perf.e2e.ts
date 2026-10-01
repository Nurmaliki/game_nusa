import { expect, test } from '@playwright/test';
import { startNewGame } from './helpers';

/**
 * Performance guard (post-release).
 *
 * A live per-chunk `Graphics` once re-tessellated every frame and silently
 * stalled the game to ~5 fps. Nothing caught it because no test measured frame
 * rate.
 *
 * ROBUSTNESS: an absolute FPS floor is brittle — CI runners, software WebGL
 * (SwiftShader) and concurrent browsers all move the number around, which made
 * a fixed threshold flap. Instead we measure a BASELINE: the rAF rate of a
 * trivial blank page in the same browser, then require the game to run at a
 * healthy FRACTION of that baseline. A machine-wide slowdown scales both down
 * together, so the ratio stays stable, while a genuine render stall (the bug:
 * ~5 fps against a ~55 fps baseline ≈ 9%) fails loudly.
 *
 * Idle and moving are both checked; moving stresses chunk churn / ground bake.
 */
const SAMPLE_MS = 2500;
/** The game must reach at least this fraction of the same-browser baseline. */
const MIN_BASELINE_RATIO = 0.4;
/** Samples per phase; the best (max) is used to shrug off transient dips. */
const SAMPLES = 3;

/** Take several rAF samples and return the best (highest) fps. */
async function bestOf(pageName: import('@playwright/test').Page, ms = SAMPLE_MS) {
	let best = 0;
	for (let i = 0; i < SAMPLES; i++) {
		best = Math.max(best, await sampleRaf(pageName, ms));
	}
	return best;
}

async function sampleRaf(pageName: import('@playwright/test').Page, ms = SAMPLE_MS) {
	return pageName.evaluate(
		(millis) =>
			new Promise<number>((resolve) => {
				let frames = 0;
				const start = performance.now();
				const tick = () => {
					frames++;
					const elapsed = performance.now() - start;
					if (elapsed >= millis) resolve((frames * 1000) / elapsed);
					else requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			}),
		ms
	);
}

test('perf: the world renders at a stable frame rate', async ({ page }) => {
	// Multiple sampling windows plus boot/settle comfortably exceed the default.
	test.setTimeout(90_000);
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	// 1) Baseline: how fast can this browser tick rAF with almost no work? Take
	// the best of several samples so a momentarily throttled machine (e.g. right
	// after the rest of the suite) doesn't deflate the ratio denominator's use.
	await page.goto('about:blank');
	const baseline = await bestOf(page);

	// 2) Boot the game and let chunk streaming, spawns and the ambient pass settle.
	await startNewGame(page);
	await page.waitForTimeout(2000);

	const idle = await bestOf(page);
	await page.keyboard.down('d');
	const moving = await bestOf(page);
	await page.keyboard.up('d');

	// Ratios in the failure message so a regression is diagnosable at a glance.
	const idleRatio = idle / baseline;
	const movingRatio = moving / baseline;
	const detail =
		`baseline=${baseline.toFixed(1)} idle=${idle.toFixed(1)} (${(idleRatio * 100).toFixed(0)}%) ` +
		`moving=${moving.toFixed(1)} (${(movingRatio * 100).toFixed(0)}%)`;

	expect(idleRatio, `idle fps too low vs baseline: ${detail}`).toBeGreaterThan(MIN_BASELINE_RATIO);
	expect(movingRatio, `moving fps too low vs baseline: ${detail}`).toBeGreaterThan(
		MIN_BASELINE_RATIO
	);

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});

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
 * (SwiftShader) and concurrent browsers all move the number around. A fixed
 * threshold flapped, so we compare the game against its OWN environment:
 *
 *   1. Baseline — the rAF rate of a trivial blank page in the same browser
 *      session (the browser's ceiling in this machine's current state).
 *   2. The live game, sampled several times; the BEST window is used so a GC
 *      pause or CPU steal during one window cannot fail the run.
 *
 * The pass bar is a FRACTION of the baseline. The floor is deliberately well
 * under 1 (software rendering is legitimately slower than a blank page) but the
 * regression we guard against was ~9% of baseline, so a stall still fails.
 *
 * Idle and moving are both checked; moving stresses chunk churn / ground bake.
 */
const SAMPLE_MS = 2500;
/** The game must reach at least this fraction of the same-browser baseline. */
const MIN_BASELINE_RATIO = 0.2;
/** Best-of N game windows, to shrug off a single noisy sample. */
const SAMPLES = 3;

async function sampleRaf(page: import('@playwright/test').Page, ms = SAMPLE_MS) {
	return page.evaluate(
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

/** Best of N rAF samples (highest fps wins). */
async function bestOf(page: import('@playwright/test').Page, ms = SAMPLE_MS) {
	let best = 0;
	for (let i = 0; i < SAMPLES; i++) best = Math.max(best, await sampleRaf(page, ms));
	return best;
}

test('perf: the world renders at a stable frame rate', async ({ page }) => {
	// Baseline + boot/settle + (idle + moving) best-of-3 easily exceeds 30s.
	test.setTimeout(120_000);
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));

	// 1) Baseline: the browser's max rAF rate on an empty page, best of N so a
	// momentarily throttled machine doesn't inflate the denominator unfairly.
	await page.goto('about:blank');
	const baseline = await bestOf(page);

	// 2) Boot the game and let chunk streaming, spawns and the ambient pass settle.
	await startNewGame(page);
	await page.waitForTimeout(2000);

	const idle = await bestOf(page);
	await page.keyboard.down('d');
	const moving = await bestOf(page);
	await page.keyboard.up('d');

	const idleRatio = baseline > 0 ? idle / baseline : 0;
	const movingRatio = baseline > 0 ? moving / baseline : 0;
	const detail =
		`baseline=${baseline.toFixed(1)} idle=${idle.toFixed(1)} (${(idleRatio * 100).toFixed(0)}%) ` +
		`moving=${moving.toFixed(1)} (${(movingRatio * 100).toFixed(0)}%)`;

	expect(idleRatio, `idle fps too low vs baseline: ${detail}`).toBeGreaterThan(MIN_BASELINE_RATIO);
	expect(movingRatio, `moving fps too low vs baseline: ${detail}`).toBeGreaterThan(
		MIN_BASELINE_RATIO
	);

	expect(errors, `page errors: ${errors.join('\n')}`).toHaveLength(0);
});

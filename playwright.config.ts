import { defineConfig, devices } from '@playwright/test';

/**
 * E2E configuration (Phase 15 + post-release).
 *
 * Two projects:
 *  - `chromium`: the functional suite. Runs with bounded parallelism — each test
 *    boots a WebGL game canvas, and one worker per core exhausts the GPU context
 *    pool on CI and crashes sessions.
 *  - `perf`: the frame-rate guard, which measures real requestAnimationFrame
 *    throughput. It must NOT share the machine with another browser (software
 *    rendering is CPU-bound), so it runs alone with a single worker.
 */
export default defineConfig({
	// The webServer builds the app from scratch then previews it; on a cold CI
	// runner a production build can exceed the 60s default, so allow more time.
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		timeout: 180_000
	},
	testMatch: '**/*.e2e.{ts,js}',
	workers: 2,
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			testIgnore: '**/perf.e2e.ts'
		},
		{
			// Solo run: the perf measurement is meaningless under render contention.
			name: 'perf',
			use: { ...devices['Desktop Chrome'] },
			testMatch: '**/perf.e2e.ts',
			fullyParallel: false,
			workers: 1
		}
	]
});

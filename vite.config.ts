import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { execSync } from 'node:child_process';

/**
 * Build id surfaced in Settings → About (see §55). Prefer the deploy provider's
 * commit sha (Vercel exposes VERCEL_GIT_COMMIT_SHA), fall back to the local git
 * short sha, and finally to a timestamp — never leave it as a useless constant.
 */
function resolveBuildId(): string {
	const fromEnv =
		process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? process.env.VITE_BUILD_ID;
	if (fromEnv) return fromEnv.slice(0, 12);
	try {
		return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return `build-${Date.now().toString(36)}`;
	}
}

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		'import.meta.env.VITE_BUILD_ID': JSON.stringify(resolveBuildId())
	},
	build: {
		// Split the (large, rarely-changing) Phaser engine into its own chunk so
		// app-code changes no longer invalidate the cached engine bundle, and the
		// browser can fetch/parse the engine in parallel with the app shell.
		rolldownOptions: {
			output: {
				codeSplitting: {
					groups: [
						{ name: 'phaser', test: /node_modules[\\/]phaser[\\/]/ },
						{ name: 'vendor', test: /node_modules[\\/]/ }
					]
				}
			}
		},
		// The Phaser engine chunk is inherently large; raise the warning ceiling
		// to the measured engine size so genuine regressions still warn.
		chunkSizeWarningLimit: 1600
	},
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			reporter: ['text-summary', 'json-summary'],
			include: ['src/lib/game/**/*.ts', 'src/lib/data/**/*.ts'],
			// Engine/IO-bound files (Phaser scenes & renderers, WebAudio, IndexedDB
			// repository, input, sprite painting, the game bootstrap and the
			// console logger) are exercised by the Playwright E2E suite, not the
			// node unit runner, so they are excluded from the unit denominator.
			exclude: [
				'src/**/*.spec.ts',
				'src/**/*.svelte.ts',
				'src/lib/game/scenes/**',
				'src/lib/game/world/**',
				'src/lib/game/audio/**',
				'src/lib/game/input/**',
				'src/lib/game/entities/**',
				'src/lib/game/building/build-controller.ts',
				'src/lib/game/save/repository.ts',
				'src/lib/game/save/autosave.ts',
				'src/lib/game/core/art.ts',
				'src/lib/game/core/sprites.ts',
				'src/lib/game/core/placeholders.ts',
				'src/lib/game/core/game-config.ts',
				'src/lib/game/core/logger.ts'
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 75,
				statements: 80
			}
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

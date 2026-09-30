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

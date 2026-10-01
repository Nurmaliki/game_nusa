import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}',
	// Two workers: each E2E boots a WebGL game canvas, and running one per core
	// exhausts the GPU/context pool on CI machines and crashes sessions. Two
	// keeps runs parallel without the instability.
	workers: 2,
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});

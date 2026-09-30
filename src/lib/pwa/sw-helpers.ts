/**
 * Pure helpers for PWA wiring (Phase 12). No DOM, no side effects — unit-tested.
 */

/** The registration path the browser fetches. */
export const SW_URL = '/sw.js';
/** Scope so the worker controls the whole origin. */
export const SW_SCOPE = '/';

export interface RegistrationPlan {
	/** Whether a service worker should be registered in this environment. */
	register: boolean;
	/** Reason for skipping registration (for logging), when applicable. */
	reason?: 'unsupported' | 'insecure' | 'dev';
}

/**
 * Decide whether to register the service worker.
 * Skipped in dev (HMR noise) and without the required browser APIs.
 */
export function planRegistration(input: {
	hasServiceWorker: boolean;
	isSecureContext: boolean;
	isDev: boolean;
}): RegistrationPlan {
	if (!input.hasServiceWorker) return { register: false, reason: 'unsupported' };
	if (!input.isSecureContext) return { register: false, reason: 'insecure' };
	if (input.isDev) return { register: false, reason: 'dev' };
	return { register: true };
}

/** Cross-tab/tab lifecycle states the UI can render. */
export type SwStatus = 'unsupported' | 'registering' | 'ready' | 'update-ready' | 'error';

export interface SwState {
	status: SwStatus;
	/** True when the app has cached the shell and can work offline. */
	offlineReady: boolean;
	/** True when a new version is waiting to activate. */
	updateAvailable: boolean;
	/** Human-readable detail (never contains secrets). */
	detail?: string;
}

export function initialState(): SwState {
	return { status: 'registering', offlineReady: false, updateAvailable: false };
}

/** Derive the label + tone for the status pill. */
export function statusLabel(state: SwState): { text: string; tone: 'ok' | 'warn' | 'off' } {
	if (state.updateAvailable) return { text: 'Pembaruan tersedia', tone: 'warn' };
	if (state.offlineReady) return { text: 'Siap offline', tone: 'ok' };
	switch (state.status) {
		case 'unsupported':
			return { text: 'Tanpa offline', tone: 'off' };
		case 'error':
			return { text: 'Gagal offline', tone: 'warn' };
		default:
			return { text: 'Menyiapkan offline…', tone: 'off' };
	}
}

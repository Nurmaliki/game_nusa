import { browser, dev } from '$app/environment';
import { initialState, planRegistration, SW_SCOPE, SW_URL, type SwState } from './sw-helpers';

/**
 * Service-worker lifecycle store (Phase 12).
 *
 * Registers `/sw.js`, tracks whether the app is offline-ready and whether an
 * update is waiting, and exposes {@link applyUpdate} to activate it. All browser
 * APIs are guarded so SSR and unsupported browsers are safe no-ops.
 */
class ServiceWorkerStore {
	state = $state<SwState>(initialState());
	private registration: ServiceWorkerRegistration | null = null;

	/** Register once. Safe to call from an onMount. */
	async init(): Promise<void> {
		if (!browser) return;
		const plan = planRegistration({
			hasServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
			isSecureContext: typeof window !== 'undefined' && window.isSecureContext,
			isDev: dev
		});
		if (!plan.register) {
			this.state = {
				status: 'unsupported',
				offlineReady: false,
				updateAvailable: false,
				detail: plan.reason
			};
			return;
		}

		try {
			const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
			this.registration = reg;

			// Already controlled → the shell is cached.
			if (navigator.serviceWorker.controller) {
				this.state = { status: 'ready', offlineReady: true, updateAvailable: false };
			}

			reg.addEventListener('updatefound', () => {
				const installing = reg.installing;
				if (!installing) return;
				installing.addEventListener('statechange', () => {
					if (installing.state === 'installed' && navigator.serviceWorker.controller) {
						this.state = { ...this.state, status: 'update-ready', updateAvailable: true };
					}
				});
			});

			// First install completes → offline ready.
			await this.awaitReady(reg);

			navigator.serviceWorker.addEventListener('controllerchange', () => {
				// A new worker took over; reflect it as ready.
				this.state = {
					status: 'ready',
					offlineReady: true,
					updateAvailable: false
				};
			});
		} catch (e) {
			this.state = {
				status: 'error',
				offlineReady: false,
				updateAvailable: false,
				detail: e instanceof Error ? e.message : 'registration_failed'
			};
		}
	}

	private awaitReady(reg: ServiceWorkerRegistration): Promise<void> {
		if (reg.active) {
			this.state = { status: 'ready', offlineReady: true, updateAvailable: false };
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			const worker = reg.installing ?? reg.waiting;
			if (!worker) return resolve();
			worker.addEventListener('statechange', () => {
				if (worker.state === 'activated') {
					this.state = { status: 'ready', offlineReady: true, updateAvailable: false };
					resolve();
				}
			});
		});
	}

	/** Activate a waiting update (called from the UI). */
	applyUpdate(): void {
		const waiting = this.registration?.waiting;
		if (waiting) {
			waiting.postMessage({ type: 'SKIP_WAITING' });
		}
	}

	/** Ask the SW for its cache version (diagnostics). */
	async requestVersion(): Promise<string | null> {
		if (!browser || !navigator.serviceWorker.controller) return null;
		return new Promise((resolve) => {
			const channel = new MessageChannel();
			channel.port1.onmessage = (e) => resolve(e.data?.version ?? null);
			navigator.serviceWorker.controller?.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
			setTimeout(() => resolve(null), 1500);
		});
	}
}

export const swStore = new ServiceWorkerStore();

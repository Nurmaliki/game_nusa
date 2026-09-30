import { describe, it, expect } from 'vitest';
import {
	initialState,
	planRegistration,
	statusLabel,
	SW_SCOPE,
	SW_URL,
	type SwState
} from './sw-helpers';

describe('planRegistration', () => {
	it('registers when supported, secure and not dev', () => {
		expect(
			planRegistration({ hasServiceWorker: true, isSecureContext: true, isDev: false }).register
		).toBe(true);
	});

	it('skips when the API is missing', () => {
		const r = planRegistration({ hasServiceWorker: false, isSecureContext: true, isDev: false });
		expect(r.register).toBe(false);
		expect(r.reason).toBe('unsupported');
	});

	it('skips on an insecure origin', () => {
		const r = planRegistration({ hasServiceWorker: true, isSecureContext: false, isDev: false });
		expect(r.register).toBe(false);
		expect(r.reason).toBe('insecure');
	});

	it('skips in dev', () => {
		const r = planRegistration({ hasServiceWorker: true, isSecureContext: true, isDev: true });
		expect(r.register).toBe(false);
		expect(r.reason).toBe('dev');
	});
});

describe('statusLabel', () => {
	const base: SwState = initialState();

	it('prioritises an available update', () => {
		const l = statusLabel({ ...base, updateAvailable: true, offlineReady: true });
		expect(l.tone).toBe('warn');
		expect(l.text).toContain('Pembaruan');
	});

	it('reports offline-ready', () => {
		const l = statusLabel({ ...base, offlineReady: true });
		expect(l.tone).toBe('ok');
	});

	it('reports unsupported as neutral/off', () => {
		const l = statusLabel({ status: 'unsupported', offlineReady: false, updateAvailable: false });
		expect(l.tone).toBe('off');
	});

	it('reports an error as a warning', () => {
		const l = statusLabel({ status: 'error', offlineReady: false, updateAvailable: false });
		expect(l.tone).toBe('warn');
	});
});

describe('constants', () => {
	it('points at the root-scoped worker', () => {
		expect(SW_URL).toBe('/sw.js');
		expect(SW_SCOPE).toBe('/');
	});
});

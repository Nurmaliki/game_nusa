/* Nusantara Survival — service worker (Phase 12).
 *
 * Hand-written, dependency-free. Strategy:
 *   • Navigations (HTML documents): network-first with a cache fallback so the
 *     game boots and plays with no network after the first visit.
 *   • Immutable hashed build assets (/_app/immutable/**) and icons: cache-first
 *     (safe — the filename changes whenever the bytes change).
 *   • Everything else same-origin: left to the network. We deliberately DO NOT
 *     touch SvelteKit's client-side data fetches (`__data.json`) or route
 *     chunks: caching those as documents poisons client-side navigation.
 *
 * Bump CACHE_VERSION on any change to force a clean swap.
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `nusantara-${CACHE_VERSION}`;
// Only truly static, always-safe-to-cache destinations are precached. All routes
// are prerendered to static HTML, so the game shell is available offline from
// the first install.
const PRECACHE = ['/', '/play', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
	// Precache best-effort: a single failure must not block installation.
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) =>
			Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' }))))
		)
	);
});

// Activate: purge stale caches. We intentionally DO NOT call clients.claim():
// claiming mid-session races in-flight SPA navigations; the next full
// navigation picks up the controller instead.
self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
		})()
	);
});

/** Cache-first for immutable hashed assets. */
async function cacheFirst(request) {
	const cache = await caches.open(CACHE_NAME);
	const cached = await cache.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response && response.ok) cache.put(request, response.clone());
	return response;
}

/** Network-first for documents, with a cache fallback when offline. */
async function networkFirstDocument(request) {
	const cache = await caches.open(CACHE_NAME);
	try {
		const response = await fetch(request);
		if (response && response.ok) cache.put(request, response.clone());
		return response;
	} catch {
		const cached = await cache.match(request);
		if (cached) return cached;
		return (await cache.match('/')) || Response.error();
	}
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	// Only handle top-level document navigations and immutable assets. All other
	// same-origin requests (SvelteKit data/route chunks) go straight to network.
	if (request.mode === 'navigate') {
		event.respondWith(networkFirstDocument(request));
		return;
	}

	if (url.pathname.startsWith('/_app/immutable/') || url.pathname.startsWith('/icons/')) {
		event.respondWith(cacheFirst(request));
	}
});

// The page asks the SW to activate a waiting worker; respond with the version
// so the UI can display it.
self.addEventListener('message', (event) => {
	const data = event.data;
	if (data && data.type === 'SKIP_WAITING') self.skipWaiting();
	if (data && data.type === 'GET_VERSION' && event.source) {
		event.source.postMessage({ type: 'SW_VERSION', version: CACHE_VERSION });
	}
});

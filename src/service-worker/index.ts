import { immutable, assets } from '$app/manifest';
import { version } from '$app/env';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `cache-${version}`;

// Manifest paths are relative to the base path; resolve them against the SW scope.
const toUrl = (path: string) => new URL(path.replace(/^\//, ''), sw.registration.scope).href;

// The app renders entirely client-side, so one HTML shell can boot any route.
const SHELL = toUrl('');

// iOS launch screens are only fetched by iOS at install time; caching ~2 MB of them is waste.
// Everything else is precached, including the whole flower database (index and detail
// shards), so every species page works offline. Only the hotlinked species photos need a
// connection.
const isLaunchScreen = (path: string) => /(^|\/)apple-splash-/.test(path);

const PRECACHE = [
	SHELL,
	...immutable.map((entry) => toUrl(entry.path)),
	...assets.filter((entry) => !isLaunchScreen(entry.path)).map((entry) => toUrl(entry.path))
];

sw.addEventListener('install', (event) => {
	// No skipWaiting(): an update waits until the user taps "Update" (see src/lib/pwa.svelte.ts),
	// so a running session never has its files swapped out from under it.
	// `reload` bypasses the HTTP cache: unhashed files (shell, manifest, icons) could otherwise be
	// precached from a stale copy and then served from this cache for the whole version.
	const requests = PRECACHE.map((url) => new Request(url, { cache: 'reload' }));
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(requests)));
});

sw.addEventListener('message', (event) => {
	if (event.data === 'skip-waiting') sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	event.respondWith(request.mode === 'navigate' ? page(request) : resource(request, url));
});

/**
 * Offline-first: every page load is answered instantly from the cached shell, whatever
 * the network is doing (offline, flaky, or the site gone). New versions arrive through
 * the service worker update flow instead.
 */
async function page(request: Request): Promise<Response> {
	const cached = await caches.match(SHELL, { cacheName: CACHE });
	return cached ?? fetch(request);
}

async function resource(request: Request, url: URL): Promise<Response> {
	const cache = await caches.open(CACHE);

	// Build artifacts and static files never change for a given version.
	if (PRECACHE.includes(url.href)) {
		const cached = await cache.match(url.href);
		if (cached) return cached;
	}

	try {
		const response = await fetch(request);
		if (response.ok) {
			if (response.type === 'basic') cache.put(request, response.clone());
			return response;
		}
		// Server error or missing deployment: prefer a cached copy if there is one.
		return (await cache.match(request)) ?? response;
	} catch (error) {
		const cached = await cache.match(request);
		if (cached) return cached;
		throw error;
	}
}

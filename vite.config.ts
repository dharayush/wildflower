import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

// GitHub Pages serves the app from /wildflower/ (set by .github/workflows/deploy.yml);
// local builds (preview, the tunnel) stay at the root.
const base = (process.env.BASE_PATH ?? '') as '' | `/${string}`;

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Client-only SPA: all data lives on-device (IndexedDB), so there is no server.
			// The fallback page serves any route that wasn't prerendered; GitHub Pages serves
			// 404.html for unknown paths, which boots the app on any route.
			adapter: adapter({ fallback: '404.html' }),

			// Root-relative asset URLs, so the cached shell the service worker serves for
			// any route (e.g. /journal/1 while offline) still finds its scripts.
			paths: { relative: false, base }
		})
	],
	// Let phones reach `npm run preview` through a temporary HTTPS tunnel
	// (`npx cloudflared tunnel --url http://localhost:4173`) to test installing.
	preview: {
		// Both forms: the tunnel can forward the host with a trailing dot (fully qualified).
		allowedHosts: ['.trycloudflare.com', '.trycloudflare.com.'],
		// Keep the tunnel's edge and the phone's HTTP cache from holding old unhashed files
		// (icons, manifest) between builds.
		headers: { 'Cache-Control': 'no-cache' }
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.ts'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

/**
 * Finds species whose photos no longer load (usually because flowersofindia.net renamed the
 * flower: the old page redirects, and the photos were renamed with it), and re-reads their
 * photo list from the site's current page. Writes flower-database/data/images-refetched.json
 * ({ source_url: { page, images } }, absolute URLs), which `npm run species` merges in.
 *
 * Checks each species' main photo (a rename always breaks it) with a HEAD request, gently
 * (the site stops answering under a burst of requests), so it takes ~30 minutes. Run after
 * `npm run species` (it reads the built output), then run `npm run species` again.
 *
 *   node scripts/fetch-images.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pageImages } from './species-text.ts';

const BUILT = 'static/species';
const OUT = 'flower-database/data/images-refetched.json';
const CONCURRENCY = 2;
/** Pause after each request, per worker. */
const PAUSE_MS = 250;

const { imageHost } = JSON.parse(readFileSync(join(BUILT, 'index.json'), 'utf8'));
const details: Record<string, { source: string; images: string[] }> = {};
for (const file of readdirSync(join(BUILT, 'details'))) {
	Object.assign(details, JSON.parse(readFileSync(join(BUILT, 'details', file), 'utf8')));
}

async function pool<T>(items: T[], run: (item: T) => Promise<void>) {
	let next = 0;
	await Promise.all(
		Array.from({ length: CONCURRENCY }, async () => {
			while (next < items.length) {
				await run(items[next++]);
				await new Promise((done) => setTimeout(done, PAUSE_MS));
			}
		})
	);
}

async function loads(url: string): Promise<boolean> {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15_000) });
			if (response.status === 404) return false;
			if (response.ok) return true;
		} catch {
			// Retry network hiccups.
		}
	}
	return false;
}

/** The species' current page, following the site's meta-refresh redirects. */
async function currentPage(url: string): Promise<{ url: string; html: string }> {
	for (let hop = 0; hop < 4; hop++) {
		const html = await (await fetch(url, { signal: AbortSignal.timeout(30_000) })).text();
		const redirect = html.match(/http-equiv=["']?refresh["']?[^>]*url=([^"'>]+)/i)?.[1];
		if (!redirect) return { url, html };
		url = new URL(redirect.trim(), url).href.replace(/ /g, '%20');
	}
	throw new Error(`Too many redirects: ${url}`);
}

// 1. Which species' main photos don't load?
const ids = Object.keys(details).filter((id) => details[id].images.length);
const broken = new Set<string>();
let checked = 0;
await pool(ids, async (id) => {
	if (!(await loads(imageHost + details[id].images[0]))) broken.add(id);
	if (++checked % 500 === 0) console.log(`checked ${checked}/${ids.length}, broken ${broken.size}`);
});
console.log(`Species with broken photos: ${broken.size}`);

// 2. Re-read their photo lists from the current pages, adding to earlier runs' results
//    (species fixed then no longer look broken in the built output).
const found: Record<string, { page: string; images: string[] }> = existsSync(OUT)
	? JSON.parse(readFileSync(OUT, 'utf8'))
	: {};
await pool([...broken], async (id) => {
	const source = imageHost + details[id].source;
	try {
		const page = await currentPage(source);
		const images: string[] = [];
		for (const url of pageImages(page.html, page.url)) {
			if (await loads(url)) images.push(url);
		}
		found[source] = { page: page.url, images };
		console.log(images.length ? 'ok  ' : 'none', id, page.url);
	} catch (error) {
		console.log('fail', id, source, String(error));
	}
});

const sorted = Object.fromEntries(Object.entries(found).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, JSON.stringify(sorted, null, '\t') + '\n');
console.log(`Photo lists on file: ${Object.keys(found).length} (${broken.size} checked this run)`);

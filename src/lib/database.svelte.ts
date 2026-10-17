import { browser } from '$app/env';
import { asset } from '$app/paths';
import type { AssetPath } from '$app/types';
import {
	DEFAULT_SPECIES_ORDER,
	emptyFilters,
	isSpeciesOrder,
	parseDetail,
	parseIndex,
	prepareSearch,
	searchSpecies,
	sortSpecies,
	type DetailEntry,
	type IndexFile,
	type Species,
	type SpeciesDetail,
	type SpeciesFilters,
	type SpeciesOrder
} from './species.ts';

const ORDER_KEY = 'database-order';
const RECENT_KEY = 'database-recent';
const RECENT_LIMIT = 15;

function read<T>(key: string, valid: (value: unknown) => value is T, fallback: T): T {
	try {
		const value = JSON.parse(localStorage.getItem(key) ?? 'null');
		if (valid(value)) return value;
	} catch {
		// Storage unavailable or corrupt; use the default.
	}
	return fallback;
}

function write(key: string, value: unknown) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Not persisted; still applies for this session.
	}
}

const isIdList = (value: unknown): value is number[] =>
	Array.isArray(value) && value.every(Number.isInteger);

// ── Files ───────────────────────────────────────────────────────
// The index is precached by the service worker, so it loads offline. Detail shards are
// cached as they're fetched, so entries opened once stay readable offline.

let index: Promise<{ species: Species[]; byId: Map<number, Species>; file: IndexFile }> | undefined;

function loadIndex() {
	index ??= fetch(asset('species/index.json'))
		.then((response) => {
			if (!response.ok) throw new Error(`Species index: HTTP ${response.status}`);
			return response.json() as Promise<IndexFile>;
		})
		.then((file) => {
			const species = parseIndex(file);
			return { species, byId: new Map(species.map((s) => [s.id, s])), file };
		})
		.catch((error) => {
			index = undefined; // Let a later call retry.
			throw error;
		});
	return index;
}

// A plain request cache, not UI state.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const shards = new Map<number, Promise<Record<number, DetailEntry>>>();

function loadShard(shard: number) {
	let request = shards.get(shard);
	if (!request) {
		request = fetch(asset(`species/details/${shard}.json` as AssetPath)).then((response) => {
			if (!response.ok) throw new Error(`Species details: HTTP ${response.status}`);
			return response.json();
		});
		request.catch(() => shards.delete(shard));
		shards.set(shard, request);
	}
	return request;
}

export async function getSpecies(id: number): Promise<Species | undefined> {
	return (await loadIndex()).byId.get(id);
}

/** Full details (description, photos, …); rejects when offline and not yet cached. */
export async function getSpeciesDetail(id: number): Promise<SpeciesDetail | undefined> {
	const { file } = await loadIndex();
	const entry = (await loadShard(Math.floor(id / file.shardSize)))[id];
	return entry && parseDetail(entry, file.imageHost);
}

let byName: Species[] | undefined;

/**
 * Species search for pickers (e.g. linking a journal entry), best matches first. When no
 * species matches every word ("Backyard jasmine"), returns those matching some of them,
 * flagged `partial`.
 */
export async function findSpecies(
	query: string,
	limit = 30
): Promise<{ results: Species[]; partial: boolean }> {
	byName ??= sortSpecies((await loadIndex()).species, DEFAULT_SPECIES_ORDER);
	const results = searchSpecies(byName, query);
	if (results.length || !/\s/.test(query.trim())) {
		return { results: results.slice(0, limit), partial: false };
	}
	return { results: searchSpecies(byName, query, true).slice(0, limit), partial: true };
}

// ── State ───────────────────────────────────────────────────────

/**
 * App-wide state of the Database tab, kept outside components so the list, search, and
 * scroll position survive opening a species and coming back (which the photo morph needs).
 */
class Database {
	species = $state.raw<Species[]>();
	failed = $state(false);

	searchOpen = $state(false);
	query = $state('');
	order = $state<SpeciesOrder>(DEFAULT_SPECIES_ORDER);
	filters = $state<SpeciesFilters>(emptyFilters());
	/** Show only species linked to a journal entry. */
	linkedOnly = $state(false);

	/** Recently opened species ids, newest first. */
	recent = $state<number[]>([]);

	/** Scroll position of the tab, restored when returning from a species. */
	scrollTop = 0;

	/**
	 * Which on-screen thumbnail morphs into the species page ("list-12", "recent-12"), so
	 * only one element carries the shared view-transition name.
	 */
	morph = $state<string>();

	constructor() {
		if (!browser) return;
		this.order = read(ORDER_KEY, isSpeciesOrder, DEFAULT_SPECIES_ORDER);
		this.recent = read(RECENT_KEY, isIdList, []);
	}

	/** Loads the index on first use; safe to call repeatedly. */
	load() {
		if (this.species) return;
		this.failed = false;
		loadIndex().then(
			({ species }) => {
				this.species = species;
				// Normalizing ~8,000 species takes a moment on phones; do it before the first search.
				const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 200));
				idle(() => prepareSearch(species));
			},
			(error) => {
				console.error('Failed to load the flower database', error);
				this.failed = true;
			}
		);
	}

	setOrder(order: SpeciesOrder) {
		this.order = order;
		write(ORDER_KEY, order);
	}

	addRecent(id: number) {
		this.recent = [id, ...this.recent.filter((other) => other !== id)].slice(0, RECENT_LIMIT);
		write(RECENT_KEY, this.recent);
	}

	clearRecent() {
		this.recent = [];
		write(RECENT_KEY, []);
	}
}

export const database = new Database();

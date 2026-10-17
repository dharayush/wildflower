/**
 * The flower database: species from flowersofindia.net, built into static/species/ by
 * `npm run species` (scripts/build-species.ts — keep the file shapes here in sync).
 * Pure data helpers; fetching and app state live in database.svelte.ts.
 */
import { normalize, scoreFields, searchField, tokenize, type SearchField } from './search.ts';

export const COLOURS = [
	'white',
	'yellow',
	'orange',
	'red',
	'pink',
	'purple',
	'blue',
	'green',
	'brown'
] as const;
export type Colour = (typeof COLOURS)[number];

/** Swatches for the colour filter and species pages (data colours, the same in either theme). */
export const COLOUR_SWATCHES: Record<Colour, string> = {
	white: '#fbfaf7',
	yellow: '#f3c63f',
	orange: '#f0913a',
	red: '#d9473d',
	pink: '#ef84a8',
	purple: '#9a6bd1',
	blue: '#4f86df',
	green: '#6db66c',
	brown: '#8b5d3f'
};

export const HABITS = ['herb', 'shrub', 'tree', 'vine', 'orchid'] as const;
export const ORIGINS = ['Native', 'Introduced', 'Naturalized'] as const;
export const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
] as const;

// ── Files (see scripts/build-species.ts) ────────────────────────

/** static/species/index.json */
export interface IndexFile {
	imageHost: string;
	shardSize: number;
	species: IndexEntry[];
}

interface IndexEntry {
	i: number;
	n: string[];
	b: string;
	f: string;
	h?: string;
	o?: string;
	c: Colour[];
	m: number;
	p?: string;
	s?: string[];
	l?: string[];
}

/** One entry of static/species/details/{shard}.json */
export interface DetailEntry {
	familyNote?: string;
	description?: string;
	images: string[];
	identifiedBy?: string;
	photographedIn?: string;
	source: string;
	/** Flowering season as written on the site ("June-July (Uttarakhand)"). */
	flowering?: string;
	lifeCycle?: string;
	foliage?: string;
	leafShape?: string;
	conservation?: string;
	medicinal?: string;
	languages?: Record<string, string[]>;
	toxic: boolean;
	butterflies: boolean;
	/** The site's page couldn't be read when scraping; only names are known. */
	fetchFailed?: true;
}

// ── Species ─────────────────────────────────────────────────────

export interface Species {
	id: number;
	/** Display name: the first common name. */
	name: string;
	/** All common names, display name first. */
	names: string[];
	botanical: string;
	family: string;
	habit?: string;
	origin?: string;
	/** Flower colours read from the description; empty when unknown. */
	colours: Colour[];
	/** Bloom months as a bitmask (bit 0 = January); 0 when unknown. */
	months: number;
	/** Primary photo, hosted on flowersofindia.net. */
	image?: string;
	synonyms: string[];
	/** Names in Indian and other languages. */
	otherNames: string[];
}

export interface SpeciesDetail extends Omit<DetailEntry, 'images' | 'source'> {
	images: string[];
	/** The entry's page on flowersofindia.net. */
	source: string;
}

export function parseIndex(file: IndexFile): Species[] {
	return file.species.map((entry) => ({
		id: entry.i,
		name: entry.n[0],
		names: entry.n,
		botanical: entry.b,
		family: entry.f,
		habit: entry.h,
		origin: entry.o,
		colours: entry.c,
		months: entry.m,
		image: entry.p && file.imageHost + entry.p,
		synonyms: entry.s ?? [],
		otherNames: entry.l ?? []
	}));
}

export function parseDetail(entry: DetailEntry, imageHost: string): SpeciesDetail {
	return {
		...entry,
		images: entry.images.map((path) => imageHost + path),
		source: imageHost + entry.source
	};
}

// ── Search ──────────────────────────────────────────────────────

const searchFields = new WeakMap<Species, SearchField[]>();
const exactNames = new WeakMap<Species, Set<string>>();

/** Every name of a species, normalized, for spotting a search that is exactly one of them. */
function namesOf(species: Species): Set<string> {
	let names = exactNames.get(species);
	if (!names) {
		names = new Set([...species.names, species.botanical].map((name) => tokenize(name).join(' ')));
		exactNames.set(species, names);
	}
	return names;
}

function fieldsOf(species: Species): SearchField[] {
	let fields = searchFields.get(species);
	if (!fields) {
		fields = [
			searchField(species.names.join(' · '), 10),
			searchField(species.botanical, 9),
			searchField(species.synonyms.join(' · '), 5),
			searchField(species.otherNames.join(' · '), 5),
			searchField(species.family, 3)
		];
		searchFields.set(species, fields);
	}
	return fields;
}

/** Prepares every species for searching ahead of time, so the first search doesn't stall. */
export function prepareSearch(list: readonly Species[]): void {
	for (const species of list) {
		fieldsOf(species);
		namesOf(species);
	}
}

/** A search that is exactly a species' name outranks everything else ("lotus" → Lotus). */
const EXACT_NAME_BONUS = 100;

/**
 * Species matching a search, most relevant first; equally relevant ones keep their given
 * order. Matches common names, the botanical name, synonyms, names in other languages, and
 * the family, the same way the journal search does (every word, any order, small typos).
 * With `anyWord`, species matching only some of the words count too.
 */
export function searchSpecies(list: readonly Species[], query: string, anyWord = false): Species[] {
	const tokens = tokenize(query);
	if (!tokens.length) return [...list];
	const whole = tokens.join(' ');
	const scored: { species: Species; score: number }[] = [];
	for (const species of list) {
		let score = scoreFields(fieldsOf(species), tokens, anyWord);
		if (!score) continue;
		if (namesOf(species).has(whole)) score += EXACT_NAME_BONUS;
		scored.push({ species, score });
	}
	return scored.sort((a, b) => b.score - a.score).map(({ species }) => species);
}

/**
 * For a search result found by a name that isn't on screen (another common name, a local
 * name, a synonym), that name — so it's clear why "gulab" found Damask Rose.
 */
export function aliasFor(species: Species, query: string): string | undefined {
	const tokens = tokenize(query);
	const shown = normalize(`${species.name} ${species.botanical}`);
	if (!tokens.length || tokens.every((token) => shown.includes(token))) return undefined;
	return [...species.names.slice(1), ...species.otherNames, ...species.synonyms].find((alias) => {
		const name = normalize(alias);
		return tokens.some((token) => !shown.includes(token) && name.includes(token));
	});
}

// ── Arrange ─────────────────────────────────────────────────────

export type SpeciesOrder = 'name-asc' | 'name-desc' | 'botanical-asc' | 'botanical-desc';

export const DEFAULT_SPECIES_ORDER: SpeciesOrder = 'name-asc';

export const SPECIES_ORDERS: {
	value: SpeciesOrder;
	label: string;
	group: 'Common name' | 'Botanical name';
}[] = [
	{ value: 'name-asc', label: 'A → Z', group: 'Common name' },
	{ value: 'name-desc', label: 'Z → A', group: 'Common name' },
	{ value: 'botanical-asc', label: 'A → Z', group: 'Botanical name' },
	{ value: 'botanical-desc', label: 'Z → A', group: 'Botanical name' }
];

export function isSpeciesOrder(value: unknown): value is SpeciesOrder {
	return SPECIES_ORDERS.some((order) => order.value === value);
}

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/** The name a list is sorted (and grouped into letters) by. */
export const sortKey = (species: Species, order: SpeciesOrder) =>
	order.startsWith('botanical') ? species.botanical : species.name;

/**
 * `sortKey`, normalized and without leading quotes or symbols ("'Christmas' Cactus" sorts
 * under C), so sorting and A–Z grouping always agree.
 */
const collationKey = (species: Species, order: SpeciesOrder) =>
	normalize(sortKey(species, order)).replace(/^[^a-z0-9]+/, '');

export function sortSpecies(list: readonly Species[], order: SpeciesOrder): Species[] {
	const direction = order.endsWith('desc') ? -1 : 1;
	return list
		.map((species) => ({ species, key: collationKey(species, order) }))
		.sort((a, b) => direction * collator.compare(a.key, b.key))
		.map(({ species }) => species);
}

/** A–Z section a species falls under; "#" for names starting with a digit or symbol. */
export function letterOf(species: Species, order: SpeciesOrder): string {
	const first = collationKey(species, order).charAt(0);
	return /[a-z]/.test(first) ? first.toUpperCase() : '#';
}

// ── Filters ─────────────────────────────────────────────────────

export interface SpeciesFilters {
	habits: string[];
	origins: string[];
	/** Includes 'unknown' to keep species whose colour couldn't be read. */
	colours: (Colour | 'unknown')[];
	/** Month numbers (0 = January); matches species blooming in any of them. */
	months: number[];
}

export const emptyFilters = (): SpeciesFilters => ({
	habits: [],
	origins: [],
	colours: [],
	months: []
});

export const filterCount = (filters: SpeciesFilters) =>
	filters.habits.length + filters.origins.length + filters.colours.length + filters.months.length;

/** Within a filter any choice matches; across filters all must. Unset filters match all. */
export function matchesFilters(species: Species, filters: SpeciesFilters): boolean {
	const { habits, origins, colours, months } = filters;
	if (habits.length && !habits.includes(species.habit ?? '')) return false;
	if (origins.length && !origins.includes(species.origin ?? '')) return false;
	if (
		colours.length &&
		!(species.colours.length
			? species.colours.some((colour) => colours.includes(colour))
			: colours.includes('unknown'))
	) {
		return false;
	}
	if (months.length && !months.some((month) => species.months & (1 << month))) return false;
	return true;
}

// ── Formatting ──────────────────────────────────────────────────

/** "June – August", "November – February", "March, July – August", "All year". */
export function formatMonths(mask: number): string | undefined {
	if (!mask) return undefined;
	if (mask === 0xfff) return 'All year';
	const has = (month: number) => Boolean(mask & (1 << (((month % 12) + 12) % 12)));
	// Start at a month that begins a run, so a range across the new year stays whole.
	const start = Array.from({ length: 12 }, (_, m) => m).find((m) => has(m) && !has(m - 1)) ?? 0;
	const runs: [number, number][] = [];
	for (let offset = 0; offset < 12; offset++) {
		const month = (start + offset) % 12;
		if (!has(month)) continue;
		const last = runs.at(-1);
		if (last && (last[1] + 1) % 12 === month) last[1] = month;
		else runs.push([month, month]);
	}
	return runs
		.map(([from, to]) =>
			from === to ? MONTH_NAMES[from] : `${MONTH_NAMES[from]} – ${MONTH_NAMES[to]}`
		)
		.join(', ');
}

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Scraped flowering text, tidied for display: "may-july" → "May – July". */
export function formatFlowering(text: string): string {
	const spaced = text.replace(/\s*[-–]\s*/g, ' – ').replace(/ – $/, '');
	const months = new RegExp(`\\b(${MONTH_NAMES.join('|')})\\b`, 'gi');
	return capitalize(spaced.replace(months, (month) => capitalize(month.toLowerCase())));
}

/** How threatened a conservation status is, for colouring it. */
export function conservationLevel(status: string): 'threatened' | 'concern' | 'none' {
	if (/critically|endangered|extinct/i.test(status)) return 'threatened';
	if (/vulnerable|near threatened|rare/i.test(status)) return 'concern';
	return 'none';
}

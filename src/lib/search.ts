import type { Flower } from './db.ts';

export type SortOrder = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

export const DEFAULT_ORDER: SortOrder = 'newest';

export const SORT_ORDERS: { value: SortOrder; label: string; group: 'Date added' | 'Name' }[] = [
	{ value: 'newest', label: 'Newest first', group: 'Date added' },
	{ value: 'oldest', label: 'Oldest first', group: 'Date added' },
	{ value: 'name-asc', label: 'A → Z', group: 'Name' },
	{ value: 'name-desc', label: 'Z → A', group: 'Name' }
];

export function isSortOrder(value: unknown): value is SortOrder {
	return SORT_ORDERS.some((order) => order.value === value);
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Returns a new array; ties keep their relative order. */
export function sortFlowers<T extends Flower>(flowers: readonly T[], order: SortOrder): T[] {
	const sorted = [...flowers];
	switch (order) {
		case 'newest':
			return sorted.sort((a, b) => b.createdAt - a.createdAt);
		case 'oldest':
			return sorted.sort((a, b) => a.createdAt - b.createdAt);
		case 'name-asc':
			return sorted.sort((a, b) => collator.compare(a.name, b.name));
		case 'name-desc':
			return sorted.sort((a, b) => collator.compare(b.name, a.name));
	}
}

/** Lowercase and strip accents, so "creme" finds "Crème". */
export function normalize(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

export function tokenize(query: string): string[] {
	return normalize(query)
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);
}

const monthLong = new Intl.DateTimeFormat(undefined, { month: 'long' });
const monthShort = new Intl.DateTimeFormat(undefined, { month: 'short' });

/** Words a date can be found by: "october", "oct", "8", "2026". */
function dateWords(timestamp: number): string[] {
	const date = new Date(timestamp);
	return [
		monthLong.format(date),
		monthShort.format(date),
		String(date.getDate()),
		String(date.getFullYear())
	].map(normalize);
}

/** Damerau–Levenshtein (optimal string alignment) distance, capped at `max + 1`. */
function editDistance(a: string, b: string, max: number): number {
	if (Math.abs(a.length - b.length) > max) return max + 1;
	let prev2: number[] = [];
	let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
	for (let i = 1; i <= a.length; i++) {
		const row = [i];
		let best = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				row[j] = Math.min(row[j], prev2[j - 2] + 1);
			}
			best = Math.min(best, row[j]);
		}
		if (best > max) return max + 1;
		prev2 = prev;
		prev = row;
	}
	return prev[b.length];
}

/**
 * Typos allowed for a query token: none for short ones, where they'd match everything,
 * and none for numbers ("2026" must not find "2025").
 */
function typoBudget(token: string): number {
	if (/\d/.test(token)) return 0;
	return token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0;
}

/** Whether `token` is a slightly misspelled `word`, or a misspelled start of it (as typed so far). */
function fuzzyMatches(token: string, word: string): boolean {
	const budget = typoBudget(token);
	if (!budget) return false;
	// Typos rarely hit the first letter (barring a swap of the first two). Checking it first
	// skips almost every word, which keeps searching thousands of species fast.
	if (word[0] !== token[0] && !(word[0] === token[1] && word[1] === token[0])) return false;
	// Compare against the word's prefix of similar length, so partly typed words still match.
	// Prefixes shorter than the token only count as the whole word ("roses" finds "rose"),
	// otherwise "creme" would find "cree…" in "creek".
	for (let length = token.length - budget; length <= token.length + budget; length++) {
		if (length < 1 || length > word.length) continue;
		if (length < token.length && length !== word.length) continue;
		if (editDistance(token, word.slice(0, length), budget) <= budget) return true;
	}
	return false;
}

/** Text to search, normalized ahead of time so it can be scored against many queries. */
export interface SearchField {
	text: string;
	words: string[];
	/** Relative importance: a hit in the name outranks one in the notes. */
	weight: number;
}

export function searchField(text: string, weight: number): SearchField {
	const normalized = normalize(text);
	return { text: normalized, words: tokenize(normalized), weight };
}

/**
 * Relevance of some fields for a tokenized query, or 0 if they don't match. Each query word
 * matches a field at its start, a word's start, anywhere, or with a small typo, in any
 * order. Every word has to match, unless `anyWord` (then the more that match, the better).
 */
export function scoreFields(
	fields: readonly SearchField[],
	tokens: readonly string[],
	anyWord = false
): number {
	let total = 0;
	for (const token of tokens) {
		const score = scoreToken(token, fields);
		if (!score && !anyWord) return 0;
		total += score;
	}
	return total;
}

function scoreToken(token: string, fields: readonly SearchField[]): number {
	let best = 0;
	for (const { text, words, weight } of fields) {
		let score = 0;
		if (text.startsWith(token)) score = 1;
		else if (words.includes(token)) score = 0.9;
		else if (words.some((word) => word.startsWith(token))) score = 0.8;
		// Mid-word hits only for 3+ letters: "r" shouldn't find every name with an r in it.
		else if (token.length >= 3 && text.includes(token)) score = 0.5;
		else if (words.some((word) => fuzzyMatches(token, word))) score = 0.35;
		best = Math.max(best, score * weight);
	}
	return best;
}

/**
 * Relevance of a journal entry for a search, or 0 if it doesn't match. Every word of the
 * query has to match somewhere (name, species, notes, or the date it was added), in any
 * order, case- and accent-insensitively, with small typos forgiven.
 */
export function matchScore(flower: Flower, tokens: readonly string[]): number {
	if (!tokens.length) return 1;
	return scoreFields(
		[
			searchField(flower.name, 10),
			searchField(flower.species ?? '', 6),
			searchField(flower.notes, 3),
			{ text: '', words: dateWords(flower.createdAt), weight: 2 }
		],
		tokens
	);
}

/** Matching entries, most relevant first; equally relevant ones keep their given order. */
export function searchFlowers<T extends Flower>(flowers: readonly T[], query: string): T[] {
	const tokens = tokenize(query);
	if (!tokens.length) return [...flowers];
	return flowers
		.map((flower) => ({ flower, score: matchScore(flower, tokens) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.map(({ flower }) => flower);
}

export interface Segment {
	text: string;
	match: boolean;
}

/**
 * Splits `text` into segments, marking the parts that literally contain a query word
 * (accent-insensitively), for highlighting. Typo matches aren't marked.
 */
export function highlight(text: string, query: string): Segment[] {
	const tokens = tokenize(query);
	if (!tokens.length || !text) return [{ text, match: false }];

	// Map each normalized character back to its index in the original text.
	let normalized = '';
	const origin: number[] = [];
	for (let i = 0; i < text.length;) {
		const char = String.fromCodePoint(text.codePointAt(i)!);
		const n = normalize(char);
		normalized += n;
		for (let k = 0; k < n.length; k++) origin.push(i);
		i += char.length;
	}
	origin.push(text.length);

	const marked = new Array<boolean>(text.length).fill(false);
	for (const token of tokens) {
		for (let at = normalized.indexOf(token); at !== -1; at = normalized.indexOf(token, at + 1)) {
			for (let i = origin[at]; i < origin[at + token.length]; i++) marked[i] = true;
		}
	}

	const segments: Segment[] = [];
	for (let i = 0; i < text.length; i++) {
		const last = segments.at(-1);
		if (last && last.match === marked[i]) last.text += text[i];
		else segments.push({ text: text[i], match: marked[i] });
	}
	return segments;
}

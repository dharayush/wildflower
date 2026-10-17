/**
 * Pure text helpers for `scripts/build-species.ts`, which turns the scraped
 * flowersofindia.net data in flower-database/ into the app's species files.
 */

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

const COLOUR_WORDS: Record<string, Colour> = {
	white: 'white',
	whitish: 'white',
	cream: 'white',
	creamy: 'white',
	ivory: 'white',
	yellow: 'yellow',
	yellowish: 'yellow',
	golden: 'yellow',
	gold: 'yellow',
	orange: 'orange',
	orangish: 'orange',
	apricot: 'orange',
	saffron: 'orange',
	salmon: 'orange',
	red: 'red',
	reddish: 'red',
	scarlet: 'red',
	crimson: 'red',
	vermilion: 'red',
	maroon: 'red',
	pink: 'pink',
	pinkish: 'pink',
	magenta: 'pink',
	rosy: 'pink',
	fuchsia: 'pink',
	purple: 'purple',
	purplish: 'purple',
	violet: 'purple',
	mauve: 'purple',
	lilac: 'purple',
	lavender: 'purple',
	blue: 'blue',
	bluish: 'blue',
	azure: 'blue',
	green: 'green',
	greenish: 'green',
	brown: 'brown',
	brownish: 'brown',
	chocolate: 'brown'
};

/** Parts whose colour is the flower's colour. */
const FLOWER_PARTS = new Set([
	'flower',
	'flowers',
	'floret',
	'florets',
	'bloom',
	'blooms',
	'petal',
	'petals',
	'corolla',
	'corollas',
	'tepal',
	'tepals',
	'perianth',
	'lip',
	'labellum'
]);

/** Showy parts that read as the flower's colour, except when green (then they're foliage-like). */
const SHOWY_PARTS = new Set(['bract', 'bracts', 'spathe', 'spathes']);

/** Parts whose colour says nothing about the flower's. */
const OTHER_PARTS = new Set([
	'leaf',
	'leaves',
	'leaflet',
	'leaflets',
	'stem',
	'stems',
	'stalk',
	'stalks',
	'branch',
	'branches',
	'branchlets',
	'twig',
	'twigs',
	'bark',
	'trunk',
	'wood',
	'root',
	'roots',
	'tuber',
	'fruit',
	'fruits',
	'berry',
	'berries',
	'seed',
	'seeds',
	'pod',
	'pods',
	'capsule',
	'capsules',
	'drupe',
	'drupes',
	'cone',
	'cones',
	'anther',
	'anthers',
	'stamen',
	'stamens',
	'filament',
	'filaments',
	'stigma',
	'stigmas',
	'style',
	'styles',
	'ovary',
	'sepal',
	'sepals',
	'calyx',
	'hair',
	'hairs',
	'spine',
	'spines',
	'thorn',
	'thorns',
	'vein',
	'veins',
	'midrib',
	'underside',
	'sap',
	'latex',
	'spot',
	'spots',
	'blotch',
	'blotches',
	'stripe',
	'stripes',
	'eye'
]);

/** Words after which a colour's own part won't follow ("yellow, with green sepals"). */
const CLAUSE_BREAKS = new Set([',', 'with', 'while', 'but', 'except', 'turning', 'becoming']);

/** How far after a colour word to look for the part it describes ("white tubular flowers"). */
const LOOK_AHEAD = 6;

/**
 * Flower colours stated in a description. Each colour word is attributed to a plant part
 * in the same sentence: one shortly after it in the same clause ("purple stems"), else the
 * nearest before it ("Flowers are yellow, with green sepals"), else the next one after it
 * ("yellow urn-shaped, … flowers").
 * Only colours of flowers, petals, and similar parts count.
 */
export function extractColours(description: string | undefined): Colour[] {
	if (!description) return [];
	const found = new Set<Colour>();
	// Sentences (and semicolon clauses), so "Leaves green; flowers white" stay apart.
	for (const sentence of description.toLowerCase().split(/[.;!?]\s/)) {
		// Commas are kept as tokens: a colour's part rarely follows it across one.
		const words = sentence.match(/[a-z]+|,/g) ?? [];
		words.forEach((word, i) => {
			const colour = COLOUR_WORDS[word];
			if (!colour) return;
			const part =
				partAfter(words, i, LOOK_AHEAD, true) ??
				partBefore(words, i) ??
				partAfter(words, i, Infinity, false);
			if (!part) return;
			if (FLOWER_PARTS.has(part) || (SHOWY_PARTS.has(part) && colour !== 'green')) {
				found.add(colour);
			}
		});
	}
	return COLOURS.filter((c) => found.has(c));
}

const isPart = (word: string) =>
	FLOWER_PARTS.has(word) || SHOWY_PARTS.has(word) || OTHER_PARTS.has(word);

function partAfter(
	words: string[],
	i: number,
	distance: number,
	withinClause: boolean
): string | undefined {
	for (let j = i + 1; j <= i + distance && j < words.length; j++) {
		if (withinClause && CLAUSE_BREAKS.has(words[j])) return undefined;
		if (isPart(words[j])) return words[j];
	}
}

function partBefore(words: string[], i: number): string | undefined {
	for (let j = i - 1; j >= 0; j--) {
		if (isPart(words[j])) return words[j];
	}
}

/** Unambiguous colour words in common names ("Blue Rock Anemone"; not "Orange Jasmine", which is white). */
const NAME_COLOURS: Record<string, Colour> = {
	white: 'white',
	yellow: 'yellow',
	red: 'red',
	scarlet: 'red',
	crimson: 'red',
	pink: 'pink',
	purple: 'purple',
	blue: 'blue'
};

/** Colours a common name states, unless they belong to another part ("Purple Stem Taro"). */
export function coloursInName(name: string): Colour[] {
	const words = name
		.toLowerCase()
		.split(/[^a-z]+/)
		.filter(Boolean);
	const found = new Set<Colour>();
	words.forEach((word, i) => {
		const colour = NAME_COLOURS[word];
		const next = words[i + 1];
		if (colour && !(next && OTHER_PARTS.has(next))) found.add(colour);
	});
	return COLOURS.filter((c) => found.has(c));
}

const MONTHS = [
	'jan',
	'feb',
	'mar',
	'apr',
	'may',
	'jun',
	'jul',
	'aug',
	'sep',
	'oct',
	'nov',
	'dec'
] as const;

/** Common misspellings in the source data. */
const MONTH_TYPOS: Record<string, string> = {
	ocober: 'oct',
	'0ctober': 'oct',
	septermber: 'sep',
	februay: 'feb',
	februray: 'feb'
};

function monthIndex(word: string): number {
	const w = MONTH_TYPOS[word] ?? word;
	if (w.length < 3) return -1;
	return MONTHS.findIndex((m) => w.startsWith(m) && m.startsWith(w.slice(0, 3)));
}

/**
 * Months (0 = January) a flowering string covers: "June-August", "May–June",
 * "July-December, March-April", "December-January" (wraps), "All year".
 * Returns [] when it can't be read.
 */
export function parseMonths(flowering: string | undefined): number[] {
	if (!flowering) return [];
	const text = flowering.toLowerCase();
	if (/\ball( year)?\b|throughout the year/.test(text)) return MONTHS.map((_, i) => i);
	const months = new Set<number>();
	// Ranges and single months, separated by commas, semicolons, "and", "&".
	for (const part of text.split(/[,;&]|\band\b/)) {
		const found = (part.match(/[a-z0-9]+/g) ?? []).map(monthIndex).filter((m) => m >= 0);
		if (!found.length) continue;
		const isRange = /[-–]/.test(part) && found.length >= 2;
		if (!isRange) {
			found.forEach((m) => months.add(m));
			continue;
		}
		const [from, to] = [found[0], found[found.length - 1]];
		for (let m = from; ; m = (m + 1) % 12) {
			months.add(m);
			if (m === to) break;
		}
	}
	return [...months].sort((a, b) => a - b);
}

/**
 * Repairs a scraped image URL. The scraper cut file names at the last apostrophe
 * ("Giant Devil's Fig.jpg" became "s Fig.jpg"), left raw spaces and stray
 * backslashes, and mixed encoded and unencoded names. `pageName` is the entry's
 * page title ("Giant Devil's Fig"), used to restore the cut-off start.
 */
export function repairImageUrl(url: string, pageName: string): string {
	const slash = url.lastIndexOf('/');
	const dir = url.slice(0, slash + 1);
	let file = safeDecode(url.slice(slash + 1)).replace(/\\/g, '');

	const apostrophe = pageName.lastIndexOf("'");
	if (apostrophe >= 0) {
		const head = pageName.slice(0, apostrophe + 1);
		const tail = pageName.slice(apostrophe + 1);
		// Only when what's left is the cut-off end of the name plus "-1.jpg"-style suffix.
		const cut = file.startsWith(tail) && /^(-\d+)?\.\w+$/.test(file.slice(tail.length));
		if (!file.startsWith(head) && cut) file = head + file;
	}
	return dir + encodeURIComponent(file).replace(/%27/g, "'");
}

function safeDecode(text: string): string {
	try {
		return decodeURIComponent(text);
	} catch {
		return text;
	}
}

/** Splits "Copperleaf, Joseph's coat, Fire-dragon" into its names. */
export function splitNames(names: string | undefined): string[] {
	return (names ?? '')
		.split(/\s*[,;]\s*/)
		.map((name) => name.trim())
		.filter(Boolean);
}

const ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	bull: '•',
	ndash: '–',
	mdash: '—',
	deg: '°',
	times: '×',
	plusmn: '±',
	frac12: '½'
};

/** Plain text of an HTML fragment: tags dropped, entities decoded, whitespace collapsed. */
export function htmlText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<[^>]*>/g, '')
		.replace(/&(#x?[0-9a-f]+|[a-z0-9]+);/gi, (entity, code: string) => {
			if (code[0] === '#') {
				const point =
					code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
				return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
			}
			return ENTITIES[code.toLowerCase()] ?? entity;
		})
		.replace(/\s+/g, ' ')
		.trim();
}

/** The description on a flowersofindia.net species page (`<div id="descr">`), if any. */
export function pageDescription(html: string): string | undefined {
	const match = html.match(/<div id="descr">([\s\S]*?)<\/div>/i);
	const text = match && htmlText(match[1]);
	return text && text.length > 1 ? text : undefined;
}

/**
 * Photo URLs on a flowersofindia.net species page (its slideshow's `NewImg` list of
 * ["file.jpg", "credit"] pairs), resolved against the page URL, spaces encoded.
 */
export function pageImages(html: string, pageUrl: string): string[] {
	const list = html.match(/NewImg\s*=\s*new Array\s*\(([\s\S]*?)\);/i)?.[1] ?? '';
	const files = [...list.matchAll(/\[\s*"([^"]+)"/g)].map((match) => match[1]);
	return [...new Set(files.map((file) => new URL(file, pageUrl).href.replace(/ /g, '%20')))];
}

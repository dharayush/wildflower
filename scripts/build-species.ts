/**
 * Builds the app's species database from the scraped flowersofindia.net data:
 *
 *   flower-database/flowers_full.json                  →  static/species/index.json
 *   (+ data/flowers/{id}.json for stable ids,              static/species/details/{shard}.json
 *    + data/descriptions-refetched.json,
 *    + data/images-refetched.json)
 *
 * Run with `npm run species` after the source data changes. The index holds what search,
 * browse, and filters need; details (everything else that was scraped) are split into shards
 * of SHARD_SIZE entries. The service worker precaches both, so the whole database works
 * offline. Shapes are defined in src/lib/species.ts; keep the two in sync.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	coloursInName,
	extractColours,
	parseMonths,
	repairImageUrl,
	splitNames,
	type Colour
} from './species-text.ts';

const FULL = 'flower-database/flowers_full.json';
const ID_SOURCE = 'flower-database/data/flowers';
const REFETCHED = 'flower-database/data/descriptions-refetched.json';
const IMAGES_REFETCHED = 'flower-database/data/images-refetched.json';
const OUT = 'static/species';
const SHARD_SIZE = 100;
const IMAGE_HOST = 'https://www.flowersofindia.net/';

interface SourceFlower {
	botanical_name?: string;
	common_name_english?: string;
	family?: string;
	family_note?: string;
	description?: string;
	identification_credit?: string;
	photographed_in?: string;
	source_url: string;
	origin_status?: string;
	habit?: string;
	foliage?: string;
	leaf_shape?: string;
	attracts_butterfly?: boolean;
	toxic?: boolean;
	image_urls?: string[];
	flowering?: string;
	synonyms?: string;
	life_cycle?: string;
	common_names_by_language?: Record<string, string>;
	medicinal_uses?: string;
	conservation_status?: string;
	// Pages the scraper couldn't fetch keep only what the site's index listed.
	fetch_failed?: boolean;
	common_name_index?: string;
	botanical_name_index?: string;
	family_index?: string;
	synonyms_index?: string;
}

/** One row of index.json (short keys: it ships to every device). */
interface IndexEntry {
	i: number;
	/** Common names; the first is the display name. */
	n: string[];
	/** Botanical name. */
	b: string;
	/** Family. */
	f: string;
	/** Habit: herb, shrub, tree, vine, orchid. */
	h?: string;
	/** Origin: Native, Introduced, Naturalized. */
	o?: string;
	/** Flower colours; empty when unknown. */
	c: Colour[];
	/** Bloom months as a bitmask (bit 0 = January); 0 when unknown. */
	m: number;
	/** Primary image path on IMAGE_HOST. */
	p?: string;
	/** Synonyms (other botanical names). */
	s?: string[];
	/** Names in other languages. */
	l?: string[];
}

interface Detail {
	familyNote?: string;
	description?: string;
	images: string[];
	identifiedBy?: string;
	photographedIn?: string;
	source: string;
	flowering?: string;
	lifeCycle?: string;
	foliage?: string;
	leafShape?: string;
	conservation?: string;
	medicinal?: string;
	languages?: Record<string, string[]>;
	toxic: boolean;
	butterflies: boolean;
	fetchFailed?: true;
}

const tidy = (text: string | undefined) =>
	text
		?.replace(/\s+/g, ' ')
		.replace(/\s+([.,])/g, '$1')
		.trim() || undefined;

function pageName(sourceUrl: string): string {
	const file = sourceUrl.slice(sourceUrl.lastIndexOf('/') + 1).replace(/\.html?$/, '');
	try {
		return decodeURIComponent(file);
	} catch {
		return file;
	}
}

function imagePath(url: string, page: string): string {
	const repaired = repairImageUrl(url, page);
	if (!repaired.startsWith(IMAGE_HOST)) throw new Error(`Unexpected image host: ${url}`);
	return repaired.slice(IMAGE_HOST.length);
}

/** The scraped flowering text, minus scraper slips ("Identification credit:") and stray punctuation. */
function floweringText(text: string | undefined): string | undefined {
	const clean = tidy(text)?.replace(/^[\s:;,.-]+|[\s:;,]+$/g, '');
	if (!clean || (/:$/.test(text!.trim()) && !parseMonths(clean).length)) return undefined;
	return clean;
}

// Ids come from the per-flower files, so links saved in journals keep pointing at the same
// species; flowers only in flowers_full.json get ids after the last one.
const ids = new Map<string, number>(
	readdirSync(ID_SOURCE)
		.filter((file) => file.endsWith('.json'))
		.map((file) => {
			const { id, source_url } = JSON.parse(readFileSync(join(ID_SOURCE, file), 'utf8'));
			return [source_url as string, id as number];
		})
);
const refetched: Record<string, string> = existsSync(REFETCHED)
	? JSON.parse(readFileSync(REFETCHED, 'utf8'))
	: {};
// Photo lists re-read from the site's current page, for species it has renamed since the
// scrape (their old photo links are dead). Keyed by the scraped source_url.
const imagesRefetched: Record<string, { page: string; images: string[] }> = existsSync(
	IMAGES_REFETCHED
)
	? JSON.parse(readFileSync(IMAGES_REFETCHED, 'utf8'))
	: {};

const rows: SourceFlower[] = JSON.parse(readFileSync(FULL, 'utf8'));
let nextId = Math.max(...ids.values()) + 1;
const flowers = rows
	.map((row) => ({
		...row,
		common_name_english: row.common_name_english || row.common_name_index || '',
		botanical_name: row.botanical_name || row.botanical_name_index || '',
		family: row.family || row.family_index || '',
		synonyms: row.synonyms || row.synonyms_index,
		description:
			row.description && row.description.trim().length >= 20
				? row.description
				: refetched[row.source_url]
	}))
	// A flower with no name at all has nothing worth showing.
	.filter((row) => row.common_name_english || row.botanical_name)
	.sort((a, b) => a.source_url.localeCompare(b.source_url))
	.map((row) => ({ ...row, id: ids.get(row.source_url) ?? nextId++ }))
	.sort((a, b) => a.id - b.id);

const index: IndexEntry[] = [];
const shards = new Map<number, Record<number, Detail>>();
const stats = {
	unknownColour: 0,
	unknownMonths: 0,
	repairedImages: 0,
	images: 0,
	refetched: 0,
	imagesRefetched: 0
};

for (const flower of flowers) {
	const page = pageName(flower.source_url);
	const sourceImages = flower.image_urls ?? [];
	const moved = imagesRefetched[flower.source_url];
	if (moved) stats.imagesRefetched++;
	const images = moved
		? moved.images.map((url) => imagePath(url, page))
		: [...new Set(sourceImages.map((url) => imagePath(url, page)))];
	stats.images += images.length;
	if (!moved) {
		stats.repairedImages += sourceImages.filter(
			(url) => !images.includes(url.slice(IMAGE_HOST.length))
		).length;
	}
	if (flower.description && refetched[flower.source_url] === flower.description) stats.refetched++;

	const names = splitNames(flower.common_name_english);
	const colours = [
		...new Set([
			...extractColours(flower.description),
			...coloursInName(flower.common_name_english)
		])
	];
	const months = parseMonths(flower.flowering);
	if (!colours.length) stats.unknownColour++;
	if (!months.length) stats.unknownMonths++;

	const languages = Object.fromEntries(
		Object.entries(flower.common_names_by_language ?? {})
			.map(([language, list]) => [language, splitNames(list)] as const)
			.filter(([, list]) => list.length)
	);
	const otherNames = [...new Set(Object.values(languages).flat())];
	const synonyms = splitNames(flower.synonyms);

	index.push({
		i: flower.id,
		n: names.length ? names : [flower.botanical_name],
		b: flower.botanical_name.trim(),
		f: flower.family.trim(),
		...(flower.habit && { h: flower.habit }),
		...(flower.origin_status && { o: flower.origin_status }),
		c: colours,
		m: months.reduce((mask, month) => mask | (1 << month), 0),
		...(images[0] && { p: images[0] }),
		...(synonyms.length && { s: synonyms }),
		...(otherNames.length && { l: otherNames })
	});

	const shard = Math.floor(flower.id / SHARD_SIZE);
	if (!shards.has(shard)) shards.set(shard, {});
	shards.get(shard)![flower.id] = {
		familyNote: tidy(flower.family_note),
		description: tidy(flower.description),
		images,
		identifiedBy: tidy(flower.identification_credit),
		photographedIn: tidy(flower.photographed_in),
		source: flower.source_url.slice(IMAGE_HOST.length),
		flowering: floweringText(flower.flowering),
		lifeCycle: flower.life_cycle || undefined,
		foliage: flower.foliage || undefined,
		leafShape: flower.leaf_shape || undefined,
		conservation: tidy(flower.conservation_status),
		medicinal: tidy(flower.medicinal_uses),
		languages: Object.keys(languages).length ? languages : undefined,
		toxic: Boolean(flower.toxic),
		butterflies: Boolean(flower.attracts_butterfly),
		...(flower.fetch_failed && { fetchFailed: true as const })
	};
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'details'), { recursive: true });
writeFileSync(
	join(OUT, 'index.json'),
	JSON.stringify({ imageHost: IMAGE_HOST, shardSize: SHARD_SIZE, species: index })
);
for (const [shard, details] of shards) {
	writeFileSync(join(OUT, 'details', `${shard}.json`), JSON.stringify(details));
}

const size = (path: string) => (readFileSync(path).length / 1e6).toFixed(2);
console.log(
	`Species: ${index.length} (index ${size(join(OUT, 'index.json'))} MB, ${shards.size} detail shards)`
);
console.log(`Colour unknown: ${stats.unknownColour}, bloom months unknown: ${stats.unknownMonths}`);
console.log(`Images: ${stats.images}, repaired: ${stats.repairedImages}`);
console.log(
	`Descriptions refetched: ${stats.refetched}, photo lists refetched: ${stats.imagesRefetched}`
);

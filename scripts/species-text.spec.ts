import { describe, it, expect } from 'vitest';
import {
	coloursInName,
	extractColours,
	pageDescription,
	pageImages,
	parseMonths,
	repairImageUrl,
	splitNames
} from './species-text.ts';

describe('extractColours', () => {
	it.each([
		['Flowers are white, cup-shaped, with frilly petals.', ['white']],
		['Many fragrant, small pink-flushed white tubular, funnel-shaped flowers.', ['white', 'pink']],
		[
			'A flowering stalk carrying large, open, white to pale pink lily-like flowers.',
			['white', 'pink']
		],
		['Flowers are yellow-green, with purple spots inside.', ['yellow', 'green']],
		['The flower-cluster-stalk is purple, and the spathe is bright yellow.', ['yellow']],
		['Flowers pale yellow with green or often reddish sepals.', ['yellow']],
		['Flowers are yellow, with sepals narrowly lanceshaped.', ['yellow']]
	])('reads the flower colour from %j', (text, colours) => {
		expect(extractColours(text)).toEqual(colours);
	});

	it('ignores colours of leaves, fruit, stamens, and hairs', () => {
		expect(
			extractColours('It has shiny green lemon-scented leaves, creamish white flowers.')
		).toEqual(['white']);
		expect(extractColours('Fruits are elliptic, dark purple.')).toEqual([]);
		expect(extractColours('Puff balls of white stamens tipped with pink.')).toEqual([]);
		expect(extractColours('Figs are covered with brownish yellow long hairs.')).toEqual([]);
	});

	it('does not count green bracts as flower colour, but does count showy ones', () => {
		expect(extractColours('Bracts are dark green, pointed.')).toEqual([]);
		expect(extractColours('The bright red flower bract surrounds the spike.')).toEqual(['red']);
	});

	it('keeps sentences apart', () => {
		expect(extractColours('Leaves are green. Flowers are blue.')).toEqual(['blue']);
	});

	it('handles missing descriptions', () => {
		expect(extractColours(undefined)).toEqual([]);
	});
});

describe('coloursInName', () => {
	it('takes plain colour words from names', () => {
		expect(coloursInName('Blue Rock Anemone')).toEqual(['blue']);
		expect(coloursInName('Red-Tail Bulb-Leaf Orchid')).toEqual(['red']);
	});

	it('skips colours of other parts and ambiguous words', () => {
		expect(coloursInName('Purple Stem Taro')).toEqual([]);
		expect(coloursInName('Orange Jasmine')).toEqual([]);
		expect(coloursInName('Desert Rose')).toEqual([]);
	});
});

describe('parseMonths', () => {
	it('reads ranges, single months, and lists', () => {
		expect(parseMonths('June-August')).toEqual([5, 6, 7]);
		expect(parseMonths('May–June')).toEqual([4, 5]);
		expect(parseMonths('March')).toEqual([2]);
		expect(parseMonths('February-April, July-August')).toEqual([1, 2, 3, 6, 7]);
	});

	it('wraps ranges over the new year', () => {
		expect(parseMonths('November-February')).toEqual([0, 1, 10, 11]);
	});

	it('copes with abbreviations, typos, and stray punctuation', () => {
		expect(parseMonths('Apr-May')).toEqual([3, 4]);
		expect(parseMonths('JUne-July,')).toEqual([5, 6]);
		expect(parseMonths('June-Septermber')).toEqual([5, 6, 7, 8]);
		expect(parseMonths(': March-May')).toEqual([2, 3, 4]);
		expect(parseMonths('June-July (Uttarakhand)')).toEqual([5, 6]);
	});

	it('understands all year, and gives up on unreadable values', () => {
		expect(parseMonths('All year')).toHaveLength(12);
		expect(parseMonths('Identification credit:')).toEqual([]);
		expect(parseMonths(undefined)).toEqual([]);
	});
});

describe('repairImageUrl', () => {
	const slides = 'https://www.flowersofindia.net/catalog/slides/';

	it('encodes raw spaces without double-encoding', () => {
		expect(repairImageUrl(`${slides}Glossy Abelia.jpg`, 'Glossy Abelia')).toBe(
			`${slides}Glossy%20Abelia.jpg`
		);
		expect(repairImageUrl(`${slides}Chinese%20Abelia.jpg`, 'Chinese Abelia')).toBe(
			`${slides}Chinese%20Abelia.jpg`
		);
	});

	it('restores names cut off at an apostrophe', () => {
		expect(repairImageUrl(`${slides}s Fig.jpg`, "Giant Devil's Fig")).toBe(
			`${slides}Giant%20Devil's%20Fig.jpg`
		);
		expect(repairImageUrl(`${slides}s Fig-2.jpg`, "Giant Devil's Fig")).toBe(
			`${slides}Giant%20Devil's%20Fig-2.jpg`
		);
		expect(repairImageUrl(`${slides}.jpg`, "Sunflower 'Ring of Fire'")).toBe(
			`${slides}Sunflower%20'Ring%20of%20Fire'.jpg`
		);
	});

	it('leaves unrelated names alone and drops stray backslashes', () => {
		expect(repairImageUrl(`${slides}Pride_of_India.jpg`, "Queen's Crape Myrtle")).toBe(
			`${slides}Pride_of_India.jpg`
		);
		expect(repairImageUrl(`${slides}Night\\ Blooming\\ Cereus.jpg`, 'Night Blooming Cereus')).toBe(
			`${slides}Night%20Blooming%20Cereus.jpg`
		);
	});
});

describe('splitNames', () => {
	it('splits comma-separated names', () => {
		expect(splitNames("Copperleaf, Joseph's coat, Fire-dragon")).toEqual([
			'Copperleaf',
			"Joseph's coat",
			'Fire-dragon'
		]);
		expect(splitNames(undefined)).toEqual([]);
	});
});

describe('species pages', () => {
	const url = 'https://www.flowersofindia.net/catalog/slides/Air%20Potato.html';
	const html = `<script><!-- Begin
NewImg = new Array (
["Air Potato.jpg", "A. Kumar"],
["../../extrapics/Air Potato-1.jpg", "A. Kumar"],
["../../extrapics/Air Potato-1.jpg", "dup"]
);
// End --></script>
<div id="descr"> Air Potato is a <i>climbing</i> vine &amp; tuber,
found 800&nbsp;m up. </div>`;

	it('reads the slideshow photos, resolved and encoded', () => {
		expect(pageImages(html, url)).toEqual([
			'https://www.flowersofindia.net/catalog/slides/Air%20Potato.jpg',
			'https://www.flowersofindia.net/extrapics/Air%20Potato-1.jpg'
		]);
		expect(pageImages('<p>no slideshow</p>', url)).toEqual([]);
	});

	it('reads the description as plain text', () => {
		expect(pageDescription(html)).toBe('Air Potato is a climbing vine & tuber, found 800 m up.');
		expect(pageDescription('<div id="descr"> - </div>')).toBeUndefined();
	});
});

import { describe, it, expect } from 'vitest';
import {
	conservationLevel,
	matchScientificName,
	nameKeys,
	formatFlowering,
	aliasFor,
	emptyFilters,
	formatMonths,
	letterOf,
	matchesFilters,
	parseIndex,
	searchSpecies,
	sortSpecies,
	type IndexFile
} from './species.ts';

const file: IndexFile = {
	imageHost: 'https://example.org/',
	shardSize: 100,
	species: [
		{
			i: 0,
			n: ['Damask Rose'],
			b: 'Rosa x damascena',
			f: 'Rosaceae',
			h: 'shrub',
			o: 'Introduced',
			c: ['pink'],
			m: 0b000001110000,
			p: 'slides/Damask%20Rose.jpg',
			l: ['Gulab']
		},
		{
			i: 1,
			n: ['Copperleaf', "Joseph's coat"],
			b: 'Acalypha wilkesiana',
			f: 'Euphorbiaceae',
			h: 'shrub',
			o: 'Introduced',
			c: [],
			m: 0
		},
		{
			i: 2,
			n: ['Blue Rock Anemone'],
			b: 'Anemone rupestris',
			f: 'Ranunculaceae',
			h: 'herb',
			o: 'Native',
			c: ['blue', 'white'],
			m: 0b000011000000,
			s: ['Anemone coelestina']
		},
		{
			i: 3,
			n: ['4 O’Clock Plant'],
			b: 'Mirabilis jalapa',
			f: 'Nyctaginaceae',
			h: 'herb',
			o: 'Naturalized',
			c: ['pink', 'yellow'],
			m: 0xfff
		}
	]
};
const species = parseIndex(file);
const names = (list: { name: string }[]) => list.map((s) => s.name);

describe('parseIndex', () => {
	it('expands entries, with the first common name as the display name', () => {
		expect(species[1]).toMatchObject({
			id: 1,
			name: 'Copperleaf',
			names: ['Copperleaf', "Joseph's coat"],
			synonyms: [],
			otherNames: []
		});
		expect(species[0].image).toBe('https://example.org/slides/Damask%20Rose.jpg');
		expect(species[1].image).toBeUndefined();
	});
});

describe('searchSpecies', () => {
	it('finds species by any of their names', () => {
		expect(names(searchSpecies(species, 'joseph'))).toEqual(['Copperleaf']);
		expect(names(searchSpecies(species, 'gulab'))).toEqual(['Damask Rose']);
		expect(names(searchSpecies(species, 'coelestina'))).toEqual(['Blue Rock Anemone']);
		expect(names(searchSpecies(species, 'acalypha'))).toEqual(['Copperleaf']);
		expect(names(searchSpecies(species, 'rosaceae'))).toEqual(['Damask Rose']);
	});
});

describe('searchSpecies ranking', () => {
	const lotus = parseIndex({
		...file,
		species: [
			{ ...file.species[1], i: 20, n: ['Lotus Sweetjuice'], b: 'Glinus lotoides' },
			{ ...file.species[1], i: 21, n: ['Lotus', 'Sacred Lotus'], b: 'Nelumbo nucifera' },
			{ ...file.species[1], i: 22, n: ['Arabian Jasmine'], b: 'Jasminum sambac' }
		]
	});

	it('puts a species named exactly like the search first', () => {
		expect(names(searchSpecies(lotus, 'lotus'))).toEqual(['Lotus', 'Lotus Sweetjuice']);
		expect(names(searchSpecies(lotus, 'nelumbo nucifera'))).toEqual(['Lotus']);
	});

	it('can match on any word when nothing matches them all', () => {
		expect(searchSpecies(lotus, 'backyard jasmine')).toEqual([]);
		expect(names(searchSpecies(lotus, 'backyard jasmine', true))).toEqual(['Arabian Jasmine']);
	});
});

describe('aliasFor', () => {
	it('names the hidden alias a search matched', () => {
		expect(aliasFor(species[0], 'gulab')).toBe('Gulab');
		expect(aliasFor(species[1], 'joseph')).toBe("Joseph's coat");
	});

	it('is empty when the visible names explain the match', () => {
		expect(aliasFor(species[0], 'rose')).toBeUndefined();
		expect(aliasFor(species[0], '')).toBeUndefined();
	});
});

describe('sortSpecies and letterOf', () => {
	it('sorts by common or botanical name, either way', () => {
		expect(names(sortSpecies(species, 'name-asc'))).toEqual([
			'4 O’Clock Plant',
			'Blue Rock Anemone',
			'Copperleaf',
			'Damask Rose'
		]);
		expect(names(sortSpecies(species, 'name-desc'))[0]).toBe('Damask Rose');
		expect(sortSpecies(species, 'botanical-asc').map((s) => s.botanical)[0]).toBe(
			'Acalypha wilkesiana'
		);
	});

	it('sorts and groups names with leading quotes under their first letter', () => {
		const quoted = parseIndex({
			...file,
			species: [
				{ ...file.species[1], i: 9, n: ["'Christmas' Cactus"] },
				{ ...file.species[1], i: 10, n: ['Blue Bell'] },
				{ ...file.species[1], i: 11, n: ['Daisy'] }
			]
		});
		const sorted = sortSpecies(quoted, 'name-asc');
		expect(names(sorted)).toEqual(['Blue Bell', "'Christmas' Cactus", 'Daisy']);
		expect(sorted.map((s) => letterOf(s, 'name-asc'))).toEqual(['B', 'C', 'D']);
	});

	it('groups by the first letter of the sort name, with digits under #', () => {
		expect(letterOf(species[3], 'name-asc')).toBe('#');
		expect(letterOf(species[3], 'botanical-asc')).toBe('M');
		expect(letterOf(species[1], 'name-asc')).toBe('C');
	});
});

describe('matchesFilters', () => {
	const pick = (filters: Partial<ReturnType<typeof emptyFilters>>) =>
		names(species.filter((s) => matchesFilters(s, { ...emptyFilters(), ...filters })));

	it('matches everything with no filters', () => {
		expect(pick({})).toHaveLength(4);
	});

	it('ORs choices within a filter and ANDs across filters', () => {
		expect(pick({ habits: ['herb'] })).toEqual(['Blue Rock Anemone', '4 O’Clock Plant']);
		expect(pick({ habits: ['herb'], origins: ['Native'] })).toEqual(['Blue Rock Anemone']);
		expect(pick({ colours: ['blue', 'pink'] })).toEqual([
			'Damask Rose',
			'Blue Rock Anemone',
			'4 O’Clock Plant'
		]);
	});

	it('finds species of unknown colour, and leaves unknown bloom months out', () => {
		expect(pick({ colours: ['unknown'] })).toEqual(['Copperleaf']);
		expect(pick({ months: [5] })).toEqual(['Damask Rose', '4 O’Clock Plant']);
	});
});

describe('formatMonths', () => {
	it('formats runs of months', () => {
		expect(formatMonths(0b000001110000)).toBe('May – July');
		expect(formatMonths(0b000000000100)).toBe('March');
		expect(formatMonths(0b000011000100)).toBe('March, July – August');
	});

	it('keeps a run across the new year together', () => {
		expect(formatMonths(0b110000000011)).toBe('November – February');
	});

	it('handles all year and unknown', () => {
		expect(formatMonths(0xfff)).toBe('All year');
		expect(formatMonths(0)).toBeUndefined();
	});
});

describe('detail formatting', () => {
	it('tidies scraped flowering text without dropping notes', () => {
		expect(formatFlowering('June-July (Uttarakhand)')).toBe('June – July (Uttarakhand)');
		expect(formatFlowering('may-july, september-october')).toBe('May – July, September – October');
		expect(formatFlowering('In the plains March-')).toBe('In the plains March');
	});

	it('grades conservation statuses', () => {
		expect(conservationLevel('Critically Endangered')).toBe('threatened');
		expect(conservationLevel('Extinct in the Wild')).toBe('threatened');
		expect(conservationLevel('Rare (Indian Red Data Book)')).toBe('concern');
		expect(conservationLevel('Least Concern')).toBe('none');
	});
});

describe('matchScientificName', () => {
	const list = parseIndex({
		...file,
		species: [
			{ ...file.species[1], i: 30, n: ['Tree Rhododendron'], b: 'Rhododendron arboreum' },
			{
				...file.species[1],
				i: 31,
				n: ['Nilgiri Rhododendron'],
				b: 'Rhododendron arboreum subsp. nilagiricum'
			},
			{ ...file.species[1], i: 32, n: ['Damask Rose'], b: 'Rosa x damascena' },
			{
				...file.species[1],
				i: 33,
				n: ['Dark Bulb-Leaf Orchid'],
				b: 'Bulbophyllum triste',
				s: ['Bulbophyllum micranthum Hook.f']
			}
		]
	});
	const id = (name: string) => matchScientificName(list, name)?.species.id;

	it('reads the comparable parts of a name', () => {
		expect(nameKeys('Rosa × damascena Herrm.')).toEqual({
			binomial: 'rosa damascena',
			full: 'rosa damascena'
		});
		expect(nameKeys('Rhododendron arboreum ssp. nilagiricum')?.full).toBe(
			'rhododendron arboreum subsp nilagiricum'
		);
		expect(nameKeys('Rosa')).toBeUndefined();
	});

	it('matches exact names, hybrids, and ranks', () => {
		expect(matchScientificName(list, 'Rhododendron arboreum')).toMatchObject({
			via: 'name',
			exact: true
		});
		expect(id('Rhododendron arboreum')).toBe(30);
		expect(id('Rhododendron arboreum subsp. nilagiricum')).toBe(31);
		expect(id('Rosa × damascena')).toBe(32);
	});

	it('falls back to the species for an unknown subspecies, and to synonyms', () => {
		expect(matchScientificName(list, 'Rhododendron arboreum var. roseum')).toMatchObject({
			exact: false
		});
		expect(id('Rhododendron arboreum var. roseum')).toBe(30);
		expect(matchScientificName(list, 'Bulbophyllum micranthum')).toMatchObject({ via: 'synonym' });
		expect(id('Bulbophyllum micranthum')).toBe(33);
	});

	it('finds nothing for other plants', () => {
		expect(matchScientificName(list, 'Quercus robur')).toBeUndefined();
	});
});

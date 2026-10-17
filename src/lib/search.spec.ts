import { describe, it, expect } from 'vitest';
import type { Flower } from './db.ts';
import { highlight, searchFlowers, sortFlowers } from './search.ts';

let nextId = 1;
function flower(name: string, extra: Partial<Flower> = {}): Flower {
	return {
		id: nextId++,
		name,
		notes: '',
		linked: false,
		createdAt: 0,
		updatedAt: 0,
		...extra
	};
}

const rose = flower('Backyard Rose', {
	species: 'Rosa rubiginosa',
	createdAt: new Date(2026, 5, 3).getTime()
});
const poppy = flower('California Poppy', {
	species: 'Eschscholzia californica',
	notes: 'Found by the creek trail',
	createdAt: new Date(2026, 9, 7).getTime()
});
const creme = flower('Crème Daisy', { createdAt: new Date(2025, 9, 1).getTime() });
const all = [rose, poppy, creme];

const names = (flowers: Flower[]) => flowers.map((f) => f.name);

describe('searchFlowers', () => {
	it('returns everything for an empty query', () => {
		expect(names(searchFlowers(all, '  '))).toEqual(names(all));
	});

	it('matches name, species, and notes, ignoring case', () => {
		expect(names(searchFlowers(all, 'POPPY'))).toEqual(['California Poppy']);
		expect(names(searchFlowers(all, 'rosa'))).toEqual(['Backyard Rose']);
		expect(names(searchFlowers(all, 'creek'))).toEqual(['California Poppy']);
	});

	it('ignores accents and word order, requiring every word', () => {
		expect(names(searchFlowers(all, 'creme'))).toEqual(['Crème Daisy']);
		expect(names(searchFlowers(all, 'poppy california'))).toEqual(['California Poppy']);
		expect(names(searchFlowers(all, 'poppy rose'))).toEqual([]);
	});

	it('finds entries by the month or year they were added', () => {
		expect(names(searchFlowers(all, 'june'))).toEqual(['Backyard Rose']);
		expect(names(searchFlowers(all, 'oct 2026'))).toEqual(['California Poppy']);
	});

	it('forgives small typos in longer words, including partly typed ones', () => {
		expect(names(searchFlowers(all, 'popyp'))).toEqual(['California Poppy']);
		expect(names(searchFlowers(all, 'califronia'))).toEqual(['California Poppy']);
		expect(names(searchFlowers(all, 'dasi'))).toEqual(['Crème Daisy']);
	});

	it('allows typos from four letters on, but not in shorter words or numbers', () => {
		expect(names(searchFlowers(all, 'rpse'))).toEqual(['Backyard Rose']);
		expect(names(searchFlowers(all, 'rse'))).toEqual([]);
		expect(names(searchFlowers(all, '2024'))).toEqual([]);
	});

	it('ranks name matches above species and notes matches', () => {
		const inNotes = flower('Lily', { notes: 'next to the rose bed' });
		const inName = flower('Rose of Sharon');
		expect(names(searchFlowers([inNotes, inName], 'rose'))).toEqual(['Rose of Sharon', 'Lily']);
	});
});

describe('sortFlowers', () => {
	it('sorts by date either way', () => {
		expect(names(sortFlowers(all, 'newest'))).toEqual([
			'California Poppy',
			'Backyard Rose',
			'Crème Daisy'
		]);
		expect(names(sortFlowers(all, 'oldest'))).toEqual([
			'Crème Daisy',
			'Backyard Rose',
			'California Poppy'
		]);
	});

	it('sorts by name either way, ignoring case and accents', () => {
		const list = [flower('daisy'), flower('Aster'), flower('Ćosmos')];
		expect(names(sortFlowers(list, 'name-asc'))).toEqual(['Aster', 'Ćosmos', 'daisy']);
		expect(names(sortFlowers(list, 'name-desc'))).toEqual(['daisy', 'Ćosmos', 'Aster']);
	});

	it('does not mutate its input', () => {
		const list = [...all];
		sortFlowers(list, 'name-desc');
		expect(list).toEqual(all);
	});
});

describe('highlight', () => {
	it('marks every literal occurrence of each query word', () => {
		expect(highlight('California Poppy', 'pop cal')).toEqual([
			{ text: 'Cal', match: true },
			{ text: 'ifornia ', match: false },
			{ text: 'Pop', match: true },
			{ text: 'py', match: false }
		]);
	});

	it('maps accent-insensitive matches back onto the original text', () => {
		expect(highlight('Crème Daisy', 'creme')).toEqual([
			{ text: 'Crème', match: true },
			{ text: ' Daisy', match: false }
		]);
	});

	it('returns the text unmarked when nothing matches', () => {
		expect(highlight('Rose', '')).toEqual([{ text: 'Rose', match: false }]);
		expect(highlight('Rose', 'lily')).toEqual([{ text: 'Rose', match: false }]);
	});
});

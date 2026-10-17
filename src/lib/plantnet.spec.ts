import { describe, it, expect } from 'vitest';
import { errorFor, parseIdentification } from './plantnet.ts';

describe('parseIdentification', () => {
	it('reads candidates in order, with names, family, and quota', () => {
		const parsed = parseIdentification({
			results: [
				{
					score: 0.87,
					species: {
						scientificNameWithoutAuthor: 'Dioscorea bulbifera',
						scientificNameAuthorship: 'L.',
						commonNames: ['Air potato', 'Air potato', ' Aerial yam '],
						genus: { scientificNameWithoutAuthor: 'Dioscorea' },
						family: { scientificNameWithoutAuthor: 'Dioscoreaceae' }
					}
				},
				{ score: 0.05, species: { scientificNameWithoutAuthor: 'Dioscorea alata' } },
				{ score: 0.01, species: {} }
			],
			remainingIdentificationRequests: 498
		});
		expect(parsed.remaining).toBe(498);
		expect(parsed.candidates).toHaveLength(2);
		expect(parsed.candidates[0]).toEqual({
			score: 0.87,
			scientificName: 'Dioscorea bulbifera',
			authorship: 'L.',
			commonNames: ['Air potato', 'Aerial yam'],
			family: 'Dioscoreaceae',
			genus: 'Dioscorea'
		});
		expect(parsed.candidates[1].commonNames).toEqual([]);
	});

	it('copes with an empty response', () => {
		expect(parseIdentification({})).toEqual({ candidates: [], remaining: undefined });
	});
});

describe('errorFor', () => {
	it('tells key, quota, and no-match failures apart', () => {
		expect(errorFor(401).kind).toBe('key');
		expect(errorFor(403).kind).toBe('key');
		expect(errorFor(429).kind).toBe('quota');
		expect(errorFor(404, 'Species not found').kind).toBe('none');
		expect(errorFor(500).kind).toBe('other');
	});
});

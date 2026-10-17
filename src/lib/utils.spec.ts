import { describe, it, expect } from 'vitest';
import { fitWithin } from './photos.ts';
import { pluralize } from './format.ts';
import { fileName } from './gallery.ts';

describe('fitWithin', () => {
	it('scales the longest edge down to the max', () => {
		expect(fitWithin(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 });
		expect(fitWithin(3000, 4000, 2048)).toEqual({ width: 1536, height: 2048 });
	});

	it('never upscales', () => {
		expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
	});
});

describe('fileName', () => {
	const when = new Date(2026, 9, 7, 15, 4);

	it('builds a readable, filesystem-safe name from the entry', () => {
		expect(fileName({ type: 'image/jpeg' }, 'Backyard Rose', when)).toBe(
			'wildflower-backyard-rose-2026-10-07-1504.jpg'
		);
		expect(fileName({ type: 'image/png' }, '  Crème brûlée / #2! ', when)).toBe(
			'wildflower-creme-brulee-2-2026-10-07-1504.png'
		);
	});

	it('falls back gracefully when the label has no usable characters', () => {
		expect(fileName({ type: '' }, '🌸🌸', when)).toBe('wildflower-2026-10-07-1504.jpg');
	});
});

describe('pluralize', () => {
	it('picks singular or plural form', () => {
		expect(pluralize(1, 'entry', 'entries')).toBe('1 entry');
		expect(pluralize(0, 'entry', 'entries')).toBe('0 entries');
		expect(pluralize(3, 'photo')).toBe('3 photos');
	});
});

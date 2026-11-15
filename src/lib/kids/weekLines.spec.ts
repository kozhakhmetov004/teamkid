import { describe, expect, it } from 'vitest';
import { parseList } from './profile.js';
import { leaningLine, matchesFor, nudgeLine } from './weekLines.js';

describe("child's week lines for parents", () => {
	it('summarises the most shared themes (or nothing when nothing is shared)', () => {
		const items = [{ tags: ['outdoors', 'sports'] }, { tags: ['outdoors'] }, { tags: ['animals'] }];
		expect(leaningLine(items)).toMatch(/^Leaning toward outdoor things and /);
		expect(leaningLine([])).toBeNull();
	});

	it('builds the weekend hint from shared picks and explains why a place fits', () => {
		const line = nudgeLine('Lily', [
			{ label: 'Park picnic', tags: ['outdoors'] },
			{ label: 'Bike ride', tags: ['outdoors', 'sports'] }
		]);
		expect(line).toBe(
			'Lily seems to want time outside this weekend (picked park picnic and bike ride).'
		);
		expect(nudgeLine('Lily', [])).toBeNull();
		expect(matchesFor('zoo', ['animals', 'outdoors', 'art'])).toEqual([
			'animals',
			'being outdoors'
		]);
		expect(matchesFor('cinema', ['animals'])).toEqual([]);
	});

	it('parses parent-noted interests into a clean, unique list', () => {
		expect(parseList(' Horses, drawing ,, horses\nLego ;  ')).toEqual([
			'Horses',
			'drawing',
			'Lego'
		]);
		expect(parseList('a,b,c', 2)).toEqual(['a', 'b']);
	});
});

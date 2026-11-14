import { describe, expect, it } from 'vitest';
import { guessHome } from './guessHome.js';

const seed = [
	{ home: 'A', display_name: 'Mom' },
	{ home: 'B', display_name: 'Dad' }
];

describe('guessHome', () => {
	it('maps role words to the matching display names', () => {
		expect(guessHome('Mother', seed)).toBe('A');
		expect(guessHome('the Father', seed)).toBe('B');
		expect(guessHome('Madre', seed)).toBe('A');
	});

	it('matches names from the plan to display names', () => {
		const family = [
			{ home: 'A', display_name: 'Megan' },
			{ home: 'B', display_name: 'Alex Carter' }
		];
		expect(guessHome('Megan Carter', [family[0], { home: 'B', display_name: 'Alex' }])).toBe('A');
		expect(guessHome('Alex', family)).toBe('B');
	});

	it('uses the other role when only that one is named', () => {
		expect(guessHome('Mother', [{ home: 'B', display_name: 'Dad' }])).toBe('A');
	});

	it('returns null when unclear, so the parent chooses', () => {
		expect(guessHome(null, seed)).toBeNull();
		expect(guessHome('Parent 1', seed)).toBeNull();
		expect(
			guessHome('Mother', [
				{ home: 'A', display_name: 'Sam' },
				{ home: 'B', display_name: 'Jo' }
			])
		).toBeNull();
		// Same surname on both parents is not a match.
		expect(
			guessHome('Carter', [
				{ home: 'A', display_name: 'Megan Carter' },
				{ home: 'B', display_name: 'Alex Carter' }
			])
		).toBeNull();
	});

	it('ignores parents without a home', () => {
		expect(guessHome('Mother', [{ home: null, display_name: 'Mom' }])).toBeNull();
	});
});

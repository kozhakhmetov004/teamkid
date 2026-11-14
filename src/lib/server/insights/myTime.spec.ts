import { describe, expect, it } from 'vitest';
import { fallbackSuggestion, isSafeSuggestion, summarizeOutings, type OutingRow } from './myTime';

const rows: OutingRow[] = [
	{ title: 'Zoo morning', child_rating: 5, happened_on: '2026-11-06' },
	{ title: 'Library story time', child_rating: 4, happened_on: '2026-11-10' },
	{ title: 'Grocery run', child_rating: 2, happened_on: '2026-11-12' },
	{ title: 'Picnic', child_rating: null, happened_on: '2026-11-14' },
	{ title: 'Old trip', child_rating: 5, happened_on: '2026-08-01' }
];

describe('summarizeOutings', () => {
	it('counts the last 30 days and averages only rated outings', () => {
		const s = summarizeOutings(rows, '2026-11-15');
		expect(s.count).toBe(4);
		expect(s.avgRating).toBe(3.7);
		expect(s.recent[0].title).toBe('Picnic');
	});

	it('lists favourites by rating then recency, unique, max 3', () => {
		const s = summarizeOutings(rows, '2026-11-15');
		expect(s.favorites).toEqual(['Zoo morning', 'Old trip', 'Library story time']);
	});

	it('ignores future dates and handles no data', () => {
		const s = summarizeOutings(
			[{ title: 'Later', child_rating: 3, happened_on: '2026-12-01' }],
			'2026-11-15'
		);
		expect(s).toMatchObject({ count: 0, avgRating: null });
	});
});

describe('fallbackSuggestion', () => {
	it('uses a shared wish and a favourite when there are some', () => {
		const t = fallbackSuggestion(['Go to the zoo'], ['Library story time']);
		expect(t).toContain('Go to the zoo');
		expect(t).toContain('library story time');
		expect(isSafeSuggestion(t)).toBe(true);
	});

	it('always returns a safe sentence', () => {
		for (const t of [
			fallbackSuggestion([], []),
			fallbackSuggestion(['Build a fort'], []),
			fallbackSuggestion([], ['Zoo morning'])
		]) {
			expect(isSafeSuggestion(t)).toBe(true);
		}
	});
});

describe('isSafeSuggestion', () => {
	it('rejects mentions of the other parent and comparisons', () => {
		expect(isSafeSuggestion('Try the zoo, Dad already went there last week.')).toBe(false);
		expect(isSafeSuggestion('Spend more time than last month at the park.')).toBe(false);
		expect(isSafeSuggestion("You don't spend enough time together.")).toBe(false);
		expect(isSafeSuggestion('The zoo with Alex would be fun.', ['Alex'])).toBe(false);
	});

	it('rejects empty or long text', () => {
		expect(isSafeSuggestion('Zoo')).toBe(false);
		expect(isSafeSuggestion('a'.repeat(241))).toBe(false);
	});

	it('accepts a short positive idea', () => {
		expect(
			isSafeSuggestion('The reptile house at the zoo is a calm place to start Saturday.')
		).toBe(true);
	});
});

import { describe, expect, it } from 'vitest';
import {
	computeInsight,
	computeMoodTrend,
	gentleText,
	joinThemes,
	MOOD_TRENDS,
	TREND_DISPLAY,
	topThemes,
	type CheckinRow,
	type WishRow
} from './insightRules.js';
import { isoDate, utcWeekStart } from './time.js';

const c = (mood: string, energy: number | null = 3): CheckinRow => ({ mood, energy });
const moods = (...m: string[]) => m.map((x) => c(x));
const wish = (interest: string, shared: boolean, at: string): WishRow => ({
	interest,
	shared_with_parents: shared,
	shared_at: shared ? at : null,
	created_at: at
});

describe('computeMoodTrend thresholds', () => {
	it('needs at least 2 check-ins', () => {
		expect(computeMoodTrend([])).toBe('not_enough');
		expect(computeMoodTrend(moods('sad'))).toBe('not_enough');
		expect(computeMoodTrend([c('nonsense'), c('happy')])).toBe('not_enough');
	});

	it('majority happy / calm', () => {
		expect(computeMoodTrend(moods('happy', 'happy', 'sad'))).toBe('mostly_happy');
		expect(computeMoodTrend(moods('calm', 'calm', 'happy'))).toBe('mostly_calm');
		expect(computeMoodTrend(moods('happy', 'calm'))).toBe('mostly_happy');
		expect(computeMoodTrend(moods('excited', 'okay', 'okay'))).toBe('mostly_calm');
	});

	it('tired most common, or low average energy → a_bit_tired', () => {
		expect(computeMoodTrend(moods('tired', 'tired', 'happy'))).toBe('a_bit_tired');
		expect(computeMoodTrend([c('happy', 1), c('calm', 2)])).toBe('a_bit_tired');
		expect(computeMoodTrend([c('happy', 3), c('calm', 2)])).toBe('mostly_happy'); // avg 2.5
	});

	it('the demo: seed happy + calm, then Tired/Low → a_bit_tired', () => {
		expect(computeMoodTrend([c('happy', 4), c('calm', 3), c('tired', 1)])).toBe('a_bit_tired');
	});

	it('worried + sad >= 40% → a_bit_worried', () => {
		expect(computeMoodTrend(moods('worried', 'happy', 'calm', 'happy', 'sad'))).toBe(
			'a_bit_worried'
		);
		expect(computeMoodTrend(moods('worried', 'happy', 'calm', 'happy', 'happy'))).toBe(
			'mostly_happy'
		);
	});

	it('sad/worried/angry >= 60% with 3+ check-ins → a_hard_week', () => {
		expect(computeMoodTrend(moods('sad', 'angry', 'happy'))).toBe('a_hard_week');
		expect(computeMoodTrend(moods('angry', 'angry'))).not.toBe('a_hard_week'); // only 2
	});

	it('otherwise mixed', () => {
		expect(computeMoodTrend(moods('happy', 'angry', 'calm', 'angry'))).toBe('mixed');
	});
});

describe('topThemes', () => {
	const wishes = [
		wish('Build a fort', false, '2026-11-13T10:00:00Z'),
		wish('Go to the zoo', true, '2026-11-12T10:00:00Z'),
		wish('Draw and paint', true, '2026-11-14T10:00:00Z'),
		wish('Visit the aquarium', true, '2026-11-14T11:00:00Z'),
		wish('Go swimming', true, '2026-11-10T10:00:00Z'),
		wish('Play soccer', true, '2026-11-09T10:00:00Z')
	];

	it('uses only shared wishes', () => {
		expect(topThemes(wishes)).not.toContain('forts');
		expect(topThemes([wish('Build a fort', false, '2026-11-13T10:00:00Z')])).toEqual([]);
	});

	it('is newest first, unique and max 3', () => {
		expect(topThemes(wishes)).toEqual(['animals', 'art', 'swimming']);
	});

	it('maps old seed labels', () => {
		expect(topThemes([wish('Build a blanket fort', true, '2026-11-13T10:00:00Z')])).toEqual([
			'forts'
		]);
	});
});

describe('computeInsight', () => {
	it('builds the demo sentence', () => {
		const out = computeInsight(
			[c('happy', 4), c('calm', 3), c('tired', 1)],
			[
				wish('Build a fort', false, '2026-11-15T10:00:00Z'),
				wish('Go to the zoo', true, '2026-11-15T10:01:00Z')
			]
		);
		expect(out).toEqual({
			moodTrend: 'a_bit_tired',
			interests: ['animals'],
			summary: 'A bit tired this week · Into animals',
			gentleFlag: false
		});
	});

	it('joins themes naturally', () => {
		expect(joinThemes(['forts', 'animals'])).toBe('forts and animals');
		expect(joinThemes(['art', 'music', 'animals'])).toBe('art, music and animals');
	});

	it('not_enough still reports shared interests, never a trend', () => {
		expect(
			computeInsight([c('happy')], [wish('Go to the zoo', true, '2026-11-15T10:00:00Z')])
		).toMatchObject({ moodTrend: 'not_enough', summary: 'Into animals', gentleFlag: false });
		expect(computeInsight([], []).summary).toBe('Not enough check-ins yet this week');
	});

	it('gentle flag only for a_bit_worried / a_hard_week, with template text', () => {
		expect(computeInsight(moods('worried', 'sad', 'happy', 'happy', 'calm'), []).gentleFlag).toBe(
			true
		);
		expect(computeInsight(moods('sad', 'angry', 'worried'), []).gentleFlag).toBe(true);
		expect(gentleText('a_hard_week')).toMatch(/pediatrician or counselor/);
		expect(gentleText('a_bit_worried')).toMatch(/calm, open chat/);
		for (const t of ['mostly_happy', 'mixed', 'a_bit_tired', 'not_enough'])
			expect(gentleText(t)).toBeNull();
	});

	it('never puts raw text, counts, times or homes into the output', () => {
		const secret = 'my secret hideout at 12 Elm St';
		const out = computeInsight(
			[c('sad', 1), c('worried', 1), c('angry', 1), c('sad', 2)],
			[
				wish(secret, true, '2026-11-15T10:00:00Z'),
				wish('A puppy named Biscuit', false, '2026-11-15T10:00:00Z')
			]
		);
		const text = JSON.stringify(out) + (gentleText(out.moodTrend) ?? '');
		expect(text).not.toContain('Elm');
		expect(text).not.toContain('Biscuit');
		expect(text).not.toMatch(/\d/); // no counts, no times
		expect(text).not.toMatch(/\b(mom|dad|home|house)\b/i);
		expect(out.interests).toEqual([]);
	});

	it('has display text for every trend value', () => {
		for (const t of MOOD_TRENDS) expect(TREND_DISPLAY[t].label.length).toBeGreaterThan(0);
	});
});

describe('UTC week boundary used by the builder', () => {
	it('Sunday 23:59 UTC and Monday 00:00 UTC are different insight weeks', () => {
		expect(isoDate(utcWeekStart(new Date('2026-11-15T23:59:59Z')))).toBe('2026-11-09');
		expect(isoDate(utcWeekStart(new Date('2026-11-16T00:00:00Z')))).toBe('2026-11-16');
	});
});

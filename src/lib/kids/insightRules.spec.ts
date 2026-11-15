import { describe, expect, it } from 'vitest';
import {
	checkinDays,
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

const c = (mood: string, energy: number | null = 3): CheckinRow => ({
	mood,
	energy,
	created_at: '2026-11-10T12:00:00Z'
});
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

/** One shared check-in per day, from Mon Nov 9 (UTC). */
const week = (...m: [string, number?][]): CheckinRow[] =>
	m.map(([mood, energy = 3], i) => ({
		mood,
		energy,
		shared: true,
		created_at: `2026-11-${String(9 + i).padStart(2, '0')}T15:00:00Z`
	}));
const UTC = { tz: 'UTC' };

describe('week counting (days, shared only, hard weeks)', () => {
	it('taps a few minutes apart merge; a day counts once, by its last feeling', () => {
		const day = (t: string, mood: string): CheckinRow => ({
			mood,
			energy: 3,
			shared: true,
			created_at: `2026-11-10T${t}:00Z`
		});
		const days = checkinDays(
			[day('10:00', 'sad'), day('10:02', 'happy'), day('18:00', 'calm')],
			'UTC'
		);
		expect(days).toHaveLength(1);
		expect(days[0]).toMatchObject({ date: '2026-11-10', big: false, last: { mood: 'calm' } });
	});

	it('three emotions in one evening do not make a harder week', () => {
		const rows = [
			...week(['happy'], ['calm']),
			...['sad', 'worried', 'angry'].map((mood, i) => ({
				mood,
				energy: 3,
				shared: true,
				created_at: `2026-11-12T1${i * 2}:00:00Z`
			}))
		];
		expect(computeInsight(rows, [], UTC).gentleFlag).toBe(false);
	});

	it('big feelings on 3+ days and most days → a harder week; worried mornings count', () => {
		const mornings = [10, 11, 12].flatMap((d) => [
			{ mood: 'worried', energy: 3, shared: true, created_at: `2026-11-${d}T08:00:00Z` },
			{ mood: 'happy', energy: 3, shared: true, created_at: `2026-11-${d}T19:00:00Z` }
		]);
		const out = computeInsight([...mornings, ...week(['calm'])], [], UTC);
		expect(out).toMatchObject({ moodTrend: 'a_hard_week', gentleFlag: true });
		expect(
			computeInsight(week(['sad'], ['sad'], ['happy'], ['calm'], ['calm']), [], UTC).moodTrend
		).not.toBe('a_hard_week');
	});

	it('the pediatrician tip only after two harder weeks in a row', () => {
		const hard = week(['sad'], ['angry'], ['worried']);
		expect(computeInsight(hard, [], UTC).moodTrend).toBe('a_hard_week');
		expect(computeInsight(hard, [], { tz: 'UTC', previousWeekHard: true }).moodTrend).toBe(
			'hard_weeks'
		);
		expect(gentleText('a_hard_week')).not.toMatch(/pediatrician/);
		expect(gentleText('hard_weeks')).toMatch(/pediatrician or counselor/);
	});

	it('private ("just for me") check-ins never reach the parents\' insight', () => {
		const rows = week(['sad'], ['angry'], ['worried']).map((r) => ({ ...r, shared: false }));
		expect(computeInsight(rows, [], UTC)).toMatchObject({
			moodTrend: 'not_enough',
			gentleFlag: false
		});
	});

	it('days follow the child time zone', () => {
		// 03:00 UTC on Nov 10 is still Nov 9 in Los Angeles.
		const rows = [
			{ mood: 'happy', energy: 3, shared: true, created_at: '2026-11-09T20:00:00Z' },
			{ mood: 'calm', energy: 3, shared: true, created_at: '2026-11-10T03:00:00Z' }
		];
		expect(checkinDays(rows, 'UTC')).toHaveLength(2);
		expect(checkinDays(rows, 'America/Los_Angeles')).toHaveLength(1);
	});
});

describe('computeInsight', () => {
	it('builds the demo sentence', () => {
		const out = computeInsight(
			week(['happy', 4], ['calm', 3], ['tired', 1]),
			[
				wish('Build a fort', false, '2026-11-15T10:00:00Z'),
				wish('Go to the zoo', true, '2026-11-15T10:01:00Z')
			],
			UTC
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
			computeInsight(week(['happy']), [wish('Go to the zoo', true, '2026-11-15T10:00:00Z')], UTC)
		).toMatchObject({ moodTrend: 'not_enough', summary: 'Into animals', gentleFlag: false });
		expect(computeInsight([], [], UTC).summary).toBe('Not enough check-ins yet this week');
	});

	it('gentle flag only for harder weeks, with template text', () => {
		expect(
			computeInsight(week(['worried'], ['sad'], ['happy'], ['happy'], ['calm']), [], UTC).gentleFlag
		).toBe(false);
		expect(computeInsight(week(['sad'], ['angry'], ['worried']), [], UTC).gentleFlag).toBe(true);
		for (const t of ['a_bit_worried', 'mostly_happy', 'mixed', 'a_bit_tired', 'not_enough'])
			expect(gentleText(t)).toBeNull();
	});

	it('never puts raw text, counts, times or homes into the output', () => {
		const secret = 'my secret hideout at 12 Elm St';
		const out = computeInsight(
			week(['sad', 1], ['worried', 1], ['angry', 1], ['sad', 2]),
			[
				wish(secret, true, '2026-11-15T10:00:00Z'),
				wish('A puppy named Biscuit', false, '2026-11-15T10:00:00Z')
			],
			UTC
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

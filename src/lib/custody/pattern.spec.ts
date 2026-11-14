import { describe, expect, it } from 'vitest';
import { addDays, generateNights, MAX_NIGHTS, weekdayOf, type Night } from './pattern.js';

const homes = (nights: Night[]) => nights.map((n) => n.home).join('');
const count = (nights: Night[], home: 'A' | 'B') => nights.filter((n) => n.home === home).length;

describe('date helpers', () => {
	it('adds days across month, year and leap-day boundaries', () => {
		expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
		expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
	});

	it('gives ISO weekdays', () => {
		expect(weekdayOf('2026-11-02')).toBe(1); // Monday
		expect(weekdayOf('2026-11-06')).toBe(5); // Friday
		expect(weekdayOf('2026-11-08')).toBe(7); // Sunday
		expect(weekdayOf('1969-12-31')).toBe(3); // before the epoch: Wednesday
	});
});

describe('generateNights', () => {
	it('returns [] for 0 days', () => {
		expect(generateNights('2-2-3', '2026-11-02', 'A', 0)).toEqual([]);
	});

	it('2-2-3 follows the 14-night cycle and repeats it', () => {
		const nights = generateNights('2-2-3', '2026-11-02', 'A', 28);
		expect(homes(nights)).toBe('AABBAAABBAABBB'.repeat(2));
		expect(nights[0]).toEqual({ date: '2026-11-02', home: 'A' });
		expect(nights[27].date).toBe('2026-11-29');
	});

	it('2-2-3 gives each home 7 of 14 nights and is relative to firstHome', () => {
		const nights = generateNights('2-2-3', '2026-11-02', 'B', 14);
		expect(count(nights, 'A')).toBe(7);
		expect(count(nights, 'B')).toBe(7);
		expect(homes(nights)).toBe('BBAABBBAABBAAA');
	});

	it('week on / week off alternates every 7 nights', () => {
		const nights = generateNights('week_on_week_off', '2026-11-04', 'A', 21);
		expect(homes(nights)).toBe('AAAAAAABBBBBBBAAAAAAA');
	});

	it('alternate weekends gives Fri and Sat nights of every other weekend to the other home', () => {
		// Starts on Wednesday 2026-11-04; first Friday is 2026-11-06.
		const nights = generateNights('alternate_weekends', '2026-11-04', 'A', 21);
		const away = nights.filter((n) => n.home === 'B').map((n) => n.date);
		expect(away).toEqual(['2026-11-06', '2026-11-07', '2026-11-20', '2026-11-21']);
		// Sunday nights are always at firstHome.
		expect(nights.filter((n) => weekdayOf(n.date) === 7).every((n) => n.home === 'A')).toBe(true);
	});

	it('alternate weekends starting on a Saturday waits for the first Friday', () => {
		const nights = generateNights('alternate_weekends', '2026-11-07', 'B', 8);
		expect(nights[0]).toEqual({ date: '2026-11-07', home: 'B' });
		expect(nights.find((n) => n.date === '2026-11-13')?.home).toBe('A');
		expect(nights.find((n) => n.date === '2026-11-14')?.home).toBe('A');
	});

	it('starts with firstHome for every template', () => {
		for (const t of ['2-2-3', 'week_on_week_off'] as const) {
			expect(generateNights(t, '2026-11-02', 'B', 1)[0].home).toBe('B');
		}
		expect(generateNights('alternate_weekends', '2026-11-02', 'B', 1)[0].home).toBe('B');
	});

	it('produces consecutive dates across a year end and DST changes', () => {
		// US DST ends 2026-11-01 and starts 2027-03-14; dates must not skip or repeat.
		const nights = generateNights('2-2-3', '2026-10-25', 'A', MAX_NIGHTS);
		expect(nights).toHaveLength(MAX_NIGHTS);
		for (let i = 1; i < nights.length; i++) {
			expect(nights[i].date).toBe(addDays(nights[i - 1].date, 1));
		}
		expect(nights.map((n) => n.date)).toContain('2026-12-31');
		expect(nights.map((n) => n.date)).toContain('2027-01-01');
		expect(nights.map((n) => n.date)).toContain('2027-03-14');
		expect(count(nights.slice(0, 392), 'A')).toBe(196); // 28 full cycles
	});

	it('rejects bad input', () => {
		expect(() => generateNights('2-2-3', '2026-02-30', 'A', 3)).toThrow(RangeError);
		expect(() => generateNights('2-2-3', '11/02/2026', 'A', 3)).toThrow(RangeError);
		expect(() => generateNights('2-2-3', '2026-11-02', 'A', -1)).toThrow(RangeError);
		expect(() => generateNights('2-2-3', '2026-11-02', 'A', 1.5)).toThrow(RangeError);
		expect(() => generateNights('2-2-3', '2026-11-02', 'A', MAX_NIGHTS + 1)).toThrow(RangeError);
		expect(() => generateNights('custom' as never, '2026-11-02', 'A', 3)).toThrow(RangeError);
		expect(() => generateNights('2-2-3', '2026-11-02', 'C' as never, 3)).toThrow(RangeError);
	});
});

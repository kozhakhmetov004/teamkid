import { describe, expect, it } from 'vitest';
import { generateNights, nightsToBlocks } from './pattern.js';
import { addMonths, localTime, mondayOf, weekTitle, zonedToUtc } from './time.js';

const homes = (nights: { home: string }[]) => nights.map((n) => n.home).join('');

describe('generateNights', () => {
	it('2-2-3 follows A A B B A A A | B B A A B B B and repeats every 14 days', () => {
		const nights = generateNights('2-2-3', '2026-11-16', 'A', 28);
		expect(homes(nights.slice(0, 14))).toBe('AABBAAABBAABBB');
		expect(homes(nights.slice(14, 28))).toBe(homes(nights.slice(0, 14)));
	});

	it('gives each parent 7 of 14 nights and the first night to firstParent', () => {
		for (const template of ['2-2-3', 'week-on-week-off'] as const) {
			const nights = generateNights(template, '2026-11-16', 'B', 14);
			expect(nights[0].home).toBe('B');
			expect(nights.filter((n) => n.home === 'A')).toHaveLength(7);
		}
		// alternate weekends starting on a Monday: first night is a weekday => firstParent
		expect(generateNights('alternate-weekends', '2026-11-16', 'B', 1)[0].home).toBe('B');
	});

	it('week on / week off', () => {
		expect(homes(generateNights('week-on-week-off', '2026-11-16', 'A', 14))).toBe('AAAAAAABBBBBBB');
	});

	it('alternate weekends: B has Fri, Sat, Sun nights every other weekend', () => {
		// 2026-11-16 is a Monday
		const nights = generateNights('alternate-weekends', '2026-11-16', 'A', 14);
		expect(homes(nights)).toBe('AAAABBB' + 'AAAAAAA');
	});

	it('works across month boundaries and DST changes (string dates)', () => {
		const nov = generateNights('2-2-3', '2026-10-25', 'A', 14); // US DST ends Nov 1
		expect(nov.map((n) => n.date)).toContain('2026-11-01');
		expect(nov[7].date).toBe('2026-11-01');
		expect(new Set(nov.map((n) => n.date)).size).toBe(14);
	});

	it('accepts a Date as start', () => {
		expect(generateNights('2-2-3', new Date('2026-11-16T00:00:00Z'), 'A', 1)[0]).toEqual({
			date: '2026-11-16',
			home: 'A'
		});
	});
});

describe('time helpers', () => {
	it('converts local wall-clock time to UTC, including DST', () => {
		expect(zonedToUtc('2026-11-16', '17:00', 'UTC').toISOString()).toBe('2026-11-16T17:00:00.000Z');
		expect(zonedToUtc('2026-11-16', '17:00', 'Asia/Almaty').toISOString()).toBe(
			'2026-11-16T12:00:00.000Z'
		);
		// New York: EDT (UTC-4) before Nov 1, EST (UTC-5) after
		expect(zonedToUtc('2026-10-30', '17:00', 'America/New_York').toISOString()).toBe(
			'2026-10-30T21:00:00.000Z'
		);
		expect(zonedToUtc('2026-11-02', '17:00', 'America/New_York').toISOString()).toBe(
			'2026-11-02T22:00:00.000Z'
		);
	});

	it('round-trips local time', () => {
		const t = zonedToUtc('2026-11-16', '08:30', 'America/Los_Angeles');
		expect(localTime(t, 'America/Los_Angeles')).toBe('08:30');
	});

	it('finds Mondays, adds months and titles weeks', () => {
		expect(mondayOf('2026-11-15')).toBe('2026-11-09'); // Sunday
		expect(mondayOf('2026-11-16')).toBe('2026-11-16');
		expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
		expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
		expect(weekTitle('2026-11-30')).toBe('Nov 30 – Dec 6, 2026');
	});

	it('builds night blocks from exchange time to exchange time', () => {
		const blocks = nightsToBlocks([{ date: '2026-11-16', home: 'A' }], '17:00', 'Asia/Almaty');
		expect(blocks).toEqual([
			{ starts_at: '2026-11-16T12:00:00.000Z', ends_at: '2026-11-17T12:00:00.000Z', home: 'A' }
		]);
	});
});

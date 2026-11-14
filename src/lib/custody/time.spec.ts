import { describe, expect, it } from 'vitest';
import { nightsToBlocks } from './schedule.js';
import { addMonths, localTime, mondayOf, weekTitle, zonedToUtc } from './time.js';

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

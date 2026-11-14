import { describe, expect, it } from 'vitest';
import { isoDate, partOfDay, utcDayStart, utcWeekEnd, utcWeekStart } from './time.js';

describe('UTC week boundary', () => {
	it('Sunday 23:59:59 UTC still belongs to the week that started on Monday', () => {
		const sunday = new Date('2026-11-15T23:59:59.999Z');
		expect(isoDate(utcWeekStart(sunday))).toBe('2026-11-09');
		expect(isoDate(utcWeekEnd(sunday))).toBe('2026-11-16');
	});

	it('Monday 00:00 UTC starts a new week', () => {
		const monday = new Date('2026-11-16T00:00:00.000Z');
		expect(isoDate(utcWeekStart(monday))).toBe('2026-11-16');
		expect(utcWeekStart(monday).toISOString()).toBe('2026-11-16T00:00:00.000Z');
	});

	it('works across month and year ends', () => {
		expect(isoDate(utcWeekStart(new Date('2027-01-01T12:00:00Z')))).toBe('2026-12-28');
		expect(isoDate(utcWeekStart(new Date('2026-03-01T08:00:00Z')))).toBe('2026-02-23');
	});

	it('ignores the local time zone offset of the input', () => {
		// 2026-11-16T01:00+05:00 is still Sunday 20:00 UTC.
		expect(isoDate(utcWeekStart(new Date('2026-11-16T01:00:00+05:00')))).toBe('2026-11-09');
	});
});

describe('utcDayStart', () => {
	it('truncates to 00:00 UTC', () => {
		expect(utcDayStart(new Date('2026-11-14T19:08:01Z')).toISOString()).toBe(
			'2026-11-14T00:00:00.000Z'
		);
	});
});

describe('partOfDay', () => {
	it.each([
		['2026-11-14T05:00:00Z', 'morning'],
		['2026-11-14T11:59:00Z', 'morning'],
		['2026-11-14T12:00:00Z', 'afternoon'],
		['2026-11-14T17:00:00Z', 'evening'],
		['2026-11-14T21:00:00Z', 'night'],
		['2026-11-14T02:00:00Z', 'night']
	])('%s is %s', (iso, part) => {
		expect(partOfDay(new Date(iso))).toBe(part);
	});
});

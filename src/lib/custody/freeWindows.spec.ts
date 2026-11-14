import { describe, expect, it } from 'vitest';
import { freeWindows, upcomingSaturday } from './freeWindows.js';
import type { CustodyBlock } from './today.js';

const UTC = 'UTC';
/** Seed-style blocks: each night 17:00 -> 08:00 next day (UTC). */
const night = (date: string, home: 'A' | 'B'): CustodyBlock => ({
	starts_at: `${date}T17:00:00.000Z`,
	ends_at: `${date}T08:00:00.000Z`.replace(date, nextDay(date)),
	home
});
function nextDay(date: string) {
	const d = new Date(`${date}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + 1);
	return d.toISOString().slice(0, 10);
}

describe('upcomingSaturday', () => {
	it('gives this weekend on Sat/Sun and the next one on weekdays', () => {
		expect(upcomingSaturday('2026-11-18')).toBe('2026-11-21'); // Wed
		expect(upcomingSaturday('2026-11-21')).toBe('2026-11-21'); // Sat
		expect(upcomingSaturday('2026-11-22')).toBe('2026-11-21'); // Sun
	});
});

describe('freeWindows', () => {
	// Dad (B) has Fri 20, Sat 21, Sun 22 nights (week 2 of the seed's 2-2-3).
	const blocks = [
		night('2026-11-19', 'A'),
		night('2026-11-20', 'B'),
		night('2026-11-21', 'B'),
		night('2026-11-22', 'B'),
		night('2026-11-23', 'A')
	];

	it('gives the whole daytime when the child is with me all weekend', () => {
		expect(freeWindows({ saturday: '2026-11-21', tz: UTC, myHome: 'B', blocks, busy: [] })).toEqual(
			[
				{ date: '2026-11-21', from: '09:00', to: '19:00' },
				{ date: '2026-11-22', from: '09:00', to: '19:00' }
			]
		);
	});

	it('gives nothing when the child is with the other parent', () => {
		expect(freeWindows({ saturday: '2026-11-21', tz: UTC, myHome: 'A', blocks, busy: [] })).toEqual(
			[]
		);
	});

	it('splits around busy events and drops pieces under 2 hours', () => {
		// 16:00-17:30 busy leaves 17:30-19:00 -> 18:00-19:00 after rounding: too short.
		const busy = [{ starts_at: '2026-11-21T16:00:00Z', ends_at: '2026-11-21T17:30:00Z' }];
		expect(
			freeWindows({ saturday: '2026-11-21', tz: UTC, myHome: 'B', blocks, busy }).filter(
				(w) => w.date === '2026-11-21'
			)
		).toEqual([{ date: '2026-11-21', from: '09:00', to: '16:00' }]);
	});

	it('follows a handover in the middle of the day', () => {
		const handover = [
			night('2026-11-20', 'A'),
			{ ...night('2026-11-21', 'B'), starts_at: '2026-11-21T13:00:00Z' }
		];
		expect(
			freeWindows({ saturday: '2026-11-21', tz: UTC, myHome: 'B', blocks: handover, busy: [] })[0]
		).toEqual({ date: '2026-11-21', from: '13:00', to: '19:00' });
	});

	it('uses local time and skips hours already past', () => {
		const ny = freeWindows({
			saturday: '2026-11-21',
			tz: 'America/New_York',
			myHome: 'B',
			blocks: [{ starts_at: '2026-11-20T22:00:00Z', ends_at: '2026-11-23T22:00:00Z', home: 'B' }],
			busy: [],
			now: new Date('2026-11-21T16:30:00Z') // 11:30 in New York
		});
		expect(ny[0]).toEqual({ date: '2026-11-21', from: '11:30', to: '19:00' });
	});

	it('treats a family without any schedule as free all weekend', () => {
		expect(
			freeWindows({ saturday: '2026-11-21', tz: UTC, myHome: null, blocks: [], busy: [] })
		).toHaveLength(2);
	});
});

describe('freeWindows with a parent time range', () => {
	const blocks = [
		{ starts_at: '2026-11-20T17:00:00Z', ends_at: '2026-11-23T17:00:00Z', home: 'B' as const }
	];
	const range = (from: string, to: string, busy: { starts_at: string; ends_at: string }[] = []) =>
		freeWindows({
			saturday: '2026-11-21',
			tz: UTC,
			myHome: 'B',
			blocks,
			busy,
			from,
			to,
			minMinutes: 60
		});

	it('plans only inside the range, on half hours', () => {
		expect(range('14:30', '17:00')).toEqual([
			{ date: '2026-11-21', from: '14:30', to: '17:00' },
			{ date: '2026-11-22', from: '14:30', to: '17:00' }
		]);
	});

	it('allows early or short ranges down to one hour', () => {
		expect(range('07:30', '08:30')[0]).toEqual({ date: '2026-11-21', from: '07:30', to: '08:30' });
	});

	it('drops what is left under an hour after busy events', () => {
		const busy = [{ starts_at: '2026-11-21T14:00:00Z', ends_at: '2026-11-21T15:30:00Z' }];
		expect(range('14:00', '16:00', busy).filter((w) => w.date === '2026-11-21')).toEqual([]);
	});
});

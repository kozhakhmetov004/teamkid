import { describe, expect, it } from 'vitest';
import {
	addDays,
	buildBriefing,
	custodyLine,
	custodyNow,
	greetingFor,
	localDate,
	nightsByDate,
	relativeDay,
	safeTimeZone,
	weekStrip,
	type CustodyBlock,
	type Home
} from './today.js';

/** 2-2-3 week starting Mon 2026-11-09: A A B B A A A, blocks 17:00Z → 08:00Z. */
const homes: Home[] = ['A', 'A', 'B', 'B', 'A', 'A', 'A'];
const blocks: CustodyBlock[] = homes.map((home, i) => ({
	home,
	starts_at: `${addDays('2026-11-09', i)}T17:00:00.000Z`,
	ends_at: `${addDays('2026-11-09', i + 1)}T08:00:00.000Z`
}));

describe('dates', () => {
	it('adds days across month and year boundaries', () => {
		expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
	});

	it('computes the local date in a time zone', () => {
		expect(localDate('2026-11-14T20:00:00Z', 'UTC')).toBe('2026-11-14');
		expect(localDate('2026-11-14T20:00:00Z', 'Asia/Almaty')).toBe('2026-11-15');
		expect(localDate('2026-11-14T03:00:00Z', 'America/New_York')).toBe('2026-11-13');
	});

	it('falls back to UTC for unknown or malformed zones', () => {
		expect(safeTimeZone('Asia/Almaty')).toBe('Asia/Almaty');
		expect(safeTimeZone('Not/AZone')).toBe('UTC');
		expect(safeTimeZone('<script>')).toBe('UTC');
		expect(safeTimeZone(undefined)).toBe('UTC');
	});

	it('labels relative days', () => {
		expect(relativeDay('2026-11-14', '2026-11-14')).toBe('today');
		expect(relativeDay('2026-11-15', '2026-11-14')).toBe('tomorrow');
		expect(relativeDay('2026-11-18', '2026-11-14')).toBe('Wednesday');
		expect(relativeDay('2026-11-30', '2026-11-14')).toBe('Mon, Nov 30');
	});

	it('greets by local hour', () => {
		expect(greetingFor(8)).toBe('Good morning');
		expect(greetingFor(14)).toBe('Good afternoon');
		expect(greetingFor(21)).toBe('Good evening');
	});
});

describe('custody', () => {
	it('maps nights to the date the block starts on', () => {
		const nights = nightsByDate(blocks, 'UTC');
		expect(nights.get('2026-11-09')).toBe('A');
		expect(nights.get('2026-11-11')).toBe('B');
		expect(nights.get('2026-11-15')).toBe('A');
	});

	it('knows who has the child during the day and after midnight', () => {
		// Tue 10:00: Monday night block (A) has started, Tuesday's (A) not yet
		expect(custodyNow(blocks, new Date('2026-11-10T10:00:00Z')).home).toBe('A');
		// Thu 02:00, inside Wednesday night (B)
		expect(custodyNow(blocks, new Date('2026-11-12T02:00:00Z')).home).toBe('B');
		// before any block
		expect(custodyNow(blocks, new Date('2026-11-01T00:00:00Z')).home).toBeNull();
	});

	it('finds the next handover', () => {
		const { home, handover } = custodyNow(blocks, new Date('2026-11-10T10:00:00Z'));
		expect(home).toBe('A');
		expect(handover).toEqual({ at: new Date('2026-11-11T17:00:00Z'), from: 'A', to: 'B' });
		const later = custodyNow(blocks, new Date('2026-11-12T10:00:00Z'));
		expect(later.handover).toEqual({ at: new Date('2026-11-13T17:00:00Z'), from: 'B', to: 'A' });
		// last stretch: no further change known
		expect(custodyNow(blocks, new Date('2026-11-14T10:00:00Z')).handover).toBeNull();
	});

	it('builds a 7-day strip across a month boundary with event counts', () => {
		const strip = weekStrip(
			blocks,
			[{ starts_at: '2026-11-11T16:00:00Z' }, { starts_at: '2026-11-11T18:00:00Z' }],
			'2026-11-10',
			'UTC'
		);
		expect(strip).toHaveLength(7);
		expect(strip.map((d) => d.home)).toEqual(['A', 'B', 'B', 'A', 'A', 'A', null]);
		expect(strip[1]).toMatchObject({ date: '2026-11-11', weekday: 'Wed', eventCount: 2 });
		expect(strip[0].isToday).toBe(true);
		const dec = weekStrip([], [], '2026-11-28', 'UTC');
		expect(dec.map((d) => d.date)).toContain('2026-12-01');
	});

	it('shifts nights with the time zone', () => {
		// 17:00Z is 22:00 in Almaty (same date) but 12:00 in New York (same date)
		expect(nightsByDate(blocks, 'Asia/Almaty').get('2026-11-09')).toBe('A');
		// Pacific/Kiritimati is UTC+14: 17:00Z is already the next day there
		expect(nightsByDate(blocks, 'Pacific/Kiritimati').get('2026-11-10')).toBe('A');
	});
});

describe('wording', () => {
	const nameOf = (h: Home) => (h === 'A' ? 'you' : 'Dad');

	it('says "through" for the viewer and "until" for the other parent', () => {
		// Sun 10:00: handover Wed 17:00 => last night with you is Tuesday
		const sun = custodyNow(
			[
				{
					home: 'A' as const,
					starts_at: '2026-11-07T17:00:00.000Z',
					ends_at: '2026-11-08T08:00:00.000Z'
				},
				...blocks
			],
			new Date('2026-11-08T10:00:00Z')
		);
		expect(
			custodyLine({
				childName: 'Lily',
				home: sun.home,
				handover: sun.handover,
				myHome: 'A',
				nameOf,
				today: '2026-11-08',
				tz: 'UTC'
			})
		).toBe('Lily is with you through Tuesday');

		// Mon 10:00: last night with you is tomorrow (Tuesday)
		const early = [
			{
				home: 'A' as const,
				starts_at: '2026-11-08T17:00:00.000Z',
				ends_at: '2026-11-09T08:00:00.000Z'
			},
			...blocks
		];
		const mon = custodyNow(early, new Date('2026-11-09T10:00:00Z'));
		expect(
			custodyLine({
				childName: 'Lily',
				home: mon.home,
				handover: mon.handover,
				myHome: 'A',
				nameOf,
				today: '2026-11-09',
				tz: 'UTC'
			})
		).toBe('Lily is with you through tomorrow');

		// Tue 10:00: handover is tomorrow => exact time
		const tue = custodyNow(blocks, new Date('2026-11-10T10:00:00Z'));
		expect(
			custodyLine({
				childName: 'Lily',
				home: tue.home,
				handover: tue.handover,
				myHome: 'A',
				nameOf,
				today: '2026-11-10',
				tz: 'UTC'
			})
		).toBe('Lily is with you until tomorrow 5:00 PM');

		const dadNow = custodyNow(blocks, new Date('2026-11-12T10:00:00Z'));
		expect(
			custodyLine({
				childName: 'Lily',
				home: dadNow.home,
				handover: dadNow.handover,
				myHome: 'A',
				nameOf,
				today: '2026-11-12',
				tz: 'UTC'
			})
		).toBe('Lily is with Dad until tomorrow 5:00 PM');
	});

	it('handles the handover day itself', () => {
		const { home, handover } = custodyNow(blocks, new Date('2026-11-11T09:00:00Z'));
		expect(
			custodyLine({
				childName: 'Lily',
				home,
				handover,
				myHome: 'A',
				nameOf,
				today: '2026-11-11',
				tz: 'UTC'
			})
		).toBe('Lily is with you until 5:00 PM today');
	});

	it('returns null without custody data', () => {
		expect(
			custodyLine({
				childName: 'Lily',
				home: null,
				handover: null,
				myHome: 'A',
				nameOf,
				today: '2026-11-11',
				tz: 'UTC'
			})
		).toBeNull();
	});

	it('builds the briefing from the parts that exist', () => {
		expect(
			buildBriefing({
				custodyLine: 'Lily is with you through Wednesday',
				otherName: 'Alex',
				swapsFromOther: 1,
				swapsWaiting: 0,
				unread: 2,
				firstEvent: null
			})
		).toBe(
			'Lily is with you through Wednesday. Alex asked about a swap, and you have 2 unread messages. Nothing else on the calendar today.'
		);
		expect(
			buildBriefing({
				custodyLine: null,
				otherName: 'Alex',
				swapsFromOther: 0,
				swapsWaiting: 1,
				unread: 0,
				firstEvent: { title: 'Swim class', time: '4:00 PM' }
			})
		).toBe('Your swap request is waiting for Alex. First up today: Swim class at 4:00 PM.');
	});
});

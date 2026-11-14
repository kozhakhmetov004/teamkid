import { describe, expect, it } from 'vitest';
import { buildNights, nextSwitch, placeName, type NightEvent } from './nights';

const ev = (date: string, home: 'A' | 'B'): NightEvent => ({
	title: home === 'A' ? "Night at Mom's" : "Night at Dad's",
	home,
	starts_at: `${date}T17:00:00Z`
});

const events = [
	ev('2026-11-16', 'A'),
	ev('2026-11-17', 'A'),
	ev('2026-11-18', 'B'),
	ev('2026-11-19', 'B')
];
const now = new Date('2026-11-16T10:00:00Z');

describe('placeName', () => {
	it('strips "Night at"', () => {
		expect(placeName("Night at Dad's")).toBe("Dad's");
		expect(placeName('Grandma visit')).toBe('Grandma visit');
	});
});

describe('buildNights', () => {
	it('lists the next nights from today with the home of each', () => {
		const nights = buildNights(events, now, 'UTC', 5);
		expect(nights.map((n) => n.home)).toEqual(['A', 'A', 'B', 'B', null]);
		expect(nights[0]).toMatchObject({ date: '2026-11-16', weekday: 'Mon', tonight: true });
		expect(nights[2].place).toBe("Dad's");
		expect(nights[1].tonight).toBe(false);
	});

	it('uses the local date of the event', () => {
		// 17:00 UTC on the 16th is still the 16th in New York (12:00).
		const nights = buildNights(events, now, 'America/New_York', 2);
		expect(nights[0].home).toBe('A');
	});

	it('ignores events without a home', () => {
		const nights = buildNights(
			[{ title: 'Swim', home: null, starts_at: '2026-11-16T17:00:00Z' }],
			now,
			'UTC',
			1
		);
		expect(nights[0].home).toBeNull();
	});
});

describe('nextSwitch', () => {
	it('finds the next handover with its time', () => {
		const nights = buildNights(events, now, 'UTC', 7);
		expect(nextSwitch(nights, events, 'UTC')).toMatchObject({
			date: '2026-11-18',
			weekday: 'Wed',
			place: "Dad's",
			home: 'B',
			time: '5 PM',
			inDays: 2
		});
	});

	it('is null when tonight is unknown or nothing changes', () => {
		expect(nextSwitch(buildNights([], now, 'UTC'), [], 'UTC')).toBeNull();
		const same = [ev('2026-11-16', 'A'), ev('2026-11-17', 'A')];
		expect(nextSwitch(buildNights(same, now, 'UTC'), same, 'UTC')).toBeNull();
	});
});

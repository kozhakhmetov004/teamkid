import { describe, expect, it } from 'vitest';
import {
	personOf,
	pickupToday,
	plansByDay,
	sleepsUntil,
	switchDays,
	type KidEvent
} from './kidCalendar.js';
import { buildNights } from './nights.js';

const night = (day: number, home: 'A' | 'B', who: string): KidEvent => ({
	id: `n${day}`,
	title: `Night at ${who}'s`,
	kind: 'custody',
	home,
	place: null,
	starts_at: `2026-11-${day}T17:00:00Z`,
	ends_at: `2026-11-${day + 1}T17:00:00Z`
});
const events: KidEvent[] = [
	night(15, 'A', 'Mom'),
	night(16, 'A', 'Mom'),
	night(17, 'B', 'Dad'),
	night(18, 'B', 'Dad'),
	{
		id: 'swim',
		title: 'Swim class',
		kind: 'activity',
		home: null,
		place: 'Rec Center',
		starts_at: '2026-11-18T16:00:00Z',
		ends_at: '2026-11-18T17:00:00Z'
	}
];

describe('kid calendar', () => {
	it('names the person from the custody night', () => {
		expect(personOf("Night at Mom's")).toBe('Mom');
	});

	it('lists plans per day with whose time it is, never custody nights', () => {
		const plans = plansByDay(events, 'UTC');
		expect(plans.get('2026-11-18')).toEqual([
			{
				id: 'swim',
				kind: 'activity',
				icon: '🎨',
				time: '4 PM',
				title: 'Swim class',
				with: 'Dad',
				place: 'Rec Center'
			}
		]);
		expect(plans.get('2026-11-15')).toBeUndefined();
	});

	it('knows who picks the child up on a switch day, and counts sleeps', () => {
		const pickup = pickupToday(events, new Date('2026-11-17T09:00:00Z'), 'UTC', 'Oakwood');
		expect(pickup).toEqual({ who: 'Dad', time: '5 PM', place: 'Oakwood' });
		expect(pickupToday(events, new Date('2026-11-16T09:00:00Z'), 'UTC', null)).toBeNull();

		const nights = buildNights(events, new Date('2026-11-15T20:00:00Z'), 'UTC', 7);
		expect(sleepsUntil(nights)).toEqual({ sleeps: 2, person: 'Dad' });
	});

	it('on a switch day, a morning plan is with the parent from last night', () => {
		const morning: KidEvent = {
			id: 'art',
			title: 'Art',
			kind: 'activity',
			home: null,
			place: null,
			// 9 AM on Nov 17: the night of the 16th (Mom) ended at 8 AM, Dad from 5 PM.
			starts_at: '2026-11-17T09:00:00Z',
			ends_at: '2026-11-17T10:00:00Z'
		};
		const nightsOnly = events.map((e) =>
			e.kind === 'custody' ? { ...e, ends_at: e.ends_at.replace('17:00', '08:00') } : e
		);
		expect(plansByDay([...nightsOnly, morning], 'UTC').get('2026-11-17')?.[0].with).toBe('Mom');
		expect(switchDays(nightsOnly, 'UTC').get('2026-11-17')).toEqual({
			dayPlace: "Mom's",
			nightFrom: '5 PM'
		});
	});
});

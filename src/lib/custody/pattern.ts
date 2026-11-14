/**
 * Custody templates (pure; unit-tested in pattern.spec.ts).
 *
 * generateNights() decides which parent has the child each night. It is shared
 * by the "Set up schedule" form and (later) the parenting-plan PDF import, so
 * keep its signature stable.
 *
 * Homes: 'A' / 'B' map to members.home of each parent. `firstParent` gets the
 * first night of the pattern.
 */
import { addDays } from './today.js';
import { daysBetween, mondayOf, zonedToUtc } from './time.js';

export type Template = '2-2-3' | 'week-on-week-off' | 'alternate-weekends';
export type NightHome = 'A' | 'B';

/** custody_schedules.template values in the database. */
export const DB_TEMPLATE: Record<Template, '2-2-3' | 'week_on_week_off' | 'alternate_weekends'> = {
	'2-2-3': '2-2-3',
	'week-on-week-off': 'week_on_week_off',
	'alternate-weekends': 'alternate_weekends'
};

export const TEMPLATE_LABEL: Record<Template, string> = {
	'2-2-3': '2-2-3 (alternating, 14-day cycle)',
	'week-on-week-off': 'Week on / week off',
	'alternate-weekends': 'Alternate weekends'
};

// 2-2-3 over 14 days, 1 = first parent: A A B B A A A | B B A A B B B
const TWO_TWO_THREE = [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0];

const toDateString = (start: Date | string) =>
	typeof start === 'string' ? start : start.toISOString().slice(0, 10);

/**
 * Which parent has the child each night, from `start` for `days` nights.
 * Uses date strings internally (no local-midnight/DST math).
 *
 * - 2-2-3: A A B B A A A | B B A A B B B, repeating every 14 days
 * - week-on-week-off: 7 nights A, 7 nights B
 * - alternate-weekends: A on weekdays; B the Fri, Sat and Sun nights of every
 *   other weekend, starting with the weekend of the start week
 */
export function generateNights(
	template: Template,
	start: Date | string,
	firstParent: NightHome,
	days: number
): { date: string; home: NightHome }[] {
	const first = toDateString(start);
	const second: NightHome = firstParent === 'A' ? 'B' : 'A';
	const startMonday = mondayOf(first);

	return Array.from({ length: Math.max(0, days) }, (_, i) => {
		const date = addDays(first, i);
		let isFirst: boolean;
		if (template === '2-2-3') {
			isFirst = TWO_TWO_THREE[i % 14] === 1;
		} else if (template === 'week-on-week-off') {
			isFirst = Math.floor(i / 7) % 2 === 0;
		} else {
			const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 Sun … 6 Sat
			const weekIndex = Math.floor(daysBetween(startMonday, mondayOf(date)) / 7);
			const weekendNight = weekday === 5 || weekday === 6 || weekday === 0;
			isFirst = !(weekendNight && weekIndex % 2 === 0);
		}
		return { date, home: isFirst ? firstParent : second };
	});
}

/**
 * Night blocks for the events table: each night starts at the exchange time
 * on its date and ends at the exchange time the next day (local time in `tz`).
 */
export function nightsToBlocks(
	nights: { date: string; home: NightHome }[],
	exchangeTime: string,
	tz: string
): { starts_at: string; ends_at: string; home: NightHome }[] {
	return nights.map((n) => ({
		starts_at: zonedToUtc(n.date, exchangeTime, tz).toISOString(),
		ends_at: zonedToUtc(addDays(n.date, 1), exchangeTime, tz).toISOString(),
		home: n.home
	}));
}

/**
 * Custody night generator. Pure functions on date strings ('YYYY-MM-DD'):
 * dates are turned into whole UTC day numbers, never local midnights, so
 * month/year ends, leap days and DST changes can't shift a night.
 *
 * A "night" belongs to the home the child sleeps at; the exchange happens at
 * the schedule's exchange_time on the day the home changes.
 *
 * Template names match the custody_schedules.template check constraint.
 * 'custom' schedules are set up by hand, so they have no generator.
 * Shared: PDF import, calendar setup form (Member 1), weekend planner.
 */
import type { Home } from '#lib/types/domain.js';

export type CustodyTemplate = '2-2-3' | 'week_on_week_off' | 'alternate_weekends' | 'custom';
export type PatternTemplate = Exclude<CustodyTemplate, 'custom'>;
export const PATTERN_TEMPLATES: readonly PatternTemplate[] = [
	'2-2-3',
	'week_on_week_off',
	'alternate_weekends'
];

export interface Night {
	date: string;
	home: Home;
}

/** About 13 months: enough for a year of nights, small enough for one DB call. */
export const MAX_NIGHTS = 400;

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' -> days since 1970-01-01. Throws on an invalid or impossible date. */
function toDayNumber(date: string): number {
	const m = DATE_RE.exec(date);
	if (!m) throw new RangeError(`Invalid date "${date}" (expected YYYY-MM-DD)`);
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const ms = Date.UTC(y, mo - 1, d);
	const back = new Date(ms);
	if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
		throw new RangeError(`Invalid date "${date}"`);
	}
	return ms / DAY_MS;
}

function fromDayNumber(day: number): string {
	return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** ISO weekday of a day number: 1 = Monday ... 7 = Sunday. */
const isoWeekday = (day: number) => ((((day + 3) % 7) + 7) % 7) + 1; // 1970-01-01 was a Thursday

export function addDays(date: string, days: number): string {
	return fromDayNumber(toDayNumber(date) + days);
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function weekdayOf(date: string): number {
	return isoWeekday(toDayNumber(date));
}

const other = (home: Home): Home => (home === 'A' ? 'B' : 'A');

/** 2-2-3 over 14 nights: true = firstHome. A A B B A A A | B B A A B B B */
const TWO_TWO_THREE = [
	true,
	true,
	false,
	false,
	true,
	true,
	true,
	false,
	false,
	true,
	true,
	false,
	false,
	false
];

/**
 * Nights from `start` (inclusive) for `days` nights.
 * - '2-2-3': the 14-night cycle above, relative to firstHome.
 * - 'week_on_week_off': 7 nights firstHome, 7 nights the other home.
 * - 'alternate_weekends': firstHome every night, except Friday and Saturday
 *   nights of every other weekend, starting with the first Friday on or after
 *   `start`, which go to the other home (the child returns on Sunday).
 */
export function generateNights(
	template: PatternTemplate,
	start: string,
	firstHome: Home,
	days: number
): Night[] {
	if (!PATTERN_TEMPLATES.includes(template)) {
		throw new RangeError(`No generator for template "${template}"`);
	}
	if (firstHome !== 'A' && firstHome !== 'B') throw new RangeError('firstHome must be A or B');
	if (!Number.isInteger(days) || days < 0 || days > MAX_NIGHTS) {
		throw new RangeError(`days must be an integer from 0 to ${MAX_NIGHTS}`);
	}
	const first = toDayNumber(start);
	// First Friday on or after start (Friday = 5).
	const firstFriday = first + ((5 - isoWeekday(first) + 7) % 7);

	const nights: Night[] = [];
	for (let i = 0; i < days; i++) {
		const day = first + i;
		let atFirstHome: boolean;
		if (template === '2-2-3') {
			atFirstHome = TWO_TWO_THREE[i % 14];
		} else if (template === 'week_on_week_off') {
			atFirstHome = i % 14 < 7;
		} else {
			const weekday = isoWeekday(day);
			const friday = weekday === 5 ? day : weekday === 6 ? day - 1 : null;
			atFirstHome =
				friday === null || friday < firstFriday || ((friday - firstFriday) / 7) % 2 === 1;
		}
		nights.push({ date: fromDayNumber(day), home: atFirstHome ? firstHome : other(firstHome) });
	}
	return nights;
}

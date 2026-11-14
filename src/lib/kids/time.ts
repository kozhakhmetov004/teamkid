/**
 * UTC day/week helpers for the kids' space and the weekly insight.
 * The whole app stores and shows times in UTC (known limitation); weeks start
 * on Monday 00:00 UTC.
 */

const DAY_MS = 86_400_000;

/** 00:00 UTC of the day `now` falls in. */
export function utcDayStart(now: Date = new Date()): Date {
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Monday 00:00 UTC of the week `now` falls in. */
export function utcWeekStart(now: Date = new Date()): Date {
	const day = utcDayStart(now);
	const isoWeekday = day.getUTCDay() || 7; // Mon = 1 … Sun = 7
	return new Date(day.getTime() - (isoWeekday - 1) * DAY_MS);
}

/** The Monday after `utcWeekStart(now)` (exclusive end of the week). */
export function utcWeekEnd(now: Date = new Date()): Date {
	return new Date(utcWeekStart(now).getTime() + 7 * DAY_MS);
}

/** YYYY-MM-DD of a UTC date, e.g. for weekly_insights.week_start. */
export function isoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/** Part of the day by UTC hour (fallback when the browser's time zone is unknown). */
export function partOfDay(now: Date = new Date()): PartOfDay {
	return partOfHour(now.getUTCHours());
}

/** Part of the day for a local hour 0–23 (greetings only; insight weeks stay UTC). */
export function partOfHour(h: number): PartOfDay {
	if (h >= 5 && h < 12) return 'morning';
	if (h >= 12 && h < 17) return 'afternoon';
	if (h >= 17 && h < 21) return 'evening';
	return 'night';
}

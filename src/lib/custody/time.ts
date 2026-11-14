/**
 * Time-zone helpers for the calendar (pure; unit-tested in time.spec.ts).
 * Dates are 'YYYY-MM-DD' strings, times 'HH:MM' (24h), zones IANA names.
 */
import { addDays } from './today.js';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDateString(value: string | null | undefined): value is string {
	return !!value && DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Offset (ms) of `tz` at instant `t`: local wall clock minus UTC. */
function offsetAt(t: number, tz: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(new Date(t));
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
	const asUtc = Date.UTC(
		get('year'),
		get('month') - 1,
		get('day'),
		get('hour'),
		get('minute'),
		get('second')
	);
	return asUtc - Math.floor(t / 1000) * 1000;
}

/** The UTC instant of a local wall-clock time in `tz` (DST-safe). */
export function zonedToUtc(date: string, time: string, tz: string): Date {
	const [y, m, d] = date.split('-').map(Number);
	const [hh, mm] = time.split(':').map(Number);
	const wall = Date.UTC(y, m - 1, d, hh, mm);
	let t = wall - offsetAt(wall, tz);
	const second = offsetAt(t, tz);
	if (wall - second !== t) t = wall - second;
	return new Date(t);
}

/** Local 'HH:MM' (24h) of an instant in `tz`. */
export function localTime(at: Date | string, tz: string): string {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		hourCycle: 'h23',
		hour: '2-digit',
		minute: '2-digit'
	}).formatToParts(new Date(at));
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
	return `${get('hour')}:${get('minute')}`;
}

/** Monday of the week containing `date`. */
export function mondayOf(date: string): string {
	const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
	return addDays(date, 1 - weekday);
}

/** First day of the month of `date`. */
export const monthStart = (date: string) => `${date.slice(0, 7)}-01`;

/** Same day-of-month in the month `delta` months away (clamped to month length). */
export function addMonths(date: string, delta: number): string {
	const [y, m, d] = date.split('-').map(Number);
	const target = new Date(Date.UTC(y, m - 1 + delta, 1));
	const last = new Date(
		Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
	).getUTCDate();
	target.setUTCDate(Math.min(d, last));
	return target.toISOString().slice(0, 10);
}

/** Days between two date strings (b - a). */
export const daysBetween = (a: string, b: string) =>
	Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(
		new Date(`${date}T12:00:00Z`)
	);

/** "November 2026" */
export const monthTitle = (date: string) => fmt(date, { month: 'long', year: 'numeric' });

/** "Nov 16 – 22, 2026" / "Nov 30 – Dec 6, 2026" */
export function weekTitle(start: string): string {
	const end = addDays(start, 6);
	const sameMonth = start.slice(0, 7) === end.slice(0, 7);
	const left = fmt(start, { month: 'short', day: 'numeric' });
	const right = sameMonth
		? fmt(end, { day: 'numeric' })
		: fmt(end, { month: 'short', day: 'numeric' });
	return `${left} – ${right}, ${end.slice(0, 4)}`;
}

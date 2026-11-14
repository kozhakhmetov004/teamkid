/**
 * Free daytime windows on a weekend for the planner: when the child is with
 * `myHome` (same custody model as today.ts: the child is with the home of the
 * latest block that has started) and no other event is planned. Pure.
 */
import { addDays, type CustodyBlock, type Home } from './today.js';
import { localTime, zonedToUtc } from './time.js';

export interface FreeWindow {
	/** Local date, 'YYYY-MM-DD'. */
	date: string;
	/** Local times 'HH:MM' (on the half hour). */
	from: string;
	to: string;
}

/** Default daytime ("is the child with me this weekend?" and the planner's default range). */
export const DAY_START = '09:00';
export const DAY_END = '19:00';
export const MIN_WINDOW_MINUTES = 120;
/** A parent's own time range may be shorter, down to one outing of an hour. */
export const MIN_RANGE_WINDOW_MINUTES = 60;
/** Earliest / latest times a parent can ask the planner for. */
export const RANGE_START = '07:00';
export const RANGE_END = '21:00';
const HALF_HOUR = 1_800_000;

/** Saturday of the weekend `today` belongs to (Sat/Sun -> this weekend), else the next one. */
export function upcomingSaturday(today: string): string {
	const weekday = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday
	if (weekday === 6) return today;
	if (weekday === 0) return addDays(today, -1);
	return addDays(today, 6 - weekday);
}

/** Home at instant t, or null before the first block. */
function homeAt(sorted: CustodyBlock[], t: number): Home | null {
	let home: Home | null = null;
	for (const b of sorted) {
		if (Date.parse(b.starts_at) <= t) home = b.home;
		else break;
	}
	return home;
}

export function freeWindows(input: {
	saturday: string;
	tz: string;
	myHome: Home | null;
	/** Custody night blocks (include the ones that started before the weekend). */
	blocks: CustodyBlock[];
	/** Other planned events (not custody) that make time busy. */
	busy: { starts_at: string; ends_at: string }[];
	/** Earliest usable instant (e.g. now): past hours are not free. */
	now?: Date;
	/** Local time range of each day to consider (default DAY_START-DAY_END). */
	from?: string;
	to?: string;
	/** Shorter free pieces are dropped (default MIN_WINDOW_MINUTES). */
	minMinutes?: number;
}): FreeWindow[] {
	const { tz, myHome } = input;
	const sorted = [...input.blocks].sort(
		(a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)
	);
	// No custody schedule at all: the whole daytime counts (spec fallback).
	const noSchedule = sorted.length === 0;
	if (!noSchedule && !myHome) return [];
	const now = input.now?.getTime() ?? -Infinity;
	const minMs = (input.minMinutes ?? MIN_WINDOW_MINUTES) * 60_000;

	const windows: FreeWindow[] = [];
	for (const date of [input.saturday, addDays(input.saturday, 1)]) {
		const dayStart = zonedToUtc(date, input.from ?? DAY_START, tz).getTime();
		const dayEnd = zonedToUtc(date, input.to ?? DAY_END, tz).getTime();

		// Cut the day at custody changes and busy events, then keep the free, "mine" pieces.
		const cuts = new Set<number>([dayStart, dayEnd]);
		for (const b of sorted) cuts.add(Date.parse(b.starts_at));
		for (const e of input.busy) {
			cuts.add(Date.parse(e.starts_at));
			cuts.add(Date.parse(e.ends_at));
		}
		const points = [...cuts].filter((t) => t >= dayStart && t <= dayEnd).sort((a, b) => a - b);

		let open: number | null = null;
		const close = (end: number) => {
			if (open === null) return;
			// On the half hour: start rounded up, end rounded down.
			const from = Math.ceil(Math.max(open, now) / HALF_HOUR) * HALF_HOUR;
			const to = Math.floor(end / HALF_HOUR) * HALF_HOUR;
			if (to - from >= minMs) {
				windows.push({
					date,
					from: localTime(new Date(from), tz),
					to: localTime(new Date(to), tz)
				});
			}
			open = null;
		};
		for (let i = 0; i < points.length - 1; i++) {
			const [a, b] = [points[i], points[i + 1]];
			const mine = noSchedule || homeAt(sorted, a) === myHome;
			const isBusy = input.busy.some(
				(e) => Date.parse(e.starts_at) < b && Date.parse(e.ends_at) > a
			);
			if (mine && !isBusy) open ??= a;
			else close(a);
		}
		close(dayEnd);
	}
	return windows;
}

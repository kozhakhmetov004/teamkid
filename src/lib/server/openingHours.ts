/**
 * Minimal reader for OSM `opening_hours`, enough to drop suggestions at times
 * a place is clearly closed. Handles "24/7" and rules like
 * "Mo-Fr 09:00-17:00; Sa,Su 10:00-18:00; Tu off". Anything else
 * (public holidays, months, sunrise, comments...) returns null = unknown, and
 * unknown is never a reason to drop a place.
 */
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

/** Set of ISO weekdays (1 = Monday) for "Mo-Fr,Su"; null if unreadable. */
function parseDays(spec: string): Set<number> | null {
	const out = new Set<number>();
	for (const part of spec.split(',')) {
		const m = part.trim().match(/^([A-Z][a-z])(?:-([A-Z][a-z]))?$/);
		if (!m) return null;
		const a = DAYS.indexOf(m[1] as (typeof DAYS)[number]);
		const b = m[2] ? DAYS.indexOf(m[2] as (typeof DAYS)[number]) : a;
		if (a < 0 || b < 0) return null;
		for (let i = a; ; i = (i + 1) % 7) {
			out.add(i + 1);
			if (i === b) break;
		}
	}
	return out;
}

const minutes = (hhmm: string) => {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + m;
};

/** [from, to) minute ranges for "09:00-12:00,13:00-24:00"; null if unreadable. */
function parseTimes(spec: string): [number, number][] | null {
	const ranges: [number, number][] = [];
	for (const part of spec.split(',')) {
		const m = part.trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
		if (!m) return null;
		const from = minutes(m[1]);
		let to = minutes(m[2]);
		if (to <= from) to = 24 * 60; // past midnight: open until the end of this day
		ranges.push([from, to]);
	}
	return ranges;
}

/**
 * Is the place open for the whole of [from, to) ('HH:MM') on an ISO weekday?
 * true / false when the rule is clear, null when unknown.
 */
export function openDuring(
	openingHours: string | null | undefined,
	weekday: number,
	from: string,
	to: string
): boolean | null {
	const oh = openingHours?.trim();
	if (!oh) return null;
	if (oh === '24/7') return true;

	let ranges: [number, number][] | null = null; // null = no rule for this day yet
	for (const rawRule of oh.split(';')) {
		const rule = rawRule.trim();
		if (!rule) continue;
		const m = rule.match(/^(?:([A-Z][a-z](?:[-,][A-Z][a-z])*)\s+)?(.+)$/);
		if (!m) return null;
		const days = m[1] ? parseDays(m[1]) : new Set([1, 2, 3, 4, 5, 6, 7]);
		if (!days) return null;
		const body = m[2].trim();
		const times = /^(off|closed)$/i.test(body) ? [] : parseTimes(body);
		if (!times) return null;
		// Later rules override earlier ones for the days they name.
		if (days.has(weekday)) ranges = times;
	}
	if (ranges === null) return false; // the day isn't listed: closed
	const a = minutes(from);
	const b = minutes(to);
	return ranges.some(([start, end]) => start <= a && b <= end);
}

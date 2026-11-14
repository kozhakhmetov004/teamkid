/**
 * "Where am I tonight?": a picture calendar of the next nights for the child.
 * Built from the family's custody events (kind = 'custody', home A/B), which
 * the child may read under RLS (events_select_child). Pure helpers, no I/O.
 */

export interface NightEvent {
	title: string;
	home: string | null;
	starts_at: string;
}

export interface Night {
	/** YYYY-MM-DD in the child's time zone */
	date: string;
	/** "Mon" */
	weekday: string;
	/** "Nov 16" */
	short: string;
	home: 'A' | 'B' | null;
	/** "Mom's", from the event title "Night at Mom's" */
	place: string | null;
	tonight: boolean;
}

export interface NextSwitch {
	date: string;
	weekday: string;
	place: string;
	home: 'A' | 'B';
	/** "5 PM" in the child's time zone */
	time: string;
	/** whole days from today (1 = tomorrow) */
	inDays: number;
}

/** "Night at Mom's" -> "Mom's"; any other title is shown as it is. */
export function placeName(title: string): string {
	const t = title.trim();
	const m = /^night at\s+(.+)$/i.exec(t);
	return m ? m[1] : t;
}

export function localIsoDate(d: Date, tz: string): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: tz,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(d);
}

function addDaysIso(iso: string, n: number): string {
	const d = new Date(`${iso}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	timeZone: 'UTC'
});

function asHome(h: string | null): 'A' | 'B' | null {
	return h === 'A' || h === 'B' ? h : null;
}

/** `count` nights starting today; a night belongs to the local date its event starts on. */
export function buildNights(events: NightEvent[], now: Date, tz: string, count = 7): Night[] {
	const today = localIsoDate(now, tz);
	const byDate = new Map<string, NightEvent>();
	for (const e of [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
		if (!asHome(e.home)) continue;
		byDate.set(localIsoDate(new Date(e.starts_at), tz), e); // latest wins
	}
	return Array.from({ length: count }, (_, i) => {
		const date = addDaysIso(today, i);
		const noon = new Date(`${date}T12:00:00Z`);
		const e = byDate.get(date);
		return {
			date,
			weekday: weekdayFmt.format(noon),
			short: shortFmt.format(noon),
			home: e ? asHome(e.home) : null,
			place: e ? placeName(e.title) : null,
			tonight: i === 0
		};
	});
}

/** The first night that's at a different home than tonight (the next handover). */
export function nextSwitch(nights: Night[], events: NightEvent[], tz: string): NextSwitch | null {
	const first = nights[0]?.home;
	if (!first) return null;
	const i = nights.findIndex((n, idx) => idx > 0 && n.home !== null && n.home !== first);
	if (i < 0) return null;
	const n = nights[i];
	const e = events.find((ev) => localIsoDate(new Date(ev.starts_at), tz) === n.date);
	const time = e
		? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })
				.format(new Date(e.starts_at))
				.replace(':00', '')
		: '';
	return {
		date: n.date,
		weekday: n.weekday,
		place: n.place ?? '',
		home: n.home!,
		time,
		inDays: i
	};
}

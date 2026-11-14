/**
 * Pure helpers for "who has the child", handovers, the week strip and the
 * rule-based briefing. No SvelteKit / Supabase imports: unit-tested in
 * today.spec.ts and safe to use from server or browser code.
 *
 * Custody model: each `kind = 'custody'` event is one night block
 * (e.g. Mon 17:00 → Tue 08:00) with `home` 'A' | 'B'. The night belongs to
 * the local date its block STARTS on. The child is with the home of the most
 * recent block that has started, until a block with a different home starts
 * (that start is the handover).
 */

export type Home = 'A' | 'B';

export interface CustodyBlock {
	starts_at: string;
	ends_at: string;
	home: Home;
}

/** Validates an IANA time zone; anything unknown falls back to UTC. */
export function safeTimeZone(tz: string | null | undefined): string {
	if (!tz || tz.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(tz)) return 'UTC';
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
		return tz;
	} catch {
		return 'UTC';
	}
}

/** Local calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function localDate(at: Date | string, tz: string): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: tz,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(new Date(at));
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Local hour (0–23) of an instant in a time zone. */
export function localHour(at: Date, tz: string): number {
	const hour = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' })
		.formatToParts(at)
		.find((p) => p.type === 'hour')?.value;
	return Number(hour ?? 0);
}

/** Date-string arithmetic (no local-midnight/DST pitfalls). */
export function addDays(date: string, days: number): string {
	const d = new Date(`${date}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

const dateOnly = (date: string, opts: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(
		new Date(`${date}T12:00:00Z`)
	);

/** "Mon" */
export const weekdayShort = (date: string) => dateOnly(date, { weekday: 'short' });
/** "Monday" */
export const weekdayLong = (date: string) => dateOnly(date, { weekday: 'long' });
/** "Monday, November 14" */
export const longDate = (date: string) =>
	dateOnly(date, { weekday: 'long', month: 'long', day: 'numeric' });
/** "Sat 19 Nov" */
export const shortDate = (date: string) =>
	dateOnly(date, { weekday: 'short', day: 'numeric', month: 'short' });

/** "4:00 PM" in the given zone. */
export function timeLabel(at: Date | string, tz: string): string {
	return new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		hour: 'numeric',
		minute: '2-digit'
	}).format(new Date(at));
}

/** "today" / "tomorrow" / "Thursday" (within a week) / "Mon, Nov 21". */
export function relativeDay(date: string, today: string): string {
	if (date === today) return 'today';
	if (date === addDays(today, 1)) return 'tomorrow';
	const diff = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
	if (diff > 1 && diff < 7) return weekdayLong(date);
	return dateOnly(date, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function greetingFor(hour: number): string {
	if (hour < 5) return 'Good evening';
	if (hour < 12) return 'Good morning';
	if (hour < 18) return 'Good afternoon';
	return 'Good evening';
}

const byStart = (a: CustodyBlock, b: CustodyBlock) =>
	Date.parse(a.starts_at) - Date.parse(b.starts_at);

/** Night home per local date (the date the block starts on). Later blocks win. */
export function nightsByDate(blocks: CustodyBlock[], tz: string): Map<string, Home> {
	const map = new Map<string, Home>();
	for (const b of [...blocks].sort(byStart)) map.set(localDate(b.starts_at, tz), b.home);
	return map;
}

export interface Handover {
	/** When the child moves (start of the first block of the new home). */
	at: Date;
	from: Home;
	to: Home;
}

/** Who has the child right now and the next handover (null when unknown). */
export function custodyNow(
	blocks: CustodyBlock[],
	now: Date
): { home: Home | null; handover: Handover | null } {
	const sorted = [...blocks].sort(byStart);
	const t = now.getTime();
	let current: Home | null = null;
	for (const b of sorted) {
		if (Date.parse(b.starts_at) <= t) current = b.home;
		else break;
	}
	return { home: current, handover: nextHandover(sorted, now, current) };
}

/** First future block whose home differs from the home before it. */
export function nextHandover(
	blocks: CustodyBlock[],
	now: Date,
	currentHome?: Home | null
): Handover | null {
	const sorted = [...blocks].sort(byStart);
	const t = now.getTime();
	let prev: Home | null = currentHome ?? null;
	for (const b of sorted) {
		const start = Date.parse(b.starts_at);
		if (start <= t) {
			if (currentHome === undefined) prev = b.home;
			continue;
		}
		if (prev && b.home !== prev) return { at: new Date(start), from: prev, to: b.home };
		prev = b.home;
	}
	return null;
}

export interface StripDay {
	date: string;
	weekday: string;
	dayOfMonth: number;
	home: Home | null;
	eventCount: number;
	isToday: boolean;
}

/** 7 (or `days`) days from `today`, with the night home and the number of other events. */
export function weekStrip(
	blocks: CustodyBlock[],
	events: { starts_at: string }[],
	today: string,
	tz: string,
	days = 7
): StripDay[] {
	const nights = nightsByDate(blocks, tz);
	const counts = new Map<string, number>();
	for (const e of events) {
		const d = localDate(e.starts_at, tz);
		counts.set(d, (counts.get(d) ?? 0) + 1);
	}
	return Array.from({ length: days }, (_, i) => {
		const date = addDays(today, i);
		return {
			date,
			weekday: weekdayShort(date),
			dayOfMonth: Number(date.slice(8, 10)),
			home: nights.get(date) ?? null,
			eventCount: counts.get(date) ?? 0,
			isToday: i === 0
		};
	});
}

/**
 * "Lily is with you through Wednesday" / "Lily is with Dad until Friday 5:00 PM".
 * `nameOf(home)` returns "you" for the viewer's own home.
 */
export function custodyLine(input: {
	childName: string;
	home: Home | null;
	handover: Handover | null;
	myHome: string | null;
	nameOf: (home: Home) => string;
	today: string;
	tz: string;
}): string | null {
	const { childName, home, handover, myHome, nameOf, today, tz } = input;
	if (!home) return null;
	if (home === myHome) {
		if (!handover) return `${childName} is with you`;
		const handoverDay = localDate(handover.at, tz);
		// Soon: give the exact time. Later: name the last night with you.
		if (handoverDay <= addDays(today, 1)) {
			const day = handoverDay <= today ? 'today' : 'tomorrow';
			return `${childName} is with you until ${day === 'today' ? `${timeLabel(handover.at, tz)} today` : `tomorrow ${timeLabel(handover.at, tz)}`}`;
		}
		return `${childName} is with you through ${relativeDay(addDays(handoverDay, -1), today)}`;
	}
	const who = nameOf(home);
	if (!handover) return `${childName} is with ${who}`;
	return `${childName} is with ${who} until ${relativeDay(localDate(handover.at, tz), today)} ${timeLabel(handover.at, tz)}`;
}

/**
 * Rule-based daily briefing (P1). Member 3 can replace it with an AI briefing
 * by passing a different string to <BriefingCard>.
 */
export function buildBriefing(input: {
	custodyLine: string | null;
	otherName: string | null;
	swapsFromOther: number;
	swapsWaiting: number;
	unread: number;
	firstEvent: { title: string; time: string } | null;
}): string {
	const sentences: string[] = [];
	if (input.custodyLine) sentences.push(`${input.custodyLine}.`);

	const asks: string[] = [];
	if (input.swapsFromOther === 1)
		asks.push(`${input.otherName ?? 'Your co-parent'} asked about a swap`);
	if (input.swapsFromOther > 1)
		asks.push(`${input.otherName ?? 'Your co-parent'} sent ${input.swapsFromOther} swap requests`);
	if (input.unread > 0)
		asks.push(`you have ${input.unread} unread message${input.unread === 1 ? '' : 's'}`);
	if (asks.length) {
		const text = asks.join(', and ');
		sentences.push(`${text[0].toUpperCase()}${text.slice(1)}.`);
	}
	if (input.swapsWaiting > 0 && input.swapsFromOther === 0) {
		sentences.push(
			`Your swap request${input.swapsWaiting === 1 ? ' is' : 's are'} waiting for ${input.otherName ?? 'your co-parent'}.`
		);
	}
	sentences.push(
		input.firstEvent
			? `First up today: ${input.firstEvent.title} at ${input.firstEvent.time}.`
			: 'Nothing else on the calendar today.'
	);
	return sentences.join(' ');
}

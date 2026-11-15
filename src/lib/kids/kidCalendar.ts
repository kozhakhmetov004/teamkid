/**
 * The child's calendar beyond "where do I sleep": what's planned each day and
 * with whom, who picks me up today, and how many sleeps until the next home.
 * Input comes from public.kid_calendar() (safe columns only, no notes, no
 * events the parents hid). Pure helpers, no I/O.
 */
import { localIsoDate, placeName, type Night } from './nights.js';

export interface KidEvent {
	id: string;
	title: string;
	kind: string;
	starts_at: string;
	ends_at: string;
	home: string | null;
	place: string | null;
}

export interface KidPlan {
	id: string;
	kind: string;
	icon: string;
	/** "4 PM" / "4:30 PM", or null for all-day */
	time: string | null;
	title: string;
	/** "Dad": whose time it is, from the custody night covering it */
	with: string | null;
	place: string | null;
}

export interface Pickup {
	who: string;
	time: string;
	place: string | null;
}

const KIND_ICON: Record<string, string> = {
	school: '🏫',
	activity: '🎨',
	medical: '🩺',
	handover: '🚗',
	other: '📌'
};

/** "Night at Mom's" → "Mom". */
export function personOf(custodyTitle: string): string {
	return placeName(custodyTitle).replace(/[’']s$/i, '');
}

function timeLabel(at: string, tz: string): string {
	return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })
		.format(new Date(at))
		.replace(':00', '');
}

const isCustody = (e: KidEvent) => e.kind === 'custody' && (e.home === 'A' || e.home === 'B');

const ms = (iso: string) => new Date(iso).getTime();

/**
 * Whose time it is at `at`: the latest custody night that started before it.
 * Nights end in the morning, but the child stays with that parent during the
 * day until the next handover (the next night's start).
 */
function custodyAt(custody: KidEvent[], at: string): KidEvent | null {
	let found: KidEvent | null = null;
	for (const c of custody) if (ms(c.starts_at) <= ms(at)) found = c;
	return found && ms(at) - ms(found.starts_at) < 2 * 86_400_000 ? found : null;
}

/**
 * Switch days: where the child is during the day when it differs from tonight
 * ("Dad's" in the morning, "Mom's" from 5 PM). Keyed by local date.
 */
export function switchDays(
	events: KidEvent[],
	tz: string
): Map<string, { dayPlace: string; nightFrom: string }> {
	const custody = events.filter(isCustody).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
	const out = new Map<string, { dayPlace: string; nightFrom: string }>();
	for (let i = 1; i < custody.length; i++) {
		const prev = custody[i - 1];
		const c = custody[i];
		if (prev.home === c.home) continue;
		out.set(localIsoDate(new Date(c.starts_at), tz), {
			dayPlace: placeName(prev.title),
			nightFrom: timeLabel(c.starts_at, tz)
		});
	}
	return out;
}

/** Plans per local date (YYYY-MM-DD), oldest first; custody nights are not plans. */
export function plansByDay(events: KidEvent[], tz: string): Map<string, KidPlan[]> {
	const custody = events.filter(isCustody).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
	const out = new Map<string, KidPlan[]>();
	for (const e of [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
		if (e.kind === 'custody') continue;
		const date = localIsoDate(new Date(e.starts_at), tz);
		const allDay = new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime() >= 86_400_000;
		const block = custodyAt(custody, e.starts_at);
		const plans = out.get(date) ?? [];
		plans.push({
			id: e.id,
			kind: e.kind,
			icon: KIND_ICON[e.kind] ?? KIND_ICON.other,
			time: allDay ? null : timeLabel(e.starts_at, tz),
			title: e.title,
			with: block ? personOf(block.title) : null,
			place: e.place
		});
		out.set(date, plans);
	}
	return out;
}

/** A handover today: a custody night starting today at a different home than the one before. */
export function pickupToday(
	events: KidEvent[],
	now: Date,
	tz: string,
	exchangePlace: string | null
): Pickup | null {
	const today = localIsoDate(now, tz);
	const custody = events.filter(isCustody).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
	for (let i = 1; i < custody.length; i++) {
		const c = custody[i];
		if (localIsoDate(new Date(c.starts_at), tz) !== today) continue;
		if (c.home === custody[i - 1].home) continue;
		return { who: personOf(c.title), time: timeLabel(c.starts_at, tz), place: exchangePlace };
	}
	return null;
}

/** "2 more sleeps until Dad's house": sleeps = nights at the current home before the switch. */
export function sleepsUntil(nights: Night[]): { sleeps: number; person: string } | null {
	const first = nights[0]?.home;
	if (!first) return null;
	const i = nights.findIndex((n, idx) => idx > 0 && n.home !== null && n.home !== first);
	if (i < 0 || !nights[i].place) return null;
	return { sleeps: i, person: nights[i].place!.replace(/[’']s$/i, '') };
}

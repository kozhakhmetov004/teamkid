import { requireChild } from '#lib/server/guards.js';
import { safeTimeZone } from '#lib/custody/today.js';
import { pickupToday, plansByDay, sleepsUntil, switchDays } from '#lib/kids/kidCalendar.js';
import { buildNights, localIsoDate, nextSwitch } from '#lib/kids/nights.js';
import { packingList } from '#lib/kids/packing.js';
import type { PageServerLoad } from './$types';

const DAY_MS = 86_400_000;

/**
 * "Where am I tonight?": the next 7 nights as pictures, plus what's planned each
 * day, who picks me up today and how many sleeps until the next home. Reads
 * public.kid_calendar() as the child: safe columns only, never notes, never
 * events the parents hid (e.g. a surprise).
 */
export const load: PageServerLoad = async (event) => {
	await requireChild(event);
	const sb = event.locals.supabase;
	const tz = safeTimeZone(event.cookies.get('tz'));
	const now = new Date();

	const [calendar, exchange] = await Promise.all([
		sb.rpc('kid_calendar', {
			p_from: new Date(now.getTime() - 2 * DAY_MS).toISOString(),
			p_to: new Date(now.getTime() + 9 * DAY_MS).toISOString()
		}),
		sb.rpc('kid_exchange_place')
	]);
	if (calendar.error) console.error('kid calendar failed', calendar.error.code);

	const events = calendar.data ?? [];
	const nights = buildNights(
		events.filter((e) => e.kind === 'custody'),
		now,
		tz,
		7
	);
	const plans = plansByDay(events, tz);
	const switches = switchDays(events, tz);
	const pickup = pickupToday(events, now, tz, exchange.data ?? null);
	const sleeps = sleepsUntil(nights);

	// Packing: on a switch day (from tonight) or the day before (from the switch),
	// for the plans at that home until the child moves again.
	const start = pickup ? 0 : sleeps?.sleeps === 1 ? 1 : -1;
	let packing = null;
	if (start >= 0 && nights[start]?.home) {
		const stay = [];
		for (let i = start; i < nights.length && nights[i].home === nights[start].home; i++)
			stay.push(nights[i]);
		packing = {
			person: pickup?.who ?? sleeps?.person ?? '',
			date: nights[start].date,
			items: packingList(
				stay.flatMap((n) =>
					(plans.get(n.date) ?? []).map((p) => ({
						title: p.title,
						kind: p.kind,
						weekday: n.weekday
					}))
				)
			)
		};
	}

	return {
		nights: nights.map((n) => ({
			...n,
			plans: plans.get(n.date) ?? [],
			switch: switches.get(n.date) ?? null
		})),
		next: nextSwitch(
			nights,
			events.filter((e) => e.kind === 'custody'),
			tz
		),
		pickup,
		sleeps,
		packing,
		today: localIsoDate(now, tz),
		tz
	};
};

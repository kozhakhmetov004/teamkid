import { requireChild } from '#lib/server/guards.js';
import { safeTimeZone } from '#lib/custody/today.js';
import { buildNights, nextSwitch } from '#lib/kids/nights.js';
import type { PageServerLoad } from './$types';

const DAY_MS = 86_400_000;

/**
 * "Where am I tonight?": the next 7 nights as pictures. Uses the child's own
 * session (events_select_child RLS) and only custody nights (home A/B).
 */
export const load: PageServerLoad = async (event) => {
	const { childId } = await requireChild(event);
	const tz = safeTimeZone(event.cookies.get('tz'));
	const now = new Date();

	const { data } = await event.locals.supabase
		.from('events')
		.select('title, home, starts_at')
		.eq('kind', 'custody')
		.or(`child_id.eq.${childId},child_id.is.null`)
		.gte('starts_at', new Date(now.getTime() - DAY_MS).toISOString())
		.lt('starts_at', new Date(now.getTime() + 9 * DAY_MS).toISOString())
		.order('starts_at');

	const events = data ?? [];
	const nights = buildNights(events, now, tz, 7);
	return { nights, next: nextSwitch(nights, events, tz), tz };
};

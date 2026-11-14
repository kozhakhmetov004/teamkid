/**
 * What the weekend planner may know, read as the signed-in parent (RLS):
 * the child's age (from birth_year), the wishes the child SHARED, the latest
 * weekly insight's mood trend, custody nights and planned events.
 * Never reads mood_checkins, kid_chat_raw or pet_state.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { freeWindows, upcomingSaturday, type FreeWindow } from '#lib/custody/freeWindows.js';
import { zonedToUtc } from '#lib/custody/time.js';
import { addDays, localDate, type CustodyBlock, type Home } from '#lib/custody/today.js';
import type { Database } from '#lib/types/database.js';
import type { Membership } from '#lib/types/domain.js';

export const WEEKENDS_AHEAD = 4;

export interface PlannerContext {
	child: { id: string; firstName: string; ageYears: number } | null;
	/** Shared wishes as the child wrote them (for the UI). */
	wishes: string[];
	moodTrend: string | null;
	myHome: Home | null;
	otherParentName: string | null;
	today: string;
	/** Free time in the default daytime (09:00-19:00): also says whether the child is with me. */
	weekends: { saturday: string; windows: FreeWindow[] }[];
	/** Raw data for re-computing windows in another time range (server only). */
	blocks: CustodyBlock[];
	busy: { starts_at: string; ends_at: string }[];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The wishes with the child's name taken out, for the LLM. Same order as `wishes`. */
export function scrubName(wishes: string[], firstName: string | null | undefined): string[] {
	if (!firstName) return wishes;
	const re = new RegExp(`\\b${escapeRe(firstName)}(['’]s)?\\b`, 'giu');
	return wishes.map((w) =>
		w.replace(re, (_m, possessive) => (possessive ? "my child's" : 'my child'))
	);
}

export async function loadPlannerContext(
	sb: SupabaseClient<Database>,
	member: Membership,
	tz: string,
	now: Date = new Date()
): Promise<PlannerContext> {
	const today = localDate(now, tz);
	const first = upcomingSaturday(today);
	const saturdays = Array.from({ length: WEEKENDS_AHEAD }, (_, i) => addDays(first, i * 7));
	// From a few days before the first weekend (the night that is running then) to the last Sunday.
	const from = zonedToUtc(addDays(first, -3), '00:00', tz).toISOString();
	const to = zonedToUtc(addDays(saturdays.at(-1) as string, 2), '00:00', tz).toISOString();

	const { data: child } = await sb
		.from('children')
		.select('id, first_name, birth_year')
		.eq('family_id', member.family_id)
		.order('created_at')
		.limit(1)
		.maybeSingle();

	const [wishes, insight, custody, busy, parents] = await Promise.all([
		child
			? sb
					.from('wish_cards')
					.select('interest')
					.eq('child_id', child.id)
					.eq('shared_with_parents', true)
					.order('shared_at', { ascending: false })
					.limit(10)
			: Promise.resolve({ data: [] as { interest: string }[] }),
		child
			? sb
					.from('weekly_insights')
					.select('mood_trend')
					.eq('child_id', child.id)
					.order('week_start', { ascending: false })
					.limit(1)
					.maybeSingle()
			: Promise.resolve({ data: null }),
		sb
			.from('events')
			.select('starts_at, ends_at, home')
			.eq('family_id', member.family_id)
			.eq('kind', 'custody')
			.gte('starts_at', from)
			.lt('starts_at', to),
		sb
			.from('events')
			.select('starts_at, ends_at')
			.eq('family_id', member.family_id)
			.neq('kind', 'custody')
			.lt('starts_at', to)
			.gt('ends_at', from),
		sb
			.from('members')
			.select('display_name, home, user_id')
			.eq('family_id', member.family_id)
			.eq('role', 'parent')
	]);

	const myHome = member.home === 'A' || member.home === 'B' ? member.home : null;
	const blocks = (custody.data ?? []).filter(
		(b): b is CustodyBlock => b.home === 'A' || b.home === 'B'
	);
	const other = (parents.data ?? []).find((p) => p.user_id && p.home && p.home !== myHome);

	return {
		child: child
			? {
					id: child.id,
					firstName: child.first_name,
					ageYears: now.getUTCFullYear() - child.birth_year
				}
			: null,
		wishes: (wishes.data ?? []).map((w) => w.interest),
		moodTrend: insight.data?.mood_trend ?? null,
		myHome,
		otherParentName: other?.display_name ?? null,
		today,
		blocks,
		busy: busy.data ?? [],
		weekends: saturdays.map((saturday) => ({
			saturday,
			windows: freeWindows({
				saturday,
				tz,
				myHome,
				blocks,
				busy: busy.data ?? [],
				now
			})
		}))
	};
}

/**
 * Soft warnings for a time the parent picked on a suggestion card (never a
 * reason to refuse saving): the child is with the other parent for part of
 * it, or it overlaps something already on the calendar.
 */
export async function slotWarnings(
	sb: SupabaseClient<Database>,
	member: Membership,
	tz: string,
	slot: { date: string; from: string; to: string }
): Promise<string[]> {
	const start = zonedToUtc(slot.date, slot.from, tz);
	const end = zonedToUtc(slot.date, slot.to, tz);
	// A few days back: the night that is running when the slot starts.
	const lookback = new Date(start.getTime() - 4 * 86_400_000).toISOString();

	const [custody, busy, child, parents] = await Promise.all([
		sb
			.from('events')
			.select('starts_at, home')
			.eq('family_id', member.family_id)
			.eq('kind', 'custody')
			.gte('starts_at', lookback)
			.lt('starts_at', end.toISOString())
			.order('starts_at'),
		sb
			.from('events')
			.select('title')
			.eq('family_id', member.family_id)
			.neq('kind', 'custody')
			.lt('starts_at', end.toISOString())
			.gt('ends_at', start.toISOString())
			.order('starts_at')
			.limit(3),
		sb
			.from('children')
			.select('first_name')
			.eq('family_id', member.family_id)
			.order('created_at')
			.limit(1)
			.maybeSingle(),
		sb
			.from('members')
			.select('display_name, home, user_id')
			.eq('family_id', member.family_id)
			.eq('role', 'parent')
	]);

	const warnings: string[] = [];
	const myHome = member.home === 'A' || member.home === 'B' ? member.home : null;
	if (myHome) {
		// Homes during the slot: the one running at the start plus any that start inside it.
		const s = start.getTime();
		let atStart: string | null = null;
		const homes = new Set<string>();
		for (const b of custody.data ?? []) {
			if (!b.home) continue;
			if (Date.parse(b.starts_at) <= s) atStart = b.home;
			else homes.add(b.home);
		}
		if (atStart) homes.add(atStart);
		if ([...homes].some((h) => h !== myHome)) {
			const other = (parents.data ?? []).find((p) => p.user_id && p.home && p.home !== myHome);
			const childName = child.data?.first_name ?? 'Your child';
			warnings.push(`${childName} is with ${other?.display_name ?? 'your co-parent'} at this time`);
		}
	}
	for (const e of busy.data ?? []) warnings.push(`Overlaps ${e.title}`);
	return warnings;
}

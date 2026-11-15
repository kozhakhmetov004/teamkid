/**
 * "Plan this weekend" panel on /calendar (merged from the old /plan page).
 * Read as the signed-in parent (RLS): shared wish picks only, the
 * parent-noted interests, custody for the weekend and what's already planned.
 */
import type { RequestEvent } from '@sveltejs/kit';
import { localTime } from '#lib/custody/time.js';
import { localDate, weekdayLong } from '#lib/custody/today.js';
import { isoDate, utcWeekStart } from '#lib/kids/time.js';
import { tagsFromWords } from '#lib/kids/weekLines.js';
import type { Membership } from '#lib/types/domain.js';
import { loadWeekendFacts } from './insights/wishDeck.js';
import { weekendNudge, type SharedItem } from './insights/weekAi.js';
import { loadPlannerContext } from './plannerContext.js';

export async function loadPlanPanel(event: RequestEvent, member: Membership, tz: string) {
	const sb = event.locals.supabase;
	const ctx = await loadPlannerContext(sb, member, tz);
	const child = ctx.child;
	const week = isoDate(utcWeekStart(new Date()));

	const [facts, shared, profile] = child
		? await Promise.all([
				loadWeekendFacts(member.family_id, child.id, tz),
				sb
					.from('wish_cards')
					.select('interest, tags, card_kind, week_start')
					.eq('child_id', child.id)
					.eq('shared_with_parents', true)
					.order('shared_at', { ascending: false })
					.limit(20),
				sb.from('child_profiles').select('interests').eq('child_id', child.id).maybeSingle()
			])
		: [null, { data: [] }, { data: null }];

	// Activities that came back from a declined swap request (this parent's own).
	const { data: ideas } = await sb
		.from('planner_ideas')
		.select('id, title, place, starts_at, ends_at')
		.eq('member_id', member.member_id)
		.order('created_at', { ascending: false })
		.limit(5);

	const rows = shared.data ?? [];
	const picks: SharedItem[] = rows
		.filter((r) => r.card_kind === 'activity' && r.week_start === week)
		.map((r) => ({ label: r.interest, tags: r.tags ?? [], kind: r.card_kind }));
	const childTags = [
		...new Set([
			...rows.flatMap((r) => r.tags ?? []),
			...tagsFromWords(profile.data?.interests ?? [])
		])
	];
	const childName = child?.firstName ?? 'your child';

	return {
		panel: {
			tz,
			childName,
			otherParentName: ctx.otherParentName,
			hasWishes: ctx.wishes.length > 0,
			weekends: ctx.weekends.map((w) => ({ saturday: w.saturday, withYou: w.windows.length > 0 })),
			childTags,
			returnedIdeas: (ideas ?? []).map((i) => ({
				id: i.id,
				title: i.title,
				place: i.place,
				date: localDate(i.starts_at, tz),
				from: localTime(i.starts_at, tz),
				to: localTime(i.ends_at, tz)
			})),
			weekend: facts
				? {
						saturday: facts.saturday,
						days: facts.days.map((d) => ({
							date: d.date,
							with: d.home && d.home === member.home ? 'you' : d.with
						})),
						planned: facts.plannedEvents.map((e) => ({
							title: e.title,
							when: `${weekdayLong(localDate(e.starts_at, tz))} ${localTime(e.starts_at, tz)}`
						}))
					}
				: null
		},
		// Streamed so the calendar never waits on the AI.
		nudge: child && picks.length ? weekendNudge(childName, picks) : Promise.resolve(null)
	};
}

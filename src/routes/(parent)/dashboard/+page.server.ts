/**
 * Dashboard placeholder: four cards reading seed data with simple RLS-protected
 * queries, so each workstream can see its data flow end to end.
 */
import { suggestForParent } from '#lib/server/ai/parentSuggestion.js';
import { requireParent } from '#lib/server/guards.js';
import type { PageServerLoad } from './$types';

function mondayUtc(d = new Date()): Date {
	const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
	m.setUTCDate(m.getUTCDate() - ((m.getUTCDay() || 7) - 1));
	return m;
}

// Server-side formatting in UTC avoids SSR/hydration mismatches. Real
// time-zone handling belongs to the calendar feature.
const dayFmt = new Intl.DateTimeFormat('en-US', {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
	timeZone: 'UTC'
});
const timeFmt = new Intl.DateTimeFormat('en-US', {
	hour: 'numeric',
	minute: '2-digit',
	timeZone: 'UTC'
});

export const load: PageServerLoad = async (event) => {
	const { member } = await requireParent(event);
	const sb = event.locals.supabase;
	const familyId = member.family_id;

	const monday = mondayUtc();
	const nextMonday = new Date(monday.getTime() + 7 * 86_400_000);
	const prevMonthStart = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth() - 1, 1));

	const [parents, children, events, insights, wishes, spending, myTime] = await Promise.all([
		sb
			.from('members')
			.select('id, display_name, home')
			.eq('family_id', familyId)
			.eq('role', 'parent'),
		sb
			.from('children')
			.select('id, first_name, status')
			.eq('family_id', familyId)
			.order('created_at'),
		sb
			.from('events')
			.select('id, title, starts_at, ends_at, home')
			.eq('family_id', familyId)
			.gte('starts_at', monday.toISOString())
			.lt('starts_at', nextMonday.toISOString())
			.order('starts_at'),
		sb
			.from('weekly_insights')
			.select('child_id, week_start, mood_trend, interests, summary, gentle_flag')
			.eq('family_id', familyId)
			.order('week_start', { ascending: false })
			.limit(5),
		// RLS returns only wish cards the child chose to share.
		sb
			.from('wish_cards')
			.select('id, child_id, interest')
			.eq('family_id', familyId)
			.order('created_at', { ascending: false })
			.limit(6),
		sb
			.from('v_spending_by_category')
			.select('month, category, total_cents')
			.eq('family_id', familyId)
			.gte('month', prevMonthStart.toISOString().slice(0, 10)),
		// Private: the view only ever returns the signed-in parent's own outings.
		sb.from('v_parent_time').select('child_id, month, outings_count, avg_rating, top_activities')
	]);

	const homeName = (home: string | null) =>
		parents.data?.find((p) => p.home === home)?.display_name ?? (home ? `Home ${home}` : 'Both');

	const firstChild = children.data?.[0] ?? null;

	// Spending: most recent month that has data.
	const months = [...new Set((spending.data ?? []).map((r) => r.month))].sort().reverse();
	const spendMonth = months[0] ?? null;
	const spendRows = (spending.data ?? [])
		.filter((r) => r.month === spendMonth)
		.map((r) => ({ category: r.category ?? 'other', totalCents: Number(r.total_cents ?? 0) }))
		.sort((a, b) => b.totalCents - a.totalCents);

	// My time: last two months for the first child.
	const timeRows = (myTime.data ?? []).filter((r) => !firstChild || r.child_id === firstChild.id);
	const outings = timeRows.reduce((n, r) => n + (r.outings_count ?? 0), 0);
	const ratings = timeRows.filter((r) => r.avg_rating !== null);
	const avgRating = ratings.length
		? Math.round(
				(ratings.reduce((s, r) => s + Number(r.avg_rating) * (r.outings_count ?? 0), 0) /
					Math.max(
						1,
						ratings.reduce((n, r) => n + (r.outings_count ?? 0), 0)
					)) *
					10
			) / 10
		: null;
	const topActivities = [...new Set(timeRows.flatMap((r) => r.top_activities ?? []))].slice(0, 3);

	return {
		child: firstChild,
		week: (events.data ?? []).map((e) => ({
			id: e.id,
			day: dayFmt.format(new Date(e.starts_at)),
			time: timeFmt.format(new Date(e.starts_at)),
			title: e.title,
			home: e.home ? homeName(e.home) : null
		})),
		insight: insights.data?.find((i) => i.child_id === firstChild?.id) ?? null,
		sharedWishes: (wishes.data ?? [])
			.filter((w) => w.child_id === firstChild?.id)
			.map((w) => w.interest),
		spending: {
			month: spendMonth,
			rows: spendRows,
			totalCents: spendRows.reduce((s, r) => s + r.totalCents, 0)
		},
		myTime: {
			outings,
			avgRating,
			topActivities,
			suggestion: firstChild
				? (await suggestForParent(member.member_id, firstChild.id)).suggestion
				: null
		}
	};
};

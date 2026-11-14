/**
 * /plan/import: upload a parenting-plan PDF, review what the AI found, apply
 * it to the calendar. The work happens in /api/documents/{register,parse,apply}-plan;
 * this load only provides who is who (homes A/B) and the family folder.
 */
import { requireParent } from '#lib/server/guards.js';
import { localDate, safeTimeZone } from '#lib/custody/today.js';
import type { Home } from '#lib/types/domain.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { member } = await requireParent(event);
	event.depends('app:plan-import');
	const tz = safeTimeZone(event.cookies.get('tz'));
	const sb = event.locals.supabase;

	const [parents, schedules] = await Promise.all([
		sb
			.from('members')
			.select('id, display_name, home, user_id')
			.eq('family_id', member.family_id)
			.eq('role', 'parent'),
		sb
			.from('custody_schedules')
			.select('id', { count: 'exact', head: true })
			.eq('family_id', member.family_id)
	]);

	const joined = (parents.data ?? []).filter(
		(p) => p.user_id && (p.home === 'A' || p.home === 'B')
	);
	// One option per home; a co-parent who hasn't joined yet still has a home.
	const homes = (['A', 'B'] as const).map((home) => {
		const p = joined.find((x) => x.home === home);
		const you = home === member.home;
		return {
			home,
			name: you ? 'You' : (p?.display_name ?? 'Co-parent (not joined yet)'),
			displayName: p?.display_name ?? (you ? member.display_name : 'Co-parent')
		};
	});

	return {
		familyId: member.family_id,
		myHome: (member.home === 'A' || member.home === 'B' ? member.home : null) as Home | null,
		homes,
		parentsForGuess: joined.map((p) => ({ home: p.home, display_name: p.display_name })),
		hasSchedule: (schedules.count ?? 0) > 0,
		tz,
		today: localDate(new Date(), tz)
	};
};

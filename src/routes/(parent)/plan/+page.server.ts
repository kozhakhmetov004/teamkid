/**
 * /plan: "Plan my weekend" (the planning itself is POST /api/planner/weekend)
 * and "Add to calendar" for a suggestion the parent chose. Only what the
 * parent picks is stored; place data from OpenStreetMap isn't cached here.
 */
import { z } from 'zod';
import { zonedToUtc } from '#lib/custody/time.js';
import { localDate, safeTimeZone, weekdayLong } from '#lib/custody/today.js';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import { loadPlannerContext } from '#lib/server/plannerContext.js';
import { SlotFields, slotProblem } from '#lib/server/plannerSlot.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { member } = await requireParent(event);
	event.depends('app:plan');
	const tz = safeTimeZone(event.cookies.get('tz'));
	const ctx = await loadPlannerContext(event.locals.supabase, member, tz);
	return {
		tz,
		childName: ctx.child?.firstName ?? null,
		hasWishes: ctx.wishes.length > 0,
		otherParentName: ctx.otherParentName,
		weekends: ctx.weekends.map((w) => ({ saturday: w.saturday, withYou: w.windows.length > 0 }))
	};
};

const Add = z.object({
	title: z.string().trim().min(1).max(200),
	place: z.string().trim().max(200).optional(),
	...SlotFields
});

export const actions: Actions = {
	add: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, Add, 'add');
		if (!parsed.ok) return parsed.failure;
		const v = parsed.data;
		const tz = safeTimeZone(event.cookies.get('tz'));
		// Same rules as the card's live check: one day, 30 min - 8 h, within 2 months.
		const problem = slotProblem(v, localDate(new Date(), tz));
		if (problem) return formFailure('add', problem, 400, { to: problem });

		const sb = event.locals.supabase;
		const { data: child } = await sb
			.from('children')
			.select('id')
			.eq('family_id', member.family_id)
			.order('created_at')
			.limit(1)
			.maybeSingle();
		const { data: created, error } = await sb
			.from('events')
			.insert({
				family_id: member.family_id,
				child_id: child?.id ?? null,
				title: v.title,
				starts_at: zonedToUtc(v.date, v.from, tz).toISOString(),
				ends_at: zonedToUtc(v.date, v.to, tz).toISOString(),
				home: member.home === 'A' || member.home === 'B' ? member.home : null,
				kind: 'activity',
				source: 'planner',
				place: v.place || null,
				created_by: member.member_id
			})
			.select('id')
			.single();
		if (error || !created) return formFailure('add', 'Could not add it to the calendar.', 500);

		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'event.created',
			entity: 'events',
			entityId: created.id,
			meta: { source: 'planner' }
		});
		return { form: 'add', ok: true, message: `Added to ${weekdayLong(v.date)}` };
	}
};

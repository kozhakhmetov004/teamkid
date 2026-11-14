/**
 * Swap request actions, used from Today and the Calendar:
 *   ?/create   request a swap (give a night, optionally take one back)
 *   ?/respond  accept or decline (only via respond_to_swap)
 *   ?/counter  counter-offer (only via counter_swap)
 * With JavaScript the forms stay on their page; without it this page shows
 * the result and a way back.
 */
import { z } from 'zod';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { peopleFor } from '#lib/custody/people.js';
import { safeTimeZone } from '#lib/custody/today.js';
import {
	checkNightOwnership,
	checkSwapDates,
	describeSwap,
	friendlySwapError,
	postScheduleNote,
	todayIn,
	zDate,
	zNote,
	zOptionalDate
} from './swaps.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	await requireParent(event);
	return {};
};

const Create = z.object({ originalDate: zDate, proposedDate: zOptionalDate, note: zNote });
const Respond = z.object({ swapId: z.uuid(), action: z.enum(['accept', 'decline']) });
const Counter = z.object({
	swapId: z.uuid(),
	originalDate: zDate,
	proposedDate: zOptionalDate,
	note: zNote
});

async function parentNames(event: { locals: App.Locals }, familyId: string) {
	const { data } = await event.locals.supabase
		.from('members')
		.select('id, display_name, home')
		.eq('family_id', familyId)
		.eq('role', 'parent');
	return data ?? [];
}

export const actions: Actions = {
	create: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, Create, 'swap');
		if (!parsed.ok) return parsed.failure;
		const { originalDate, proposedDate, note } = parsed.data;
		const tz = safeTimeZone(event.cookies.get('tz'));
		const sb = event.locals.supabase;

		const dateError = checkSwapDates(originalDate, proposedDate, todayIn(tz));
		if (dateError) return formFailure('swap', dateError);
		const parents = await parentNames(event, member.family_id);
		if (parents.length < 2)
			return formFailure('swap', 'Invite your co-parent before requesting swaps.');
		const ownership = await checkNightOwnership(
			sb,
			member.family_id,
			tz,
			member.home,
			originalDate,
			proposedDate
		);
		if (ownership) return formFailure('swap', ownership);

		const { data: child } = await sb
			.from('children')
			.select('id')
			.eq('family_id', member.family_id)
			.order('created_at')
			.limit(1)
			.maybeSingle();
		const { data: swap, error } = await sb
			.from('swap_requests')
			.insert({
				family_id: member.family_id,
				child_id: child?.id ?? null,
				requested_by: member.member_id,
				original_date: originalDate,
				proposed_date: proposedDate ?? null,
				note: note ?? null,
				status: 'pending'
			})
			.select('id')
			.single();
		if (error || !swap)
			return formFailure('swap', 'Could not send the request. Please try again.', 500);

		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'swap.requested',
			entity: 'swap_requests',
			entityId: swap.id
		});
		const people = peopleFor(parents, member);
		await postScheduleNote(
			sb,
			member.family_id,
			member.member_id,
			`📅 ${people.displayName(member.member_id)} requested a swap: ${describeSwap(originalDate, proposedDate)}.${note ? ` Note: ${note}` : ''}`
		);
		return {
			form: 'swap',
			ok: true,
			message: `Swap request sent to ${people.otherName ?? 'your co-parent'}.`
		};
	},

	respond: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, Respond, 'swap');
		if (!parsed.ok) return parsed.failure;
		const tz = safeTimeZone(event.cookies.get('tz'));
		const sb = event.locals.supabase;

		const { data: swap, error } = await sb.rpc('respond_to_swap', {
			p_swap_id: parsed.data.swapId,
			p_action: parsed.data.action,
			p_tz: tz
		});
		if (error || !swap) return formFailure('swap', friendlySwapError(error?.message), 409);

		const people = peopleFor(await parentNames(event, member.family_id), member);
		const verb = parsed.data.action === 'accept' ? 'accepted' : 'declined';
		await postScheduleNote(
			sb,
			member.family_id,
			member.member_id,
			`📅 ${people.displayName(member.member_id)} ${verb} the swap: ${describeSwap(swap.original_date, swap.proposed_date)}.`
		);
		// respond_to_swap writes the audit log row itself (same transaction).
		return {
			form: 'swap',
			ok: true,
			message:
				parsed.data.action === 'accept'
					? 'Swap accepted. The calendar is updated.'
					: 'Swap declined.'
		};
	},

	counter: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, Counter, 'swap');
		if (!parsed.ok) return parsed.failure;
		const { swapId, originalDate, proposedDate, note } = parsed.data;
		const tz = safeTimeZone(event.cookies.get('tz'));
		const sb = event.locals.supabase;

		const dateError = checkSwapDates(originalDate, proposedDate, todayIn(tz));
		if (dateError) return formFailure('swap', dateError);
		const ownership = await checkNightOwnership(
			sb,
			member.family_id,
			tz,
			member.home,
			originalDate,
			proposedDate
		);
		if (ownership) return formFailure('swap', ownership);

		const { data: swap, error } = await sb.rpc('counter_swap', {
			p_swap_id: swapId,
			p_original_date: originalDate,
			p_proposed_date: proposedDate ?? undefined,
			p_note: note ?? undefined
		});
		if (error || !swap) return formFailure('swap', friendlySwapError(error?.message), 409);

		const people = peopleFor(await parentNames(event, member.family_id), member);
		await postScheduleNote(
			sb,
			member.family_id,
			member.member_id,
			`📅 ${people.displayName(member.member_id)} suggested a different swap: ${describeSwap(originalDate, proposedDate)}.${note ? ` Note: ${note}` : ''}`
		);
		// counter_swap writes the audit log row itself (same transaction).
		return {
			form: 'swap',
			ok: true,
			message: `Counter-offer sent to ${people.otherName ?? 'your co-parent'}.`
		};
	}
};

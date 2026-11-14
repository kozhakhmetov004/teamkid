import { redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { logAudit } from '#lib/server/audit.js';
import { requireUser } from '#lib/server/guards.js';
import { supabaseAdmin } from '#lib/server/supabaseAdmin.js';
import { formFailure, parseForm, zName } from '#lib/server/validation.js';
import type { Actions, PageServerLoad } from './$types';

const Token = z
	.string()
	.min(32)
	.max(128)
	.regex(/^[A-Za-z0-9_-]+$/);

export const load: PageServerLoad = async ({ params, locals }) => {
	const token = Token.safeParse(params.token);
	if (!token.success) return { invite: null, signedIn: false, email: null, alreadyMember: false };

	// invite_preview only returns non-secret info for this exact token.
	const { data } = await supabaseAdmin().rpc('invite_preview', { p_token: token.data });
	const invite = data?.[0] ?? null;
	const { user } = await locals.safeGetSession();
	const member = user ? await locals.getMember() : null;
	return {
		invite,
		signedIn: !!user,
		email: user?.email ?? null,
		alreadyMember: !!member
	};
};

const Accept = z.object({ displayName: zName('Your name') });

export const actions: Actions = {
	default: async (event) => {
		await requireUser(event);
		const token = Token.safeParse(event.params.token);
		if (!token.success) return formFailure('accept', 'This invite link is not valid.', 400);
		const parsed = await parseForm(event.request, Accept, 'accept');
		if (!parsed.ok) return parsed.failure;

		const { data, error } = await event.locals.supabase.rpc('accept_invite', {
			p_token: token.data,
			p_display_name: parsed.data.displayName
		});
		const row = data?.[0];
		if (error || !row)
			return formFailure('accept', error?.message ?? 'Could not accept the invite', 400);

		await logAudit({
			familyId: row.family_id,
			actorMemberId: row.member_id,
			action: 'invite.accepted',
			entity: 'members',
			entityId: row.member_id
		});
		redirect(303, '/family');
	}
};

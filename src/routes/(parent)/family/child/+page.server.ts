/**
 * /family/child: the child's profile, editable by both parents (owner: Member 2).
 * Birthday and parent-noted interests feed the weekly wish cards. The name and
 * birthday live on children/members, which only the server may update (service
 * role, after checking the child belongs to this parent's family).
 */
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { birthdayProblem, parseList } from '#lib/kids/profile.js';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import { rebuildWeeklyInsight } from '#lib/server/insights/build.js';
import { supabaseAdmin } from '#lib/server/supabaseAdmin.js';
import { formFailure, parseForm, zName } from '#lib/server/validation.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { member } = await requireParent(event);
	const sb = event.locals.supabase;
	const { data: child } = await sb
		.from('children')
		.select('id, first_name, birth_year')
		.eq('family_id', member.family_id)
		.order('created_at')
		.limit(1)
		.maybeSingle();
	if (!child) return { child: null, profile: null, updatedBy: null };

	const { data: profile } = await sb
		.from('child_profiles')
		.select('birthday, grade, interests, dislikes, notes, updated_by, updated_at')
		.eq('child_id', child.id)
		.maybeSingle();
	let updatedBy: string | null = null;
	if (profile?.updated_by) {
		const { data: who } = await sb
			.from('members')
			.select('display_name')
			.eq('id', profile.updated_by)
			.maybeSingle();
		updatedBy = who?.display_name ?? null;
	}
	return { child, profile, updatedBy };
};

const Profile = z.object({
	firstName: zName('Name', 40),
	birthday: z
		.string()
		.trim()
		.superRefine((v, ctx) => {
			const problem = v ? birthdayProblem(v, new Date().toISOString().slice(0, 10)) : null;
			if (problem) ctx.addIssue({ code: 'custom', message: problem });
		}),
	grade: z.string().trim().max(30, 'Keep it short'),
	interests: z.string().max(800),
	dislikes: z.string().max(800),
	notes: z.string().trim().max(600, 'Keep notes under 600 characters')
});

export const actions: Actions = {
	save: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, Profile, 'profile');
		if (!parsed.ok) return parsed.failure;
		const v = parsed.data;

		const sb = event.locals.supabase;
		const { data: child } = await sb
			.from('children')
			.select('id, member_id, family_id, first_name, birth_year')
			.eq('family_id', member.family_id)
			.order('created_at')
			.limit(1)
			.maybeSingle();
		if (!child || child.family_id !== member.family_id) error(404, 'No child in this family');

		const { error: upsertError } = await sb.from('child_profiles').upsert(
			{
				child_id: child.id,
				family_id: member.family_id, // re-derived from child_id by the DB trigger
				birthday: v.birthday || null,
				grade: v.grade || null,
				interests: parseList(v.interests),
				dislikes: parseList(v.dislikes),
				notes: v.notes || null,
				updated_by: member.member_id,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'child_id' }
		);
		if (upsertError) return formFailure('profile', 'Could not save the profile.', 500);

		// Name / birth year: server only (no user update policy on children).
		const birthYear = v.birthday ? Number(v.birthday.slice(0, 4)) : child.birth_year;
		if (v.firstName !== child.first_name || birthYear !== child.birth_year) {
			const admin = supabaseAdmin();
			const [c, m] = await Promise.all([
				admin
					.from('children')
					.update({ first_name: v.firstName, birth_year: birthYear })
					.eq('id', child.id)
					.eq('family_id', member.family_id),
				admin
					.from('members')
					.update({ display_name: v.firstName })
					.eq('id', child.member_id)
					.eq('family_id', member.family_id)
			]);
			if (c.error || m.error)
				return formFailure('profile', 'Saved, but the name didn’t update.', 500);
		}

		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'child_profile.updated',
			entity: 'child_profiles',
			entityId: child.id
		});

		// Refresh the "<child>'s week" AI line (it uses parent-noted interests).
		// Today's unanswered wish cards refresh via the DB trigger on child_profiles.
		try {
			await rebuildWeeklyInsight(child.id, new Date(), supabaseAdmin());
		} catch (err) {
			console.error('insight rebuild failed', err instanceof Error ? err.message : 'unknown');
		}
		return { form: 'profile', ok: true };
	}
};

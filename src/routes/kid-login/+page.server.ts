import { redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { serverEnv } from '#lib/server/env.js';
import {
	authenticateKid,
	deriveKidPassword,
	FamilyCodeSchema,
	kidEmail,
	supabaseAttemptStore,
	supabaseKidDirectory
} from '#lib/server/kidAuth.js';
import { supabaseAdmin } from '#lib/server/supabaseAdmin.js';
import { formFailure } from '#lib/server/validation.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const member = await locals.getMember();
	if (member?.role === 'child' && member.child_status === 'active') redirect(303, '/pebble');
	return { reason: url.searchParams.get('reason') };
};

const KidLogin = z.object({
	familyCode: FamilyCodeSchema,
	pin: z.string().regex(/^\d{4,6}$/)
});

const MESSAGES = {
	invalid: "Hmm, that code or PIN didn't work. Let's try again!",
	rate_limited: 'Too many tries! Take a little break and ask a grown-up for help.',
	pending_consent: 'Almost there! Ask both grown-ups to say yes first.',
	disabled: 'Your account is taking a nap. Ask a grown-up for help.'
} as const;

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const parsed = KidLogin.safeParse({
			familyCode: String(formData.get('familyCode') ?? ''),
			pin: String(formData.get('pin') ?? '')
		});
		const familyCodeValue = String(formData.get('familyCode') ?? '').toUpperCase();
		if (!parsed.success) {
			return formFailure('kidLogin', MESSAGES.invalid, 400, {}, { familyCode: familyCodeValue });
		}

		const admin = supabaseAdmin();
		const result = await authenticateKid({
			familyCode: parsed.data.familyCode,
			pin: parsed.data.pin,
			directory: supabaseKidDirectory(admin),
			attempts: supabaseAttemptStore(admin)
		});
		if (!result.ok) {
			const status =
				result.reason === 'rate_limited' ? 429 : result.reason === 'invalid' ? 400 : 403;
			return formFailure(
				'kidLogin',
				MESSAGES[result.reason],
				status,
				{},
				{ familyCode: parsed.data.familyCode }
			);
		}

		// Sign in as the hidden kid user through the SSR client => session cookie is set.
		const { error } = await locals.supabase.auth.signInWithPassword({
			email: kidEmail(result.childId),
			password: deriveKidPassword(serverEnv.kidAuthSecret, result.childId)
		});
		if (error) {
			console.error('kid sign-in failed:', error.message);
			return formFailure('kidLogin', 'Something went wrong. Ask a grown-up for help.', 500);
		}
		redirect(303, '/pebble');
	}
};

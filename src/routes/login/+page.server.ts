import { redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { postLoginPath } from '#lib/server/authRedirect.js';
import { formFailure, parseForm, safeNext, zEmail } from '#lib/server/validation.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (user) redirect(303, await postLoginPath(locals.supabase, url.searchParams.get('next')));
	return { next: safeNext(url.searchParams.get('next')), error: url.searchParams.get('error') };
};

const Password = z.object({
	email: zEmail,
	password: z.string().min(1, 'Enter your password'),
	next: z.string().optional()
});
const Magic = z.object({ email: zEmail, next: z.string().optional() });

export const actions: Actions = {
	password: async ({ request, locals }) => {
		const parsed = await parseForm(request, Password, 'password');
		if (!parsed.ok) return parsed.failure;
		const { error } = await locals.supabase.auth.signInWithPassword({
			email: parsed.data.email,
			password: parsed.data.password
		});
		if (error) {
			return formFailure(
				'password',
				'Email or password is incorrect.',
				400,
				{},
				{ email: parsed.data.email }
			);
		}
		redirect(303, await postLoginPath(locals.supabase, parsed.data.next));
	},

	magic: async ({ request, locals, url }) => {
		const parsed = await parseForm(request, Magic, 'magic');
		if (!parsed.ok) return parsed.failure;
		const callback = new URL('/auth/callback', url.origin);
		const next = safeNext(parsed.data.next);
		if (next) callback.searchParams.set('next', next);

		const { error } = await locals.supabase.auth.signInWithOtp({
			email: parsed.data.email,
			options: { emailRedirectTo: callback.toString(), shouldCreateUser: true }
		});
		if (error) {
			return formFailure(
				'magic',
				'We could not send the link. Please try again in a minute.',
				400,
				{},
				{ email: parsed.data.email }
			);
		}
		return { form: 'magic', sentTo: parsed.data.email };
	}
};

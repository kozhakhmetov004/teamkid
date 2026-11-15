import { redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { postLoginPath } from '#lib/server/authRedirect.js';
import { createRateLimiter } from '#lib/server/rateLimit.js';
import { supabaseAdmin } from '#lib/server/supabaseAdmin.js';
import { formFailure, parseForm, safeNext, zEmail } from '#lib/server/validation.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * Parent sign-in and sign-up with email + password. No emails are sent:
 * new accounts are created already confirmed (prototype / judging: the hosted
 * Supabase project only allows a couple of auth emails per hour, so magic links
 * and confirmation emails would lock people out).
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (user) redirect(303, await postLoginPath(locals.supabase, url.searchParams.get('next')));
	const next = safeNext(url.searchParams.get('next'));
	return {
		next,
		error: url.searchParams.get('error'),
		// "Start free" links and co-parent invites open the Create account tab
		startOn:
			url.searchParams.get('mode') === 'register' || next?.startsWith('/invite/')
				? ('register' as const)
				: ('signin' as const)
	};
};

/** Keep in sync with the hint on the page. */
const PASSWORD_MIN = 8;

const SignIn = z.object({
	email: zEmail,
	password: z.string().min(1, 'Enter your password'),
	next: z.string().optional()
});
const SignUp = z.object({
	email: zEmail,
	password: z
		.string()
		.min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
		.max(72, 'That password is too long'),
	next: z.string().optional()
});

// Admin-created users skip Supabase's own sign-up limits, so limit per IP here.
const signUpLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

export const actions: Actions = {
	password: async ({ request, locals }) => {
		const parsed = await parseForm(request, SignIn, 'password');
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

	/** Create a parent account (already confirmed, no email) and sign straight in. */
	register: async ({ request, locals, getClientAddress }) => {
		const parsed = await parseForm(request, SignUp, 'register');
		if (!parsed.ok) return parsed.failure;
		const { email, password, next } = parsed.data;

		if (!signUpLimiter.check(getClientAddress()).ok) {
			return formFailure(
				'register',
				'Too many new accounts from here. Please try again later.',
				429,
				{},
				{ email }
			);
		}

		const { error: createError } = await supabaseAdmin().auth.admin.createUser({
			email,
			password,
			email_confirm: true
		});
		if (createError) {
			const exists =
				createError.code === 'email_exists' ||
				/already (been )?registered/i.test(createError.message);
			return formFailure(
				'register',
				exists
					? 'An account with this email already exists. Sign in instead.'
					: 'We could not create your account. Please try again.',
				exists ? 409 : 400,
				{},
				{ email }
			);
		}

		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) {
			console.error('sign-in after sign-up failed:', error.message);
			return formFailure('password', 'Your account is ready. Please sign in.', 400, {}, { email });
		}
		// New parents land on onboarding (or back on the invite they came from).
		redirect(303, await postLoginPath(locals.supabase, next));
	}
};

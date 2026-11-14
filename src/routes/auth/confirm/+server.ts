/**
 * token_hash flow (used when the email template links to
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard
 * which works even if the link is opened in a different browser than the one
 * that requested it, unlike the PKCE /auth/callback flow).
 */
import { redirect } from '@sveltejs/kit';
import type { EmailOtpType } from '@supabase/supabase-js';
import { postLoginPath } from '#lib/server/authRedirect.js';
import type { RequestHandler } from './$types';

const OTP_TYPES: EmailOtpType[] = [
	'email',
	'magiclink',
	'signup',
	'invite',
	'recovery',
	'email_change'
];

export const GET: RequestHandler = async ({ url, locals }) => {
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as EmailOtpType | null;
	if (tokenHash && type && OTP_TYPES.includes(type)) {
		const { error } = await locals.supabase.auth.verifyOtp({ token_hash: tokenHash, type });
		if (!error) redirect(303, await postLoginPath(locals.supabase, url.searchParams.get('next')));
	}
	redirect(303, '/login?error=link');
};

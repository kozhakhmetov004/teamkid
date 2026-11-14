/**
 * OAuth/magic-link PKCE callback: exchanges ?code= for a session cookie, then
 * sends the user to `next` (validated) or their role's home
 * (/onboarding if they have no family yet, /dashboard, or /pebble).
 */
import { redirect } from '@sveltejs/kit';
import { postLoginPath } from '#lib/server/authRedirect.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, await postLoginPath(locals.supabase, url.searchParams.get('next')));
	}
	redirect(303, '/login?error=link');
};

import type { LayoutServerLoad } from './$types';

/**
 * Only non-secret auth info goes to the page data; tokens stay in the auth
 * cookies managed by @supabase/ssr and are never serialized into the HTML.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	const member = session ? await locals.getMember() : null;
	return {
		signedIn: session !== null,
		sessionExpiresAt: session?.expires_at ?? null,
		member
	};
};

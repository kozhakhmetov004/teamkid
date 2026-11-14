/**
 * Public landing page (SSR, no prerender). Signed-in users can see it too;
 * the header and hero then show "Open TeamKid" linking to their home.
 * No redirect, no data queries beyond the (cached) session.
 */
import { homePathFor } from '#lib/types/domain.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	const member = session ? await locals.getMember() : null;
	return {
		signedIn: session !== null,
		homePath: homePathFor(member),
		origin: url.origin
	};
};

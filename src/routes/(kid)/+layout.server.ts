import { requireChild } from '#lib/server/guards.js';
import type { LayoutServerLoad } from './$types';

/**
 * Guards every page in (kid). Parents are redirected to /dashboard; signed-out
 * users to /kid-login. Page loads in this group call requireChild too
 * (they run in parallel with this layout load).
 */
export const load: LayoutServerLoad = async (event) => {
	const { member, childId } = await requireChild(event);
	return { kid: { childId, firstName: member.display_name } };
};

import { requireParent } from '#lib/server/guards.js';
import type { LayoutServerLoad } from './$types';

/**
 * Guards every page in (parent). Children are redirected to /pebble, users
 * without a family to /onboarding. NOTE: page loads run in parallel with this
 * layout load, so every +page.server.ts in this group calls requireParent too.
 */
export const load: LayoutServerLoad = async (event) => {
	const { member } = await requireParent(event);
	return { parent: member };
};

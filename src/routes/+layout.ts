import type { LayoutLoad } from './$types';

/**
 * Re-runs when `invalidate('supabase:auth')` is called (see +layout.svelte),
 * so auth and membership data refresh after sign in / sign out.
 */
export const load: LayoutLoad = async ({ data, depends }) => {
	depends('supabase:auth');
	return data;
};

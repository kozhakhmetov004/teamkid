import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** POST only (a GET link could be triggered by prefetching or a third-party page). */
export const POST: RequestHandler = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	redirect(303, '/');
};

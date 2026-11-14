import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.js';
import { homePathFor, type Membership } from '#lib/types/domain.js';
import { safeNext } from './validation.js';

/**
 * Where to send a user right after they sign in: the validated `next` path if
 * given, otherwise their role's home (/dashboard, /pebble or /onboarding).
 * Uses the client that just signed in (memberships cached in locals were
 * computed before the sign-in and would be stale).
 */
export async function postLoginPath(
	supabase: SupabaseClient<Database>,
	next: string | null | undefined
): Promise<string> {
	const { data } = await supabase.rpc('my_memberships');
	const memberships = (data ?? []) as Membership[];
	const home = homePathFor(memberships[0]);
	const target = safeNext(next);
	if (!target) return home;
	// A child is never sent into parent pages (and vice versa the guards handle it).
	if (memberships[0]?.role === 'child' && !target.startsWith('/pebble')) return home;
	return target;
}

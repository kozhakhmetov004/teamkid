/**
 * Browser Supabase client factory (anon key; every query is protected by RLS).
 * Server code uses `event.locals.supabase` (created in hooks.server.ts) instead.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$app/env/public';
import type { Database } from '#lib/types/database.js';

export type TypedSupabaseClient = SupabaseClient<Database>;

let browserClient: TypedSupabaseClient | undefined;

/** Singleton browser client. Session cookies are shared with the server. */
export function getSupabaseBrowserClient(): TypedSupabaseClient {
	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
		throw new Error('PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY are not set');
	}
	browserClient ??= createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	return browserClient;
}

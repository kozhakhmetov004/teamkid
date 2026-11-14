/**
 * Service-role Supabase client. BYPASSES RLS. Server only.
 *
 * Use it only after the caller has been verified with a guard, and only for
 * things RLS deliberately doesn't allow users to do: creating the hidden kid
 * auth user, writing audit_log / weekly_insights / safety_alerts, Stripe
 * webhooks, cron jobs.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.js';
import { serverEnv } from './env.js';

let client: SupabaseClient<Database> | undefined;

export function supabaseAdmin(): SupabaseClient<Database> {
	client ??= createClient<Database>(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
	});
	return client;
}

/** Env + clients for Node scripts (seed, RLS test). Loaded with `tsx --env-file=.env`. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/types/database.js';

function must(name: string): string {
	const value = process.env[name];
	if (!value) {
		console.error(`Missing ${name}. Create .env (pnpm env:local for local Supabase).`);
		process.exit(1);
	}
	return value;
}

export const SUPABASE_URL = must('PUBLIC_SUPABASE_URL');
export const ANON_KEY = must('PUBLIC_SUPABASE_ANON_KEY');
export const SERVICE_ROLE_KEY = must('SUPABASE_SERVICE_ROLE_KEY');
export const KID_AUTH_SECRET = must('KID_AUTH_SECRET');

const noPersist = {
	auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
};

export function adminClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, noPersist);
}

/** A fresh anon client (sign in on it to act as a user; RLS applies). */
export function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, noPersist);
}

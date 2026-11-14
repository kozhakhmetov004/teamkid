// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.js';
import type { Membership } from '#lib/types/domain.js';

declare global {
	namespace App {
		interface Error {
			message: string;
			/** Stable machine-readable code, e.g. 'forbidden', 'not_found'. */
			code?: string;
		}
		interface Locals {
			/** Per-request Supabase client acting as the signed-in user (RLS applies). */
			supabase: SupabaseClient<Database>;
			/** Session validated with `auth.getUser()`. Cached per request. */
			safeGetSession(): Promise<{ session: Session | null; user: User | null }>;
			/** All memberships of the signed-in user (lazy, cached per request). */
			getMemberships(): Promise<Membership[]>;
			/** The primary membership (first family), or null. Lazy, cached per request. */
			getMember(): Promise<Membership | null>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

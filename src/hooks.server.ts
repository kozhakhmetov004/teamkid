import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit/hooks';
import { serverEnv } from '#lib/server/env.js';
import type { Database } from '#lib/types/database.js';
import type { Membership } from '#lib/types/domain.js';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createServerClient<Database>(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				for (const { name, value, options } of cookiesToSet) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
			}
		}
	});
	event.locals.supabase = supabase;

	// --- Session (validated against Supabase Auth, cached per request) ---
	let sessionPromise: ReturnType<App.Locals['safeGetSession']> | undefined;
	event.locals.safeGetSession = () => {
		sessionPromise ??= (async () => {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session) return { session: null, user: null };
			// getSession() reads the cookie without verifying it; getUser() asks Supabase Auth.
			const {
				data: { user },
				error
			} = await supabase.auth.getUser();
			if (error || !user) return { session: null, user: null };
			return { session, user };
		})();
		return sessionPromise;
	};

	// --- Memberships (lazy, cached per request) ---
	let membershipsPromise: Promise<Membership[]> | undefined;
	event.locals.getMemberships = () => {
		membershipsPromise ??= (async () => {
			const { user } = await event.locals.safeGetSession();
			if (!user) return [];
			const { data, error } = await supabase.rpc('my_memberships');
			if (error) throw new Error(`Could not load memberships: ${error.message}`);
			return (data ?? []) as Membership[];
		})();
		return membershipsPromise;
	};
	event.locals.getMember = async () => (await event.locals.getMemberships())[0] ?? null;

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});

	// Small, safe hardening headers (no third-party scripts anywhere: COPPA).
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	return response;
};

/**
 * Route guards. Call them at the top of `load`, form actions and `+server.ts`
 * handlers. They take the request event (or `{ locals, url }`) so they can
 * answer differently for pages and APIs:
 *
 * - pages:  redirect(303, …) to login / the user's own home
 * - /api/*: error(401) when signed out, error(403) when the role is wrong
 */
import { error, redirect } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';
import { homePathFor, type Membership } from '#lib/types/domain.js';

export interface GuardEvent {
	locals: Pick<App.Locals, 'safeGetSession' | 'getMemberships'>;
	url: URL;
}

const isApi = (url: URL) => url.pathname === '/api' || url.pathname.startsWith('/api/');

function unauthenticated(event: GuardEvent, loginPath = '/login'): never {
	if (isApi(event.url)) error(401, { message: 'Sign in required', code: 'unauthenticated' });
	const next = event.url.pathname + event.url.search;
	redirect(303, `${loginPath}?next=${encodeURIComponent(next)}`);
}

function forbidden(event: GuardEvent, home: string, message = 'Not allowed'): never {
	if (isApi(event.url)) error(403, { message, code: 'forbidden' });
	redirect(303, home);
}

/** Any signed-in user (parent, child, or a parent who hasn't created a family yet). */
export async function requireUser(event: GuardEvent): Promise<User> {
	const { user } = await event.locals.safeGetSession();
	if (!user) unauthenticated(event);
	return user;
}

/**
 * A signed-in parent. With `familyId`, the parent must belong to that family.
 * Children are sent to /pebble; users without a family to /onboarding.
 */
export async function requireParent(
	event: GuardEvent,
	familyId?: string
): Promise<{ user: User; member: Membership }> {
	const user = await requireUser(event);
	const memberships = await event.locals.getMemberships();
	const parents = memberships.filter((m) => m.role === 'parent');

	if (parents.length === 0) {
		const child = memberships.find((m) => m.role === 'child');
		if (child) forbidden(event, homePathFor(child), 'Parents only');
		forbidden(event, '/onboarding', 'Create or join a family first');
	}
	const member = familyId ? parents.find((m) => m.family_id === familyId) : parents[0];
	if (!member) forbidden(event, '/dashboard', 'Not a parent in this family');
	return { user, member };
}

/** A signed-in child whose account is active. Parents are sent to /dashboard. */
export async function requireChild(
	event: GuardEvent
): Promise<{ user: User; member: Membership; childId: string }> {
	const { user } = await event.locals.safeGetSession();
	if (!user) unauthenticated(event, '/kid-login');
	const memberships = await event.locals.getMemberships();
	const member = memberships.find((m) => m.role === 'child');

	if (!member || !member.child_id) {
		forbidden(event, homePathFor(memberships[0]), 'Kids only');
	}
	if (member.child_status !== 'active') {
		forbidden(event, '/kid-login?reason=inactive', 'This account is not active');
	}
	return { user, member, childId: member.child_id };
}

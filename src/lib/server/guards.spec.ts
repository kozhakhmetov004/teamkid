import { isHttpError, isRedirect } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import type { Membership } from '#lib/types/domain.js';
import { requireChild, requireParent, requireUser, type GuardEvent } from './guards.js';

const user = { id: 'u1', email: 'mom@example.com' } as User;

const parent: Membership = {
	member_id: 'm1',
	family_id: 'f1',
	family_name: 'Carter family',
	family_code: 'TURTLE-1234',
	role: 'parent',
	display_name: 'Mom',
	home: 'A',
	child_id: null,
	child_status: null
};
const child: Membership = {
	...parent,
	member_id: 'm3',
	family_code: null,
	role: 'child',
	display_name: 'Lily',
	home: null,
	child_id: 'c1',
	child_status: 'active'
};

function event(path: string, signedIn: boolean, memberships: Membership[] = []): GuardEvent {
	return {
		url: new URL(`http://localhost${path}`),
		locals: {
			safeGetSession: async () => ({ session: null, user: signedIn ? user : null }),
			getMemberships: async () => memberships
		}
	};
}

async function thrown(fn: () => Promise<unknown>): Promise<unknown> {
	try {
		await fn();
	} catch (e) {
		return e;
	}
	throw new Error('expected the guard to throw');
}

describe('requireUser', () => {
	it('redirects signed-out page requests to /login with next', async () => {
		const e = await thrown(() => requireUser(event('/family?x=1', false)));
		expect(isRedirect(e) && e.status === 303 && e.location).toBe('/login?next=%2Ffamily%3Fx%3D1');
	});

	it('returns 401 for signed-out API requests', async () => {
		const e = await thrown(() => requireUser(event('/api/ai/rewrite', false)));
		expect(isHttpError(e) && e.status).toBe(401);
	});

	it('returns the user when signed in', async () => {
		await expect(requireUser(event('/onboarding', true))).resolves.toBe(user);
	});
});

describe('requireParent', () => {
	it('lets a parent through', async () => {
		const res = await requireParent(event('/dashboard', true, [parent]));
		expect(res.member.member_id).toBe('m1');
	});

	it('redirects a child to /pebble on pages', async () => {
		const e = await thrown(() => requireParent(event('/dashboard', true, [child])));
		expect(isRedirect(e) && e.location).toBe('/pebble');
	});

	it('returns 403 for a child on API routes', async () => {
		const e = await thrown(() => requireParent(event('/api/ai/rewrite', true, [child])));
		expect(isHttpError(e) && e.status).toBe(403);
	});

	it('sends users without a family to /onboarding', async () => {
		const e = await thrown(() => requireParent(event('/dashboard', true, [])));
		expect(isRedirect(e) && e.location).toBe('/onboarding');
	});

	it('rejects a parent of another family when familyId is given', async () => {
		const e = await thrown(() => requireParent(event('/api/x', true, [parent]), 'other-family'));
		expect(isHttpError(e) && e.status).toBe(403);
	});
});

describe('requireChild', () => {
	it('lets an active child through', async () => {
		const res = await requireChild(event('/pebble', true, [child]));
		expect(res.childId).toBe('c1');
	});

	it('redirects a parent to /dashboard', async () => {
		const e = await thrown(() => requireChild(event('/pebble', true, [parent])));
		expect(isRedirect(e) && e.location).toBe('/dashboard');
	});

	it('redirects signed-out kids to /kid-login', async () => {
		const e = await thrown(() => requireChild(event('/pebble', false)));
		expect(isRedirect(e) && e.location).toBe('/kid-login?next=%2Fpebble');
	});

	it('blocks a child whose account is not active', async () => {
		const pending = { ...child, child_status: 'pending_consent' as const };
		const e = await thrown(() => requireChild(event('/pebble', true, [pending])));
		expect(isRedirect(e) && e.location).toBe('/kid-login?reason=inactive');
	});
});

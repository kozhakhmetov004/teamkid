/**
 * POST /api/billing/checkout (parent only): start a Stripe Checkout session
 * for Family Plus (TEST MODE).
 *   -> 200 { url } | 409 { error: 'already_subscribed' }
 *   | 503 { error: 'billing_not_configured' | 'billing_unavailable' } | 429
 */
import { json } from '@sveltejs/kit';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import { createRateLimiter } from '#lib/server/rateLimit.js';
import { createCheckoutSession, stripeConfigured } from '#lib/server/stripe.js';
import { isActiveStatus } from '#lib/server/stripeCore.js';
import type { RequestHandler } from './$types';

const limiter = createRateLimiter({ limit: 10, windowMs: 60 * 60_000 });
const headers = { 'cache-control': 'no-store' };

export const POST: RequestHandler = async (event) => {
	const { user, member } = await requireParent(event);
	if (!stripeConfigured()) {
		return json({ error: 'billing_not_configured' }, { status: 503, headers });
	}
	if (!limiter.check(user.id).ok) return json({ error: 'rate_limited' }, { status: 429, headers });

	const { data: sub } = await event.locals.supabase
		.from('subscriptions')
		.select('status, stripe_customer_id')
		.eq('user_id', user.id)
		.maybeSingle();
	if (isActiveStatus(sub?.status)) {
		return json({ error: 'already_subscribed' }, { status: 409, headers });
	}

	try {
		const { url } = await createCheckoutSession({
			userId: user.id,
			familyId: member.family_id,
			email: user.email,
			customerId: sub?.stripe_customer_id ?? null,
			origin: event.url.origin
		});
		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'billing.checkout_started',
			entity: 'subscriptions'
		});
		return json({ url }, { headers });
	} catch {
		return json({ error: 'billing_unavailable' }, { status: 503, headers });
	}
};

/**
 * POST /api/billing/webhook (Stripe only): verify the signature on the RAW
 * body, then upsert `subscriptions` with the service role (users have no
 * write policy on it).
 *   -> 200 { received: true } | 400 { error: 'bad_signature' } | 503 (not configured)
 * Local: `stripe listen --forward-to localhost:5173/api/billing/webhook`.
 */
import { json } from '@sveltejs/kit';
import { serverEnv } from '#lib/server/env.js';
import { logAudit } from '#lib/server/audit.js';
import { supabaseAdmin } from '#lib/server/supabaseAdmin.js';
import {
	PLAN_FAMILY_PLUS,
	subscriptionPatchFromEvent,
	verifyStripeSignature
} from '#lib/server/stripeCore.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const secret = serverEnv.stripe.webhookSecret;
	if (!secret) return json({ error: 'billing_not_configured' }, { status: 503 });

	const payload = await request.text();
	if (!verifyStripeSignature(payload, request.headers.get('stripe-signature'), secret)) {
		return json({ error: 'bad_signature' }, { status: 400 });
	}

	let event: unknown;
	try {
		event = JSON.parse(payload);
	} catch {
		return json({ error: 'bad_payload' }, { status: 400 });
	}
	const patch = subscriptionPatchFromEvent(event);
	if (!patch) return json({ received: true }); // events we don't use

	const db = supabaseAdmin();
	const fields = {
		status: patch.status,
		plan: PLAN_FAMILY_PLUS,
		updated_at: new Date().toISOString(),
		...(patch.stripeCustomerId ? { stripe_customer_id: patch.stripeCustomerId } : {}),
		...(patch.stripeSubscriptionId ? { stripe_subscription_id: patch.stripeSubscriptionId } : {}),
		...(patch.currentPeriodEnd ? { current_period_end: patch.currentPeriodEnd } : {}),
		...(patch.familyId ? { family_id: patch.familyId } : {})
	};

	const { error } = patch.userId
		? await db
				.from('subscriptions')
				.upsert({ user_id: patch.userId, ...fields }, { onConflict: 'user_id' })
		: patch.stripeSubscriptionId
			? await db
					.from('subscriptions')
					.update(fields)
					.eq('stripe_subscription_id', patch.stripeSubscriptionId)
			: { error: null };
	// 500 makes Stripe retry later.
	if (error) return json({ error: 'save_failed' }, { status: 500 });

	if (patch.familyId) {
		await logAudit({
			familyId: patch.familyId,
			actorMemberId: null,
			action: `billing.${patch.status}`,
			entity: 'subscriptions'
		});
	}
	return json({ received: true });
};

/**
 * Stripe (TEST MODE for the demo) over its REST API with fetch, no SDK.
 * Config: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_FAMILY_PLUS, STRIPE_WEBHOOK_SECRET.
 * Refuses live keys (sk_live_) so the demo can never charge a real card.
 */
import { serverEnv } from './env.js';
import { formEncode, PLAN_FAMILY_PLUS } from './stripeCore.js';

export class StripeNotConfiguredError extends Error {
	constructor() {
		super('Stripe is not configured');
		this.name = 'StripeNotConfiguredError';
	}
}

export function stripeConfigured(): boolean {
	const { secretKey, priceIdFamilyPlus } = serverEnv.stripe;
	return !!secretKey && secretKey.startsWith('sk_test_') && !!priceIdFamilyPlus;
}

export async function createCheckoutSession(opts: {
	userId: string;
	familyId: string;
	email: string | undefined;
	customerId: string | null;
	origin: string;
}): Promise<{ url: string }> {
	const { secretKey, priceIdFamilyPlus } = serverEnv.stripe;
	if (!stripeConfigured() || !secretKey || !priceIdFamilyPlus) throw new StripeNotConfiguredError();

	const metadata = { user_id: opts.userId, family_id: opts.familyId, plan: PLAN_FAMILY_PLUS };
	const body = formEncode({
		mode: 'subscription',
		line_items: [{ price: priceIdFamilyPlus, quantity: 1 }],
		client_reference_id: opts.userId,
		customer: opts.customerId ?? undefined,
		customer_email: opts.customerId ? undefined : opts.email,
		success_url: `${opts.origin}/billing?checkout=success`,
		cancel_url: `${opts.origin}/billing?checkout=cancelled`,
		allow_promotion_codes: true,
		metadata,
		subscription_data: { metadata }
	});

	const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${secretKey}`,
			'content-type': 'application/x-www-form-urlencoded'
		},
		body,
		signal: AbortSignal.timeout(10_000)
	});
	const data = (await res.json().catch(() => null)) as { url?: string } | null;
	if (!res.ok || !data?.url) {
		console.error('[stripe] checkout failed', res.status); // status only, never the body
		throw new Error('Stripe checkout failed');
	}
	return { url: data.url };
}

import { describe, expect, it } from 'vitest';
import {
	formEncode,
	isActiveStatus,
	signStripePayload,
	subscriptionPatchFromEvent,
	verifyStripeSignature
} from './stripeCore';

const secret = 'whsec_test_secret';
const payload = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' });
const now = 1_800_000_000;

describe('formEncode', () => {
	it('uses Stripe bracket notation and skips empty values', () => {
		expect(
			formEncode({
				mode: 'subscription',
				line_items: [{ price: 'price_1', quantity: 1 }],
				metadata: { user_id: 'u 1' },
				customer: undefined
			})
		).toBe(
			'mode=subscription&line_items%5B0%5D%5Bprice%5D=price_1&line_items%5B0%5D%5Bquantity%5D=1&metadata%5Buser_id%5D=u%201'
		);
	});
});

describe('verifyStripeSignature', () => {
	it('accepts a valid signature', () => {
		const header = signStripePayload(payload, secret, now);
		expect(verifyStripeSignature(payload, header, secret, now)).toBe(true);
	});

	it('rejects a changed body, a wrong secret, or a missing header', () => {
		const header = signStripePayload(payload, secret, now);
		expect(verifyStripeSignature(payload + ' ', header, secret, now)).toBe(false);
		expect(verifyStripeSignature(payload, header, 'whsec_other', now)).toBe(false);
		expect(verifyStripeSignature(payload, null, secret, now)).toBe(false);
		expect(verifyStripeSignature(payload, 't=abc,v1=zz', secret, now)).toBe(false);
	});

	it('rejects old timestamps (replay)', () => {
		const header = signStripePayload(payload, secret, now - 301);
		expect(verifyStripeSignature(payload, header, secret, now)).toBe(false);
	});
});

describe('subscriptionPatchFromEvent', () => {
	it('maps a completed checkout to an active subscription', () => {
		const patch = subscriptionPatchFromEvent({
			type: 'checkout.session.completed',
			data: {
				object: {
					mode: 'subscription',
					client_reference_id: 'user-1',
					customer: 'cus_1',
					subscription: 'sub_1',
					payment_status: 'paid',
					metadata: { family_id: 'fam-1' }
				}
			}
		});
		expect(patch).toEqual({
			userId: 'user-1',
			familyId: 'fam-1',
			stripeCustomerId: 'cus_1',
			stripeSubscriptionId: 'sub_1',
			status: 'active',
			currentPeriodEnd: null
		});
	});

	it('maps subscription updates and deletes with the period end', () => {
		const sub = {
			id: 'sub_1',
			customer: 'cus_1',
			status: 'active',
			metadata: { user_id: 'user-1' },
			items: { data: [{ current_period_end: 1_800_000_000 }] }
		};
		expect(
			subscriptionPatchFromEvent({ type: 'customer.subscription.updated', data: { object: sub } })
		).toMatchObject({
			status: 'active',
			currentPeriodEnd: new Date(1_800_000_000_000).toISOString()
		});
		expect(
			subscriptionPatchFromEvent({ type: 'customer.subscription.deleted', data: { object: sub } })
				?.status
		).toBe('canceled');
	});

	it('ignores other events and one-off payments', () => {
		expect(subscriptionPatchFromEvent({ type: 'invoice.paid', data: { object: {} } })).toBeNull();
		expect(
			subscriptionPatchFromEvent({
				type: 'checkout.session.completed',
				data: { object: { mode: 'payment' } }
			})
		).toBeNull();
	});
});

describe('isActiveStatus', () => {
	it('unlocks only active or trialing', () => {
		expect(isActiveStatus('active')).toBe(true);
		expect(isActiveStatus('trialing')).toBe(true);
		expect(isActiveStatus('past_due')).toBe(false);
		expect(isActiveStatus(null)).toBe(false);
	});
});

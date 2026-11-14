/**
 * Stripe helpers without the Stripe SDK (no new packages): form encoding for
 * the REST API, webhook signature checks and event -> subscriptions row mapping.
 * Pure (node:crypto only), so it's unit-tested without network or env.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

type Params = { [key: string]: string | number | boolean | null | undefined | Params | Params[] };

/** Stripe's bracket form encoding: { line_items: [{ price: 'p' }] } -> line_items[0][price]=p */
export function formEncode(params: Params, prefix = ''): string {
	const parts: string[] = [];
	for (const [k, v] of Object.entries(params)) {
		if (v === undefined || v === null) continue;
		const key = prefix ? `${prefix}[${k}]` : k;
		if (Array.isArray(v)) {
			v.forEach((item, i) => parts.push(formEncode(item, `${key}[${i}]`)));
		} else if (typeof v === 'object') {
			parts.push(formEncode(v, key));
		} else {
			parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
		}
	}
	return parts.filter(Boolean).join('&');
}

export const SIGNATURE_TOLERANCE_SEC = 300;

/**
 * Verifies a `Stripe-Signature` header (t=…,v1=…) for the RAW request body.
 * Rejects old timestamps (replay) and compares in constant time.
 */
export function verifyStripeSignature(
	payload: string,
	header: string | null,
	secret: string,
	nowSec = Math.floor(Date.now() / 1000),
	toleranceSec = SIGNATURE_TOLERANCE_SEC
): boolean {
	if (!header || !secret) return false;
	let t: number | null = null;
	const v1: string[] = [];
	for (const part of header.split(',')) {
		const [k, v] = part.split('=', 2).map((s) => s?.trim());
		if (k === 't' && v && /^\d+$/.test(v)) t = Number(v);
		else if (k === 'v1' && v && /^[0-9a-f]{64}$/i.test(v)) v1.push(v.toLowerCase());
	}
	if (t === null || !v1.length) return false;
	if (Math.abs(nowSec - t) > toleranceSec) return false;
	const expected = Buffer.from(
		createHmac('sha256', secret).update(`${t}.${payload}`, 'utf8').digest('hex')
	);
	return v1.some((sig) => {
		const got = Buffer.from(sig);
		return got.length === expected.length && timingSafeEqual(got, expected);
	});
}

/** Test helper / docs: the header Stripe would send for this payload. */
export function signStripePayload(payload: string, secret: string, t: number): string {
	const sig = createHmac('sha256', secret).update(`${t}.${payload}`, 'utf8').digest('hex');
	return `t=${t},v1=${sig}`;
}

export const PLAN_FAMILY_PLUS = 'family_plus';

export interface SubscriptionPatch {
	/** how to find the row: by user (preferred) or by Stripe subscription id */
	userId: string | null;
	familyId: string | null;
	stripeCustomerId: string | null;
	stripeSubscriptionId: string | null;
	status: string;
	currentPeriodEnd: string | null;
}

type Obj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {});

function periodEnd(sub: Obj): string | null {
	const top = sub.current_period_end;
	const item = obj((obj(sub.items).data as unknown[] | undefined)?.[0]).current_period_end;
	const sec = typeof top === 'number' ? top : typeof item === 'number' ? item : null;
	return sec === null ? null : new Date(sec * 1000).toISOString();
}

/** Maps the webhook events we handle to a subscriptions update; null = ignore. */
export function subscriptionPatchFromEvent(event: unknown): SubscriptionPatch | null {
	const e = obj(event);
	const type = str(e.type);
	const o = obj(obj(e.data).object);
	const meta = obj(o.metadata);

	if (type === 'checkout.session.completed') {
		if (o.mode !== 'subscription') return null;
		return {
			userId: str(o.client_reference_id) ?? str(meta.user_id),
			familyId: str(meta.family_id),
			stripeCustomerId: str(o.customer),
			stripeSubscriptionId: str(o.subscription),
			status: o.payment_status === 'paid' || o.status === 'complete' ? 'active' : 'incomplete',
			currentPeriodEnd: null
		};
	}
	if (
		type === 'customer.subscription.created' ||
		type === 'customer.subscription.updated' ||
		type === 'customer.subscription.deleted'
	) {
		return {
			userId: str(meta.user_id),
			familyId: str(meta.family_id),
			stripeCustomerId: str(o.customer),
			stripeSubscriptionId: str(o.id),
			status: type === 'customer.subscription.deleted' ? 'canceled' : (str(o.status) ?? 'inactive'),
			currentPeriodEnd: periodEnd(o)
		};
	}
	return null;
}

/** Statuses that unlock Family Plus. */
export function isActiveStatus(status: string | null | undefined): boolean {
	return status === 'active' || status === 'trialing';
}

/**
 * POST /api/ai/shield (parent only): neutral facts + requests for a message
 * the OTHER parent sent.
 *
 *   { messageId: uuid } -> 200 { tone, facts, requests, ai }
 *   | 400 { error: 'invalid_body' | 'own_message' } | 404 { error: 'not_found' }
 *   | 429 { error: 'rate_limited' } (+ Retry-After)
 *
 * The message is read with the parent's own session (RLS: own family only).
 * Nothing is stored or logged; the original message is never changed.
 */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { shieldMessage } from '#lib/server/ai/shield.js';
import { requireParent } from '#lib/server/guards.js';
import { createRateLimiter } from '#lib/server/rateLimit.js';
import type { RequestHandler } from './$types';

const Body = z.object({ messageId: z.uuid() });
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
const headers = { 'cache-control': 'no-store' };

export const POST: RequestHandler = async (event) => {
	const { member } = await requireParent(event);

	const limit = limiter.check(member.member_id);
	if (!limit.ok) {
		return json(
			{ error: 'rate_limited' },
			{ status: 429, headers: { ...headers, 'retry-after': String(limit.retryAfterSec) } }
		);
	}

	const body = Body.safeParse(await event.request.json().catch(() => null));
	if (!body.success) return json({ error: 'invalid_body' }, { status: 400, headers });

	const { data: message } = await event.locals.supabase
		.from('messages')
		.select('body, sender_id, family_id')
		.eq('id', body.data.messageId)
		.eq('family_id', member.family_id)
		.maybeSingle();
	if (!message) return json({ error: 'not_found' }, { status: 404, headers });
	if (message.sender_id === member.member_id) {
		return json({ error: 'own_message' }, { status: 400, headers });
	}

	return json(await shieldMessage(message.body), { headers });
};

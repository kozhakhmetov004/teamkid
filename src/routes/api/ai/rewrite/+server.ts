/**
 * POST /api/ai/rewrite (parent only): calm BIFF rewrite of a message draft.
 *
 * Contract (Member 1's composer, 8 s client timeout; do not change):
 *   { draft: string (1-4000), threadId?: uuid }
 *   -> 200 { rewritten, changed, notes } | 400 { error: 'invalid_body' }
 *    | 429 { error: 'rate_limited' } (+ Retry-After) | 503 { error: 'ai_unavailable' }
 * On 503 the composer lets the parent send the draft as is.
 *
 * Privacy: the draft is never stored or logged. Family names are read (RLS)
 * only to check that the rewrite keeps them; they are not sent anywhere.
 */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { aiErrorStatus } from '#lib/server/ai/llm.js';
import { rewriteMessage } from '#lib/server/ai/rewrite.js';
import { requireParent } from '#lib/server/guards.js';
import { createRateLimiter } from '#lib/server/rateLimit.js';
import type { RequestHandler } from './$types';

const Body = z.object({
	draft: z.string().trim().min(1).max(4000),
	// Accepted for the contract; the rewrite doesn't read the thread (faster, more private).
	threadId: z.uuid().optional()
});

const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
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

	const sb = event.locals.supabase;
	const [members, children] = await Promise.all([
		sb.from('members').select('display_name').eq('family_id', member.family_id),
		sb.from('children').select('first_name').eq('family_id', member.family_id)
	]);
	const names = [
		...(members.data ?? []).map((m) => m.display_name),
		...(children.data ?? []).map((c) => c.first_name)
	];

	try {
		const result = await rewriteMessage(body.data.draft, { names });
		return json(result, { headers });
	} catch (err) {
		if (aiErrorStatus(err)) return json({ error: 'ai_unavailable' }, { status: 503, headers });
		throw err;
	}
};

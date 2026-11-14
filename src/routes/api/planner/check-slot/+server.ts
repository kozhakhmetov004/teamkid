/**
 * POST /api/planner/check-slot (parent only): soft warnings for a time the
 * parent typed on a suggestion card, before saving it.
 *   { date, from, to } -> 200 { warnings: string[] }
 *   | 400 { error: 'invalid_body' } | 429 { error: 'rate_limited' }
 * Warnings never block saving ("Lily is with Alex at this time", "Overlaps Swim class").
 */
import { json } from '@sveltejs/kit';
import { safeTimeZone } from '#lib/custody/today.js';
import { requireParent } from '#lib/server/guards.js';
import { slotWarnings } from '#lib/server/plannerContext.js';
import { createRateLimiter } from '#lib/server/rateLimit.js';
import { SlotSchema } from '#lib/server/plannerSlot.js';
import type { RequestHandler } from './$types';

// Called (debounced) while the parent edits times: generous but bounded.
const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
const headers = { 'cache-control': 'no-store' };

export const POST: RequestHandler = async (event) => {
	const { member } = await requireParent(event);
	const limit = limiter.check(member.member_id);
	if (!limit.ok) return json({ error: 'rate_limited' }, { status: 429, headers });

	const tz = safeTimeZone(event.cookies.get('tz'));
	const body = SlotSchema(tz).safeParse(await event.request.json().catch(() => null));
	if (!body.success) return json({ error: 'invalid_body' }, { status: 400, headers });

	const warnings = await slotWarnings(event.locals.supabase, member, tz, body.data);
	return json({ warnings }, { headers });
};

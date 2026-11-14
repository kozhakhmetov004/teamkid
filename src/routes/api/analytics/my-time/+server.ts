/**
 * Private "My time with <child>" (parent only, OWN data only).
 *
 *   GET  ?childId=uuid  -> 200 { count, avgRating, favorites, recent, suggestion, days }
 *   POST { childId, title, happenedOn, rating? } -> 201 { id }
 *        | 400 { error: 'invalid_body' } | 404 { error: 'not_found' }
 *
 * Reads and writes go through the parent's own session: outings RLS only
 * shows/accepts rows where parent_member_id is the caller. Nothing here is
 * ever shown to the other parent, and nothing compares parents.
 */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { localDate, safeTimeZone } from '#lib/custody/today.js';
import { logAudit } from '#lib/server/audit.js';
import { suggestForParent } from '#lib/server/ai/parentSuggestion.js';
import { requireParent } from '#lib/server/guards.js';
import { MY_TIME_DAYS, summarizeOutings } from '#lib/server/insights/myTime.js';
import { createRateLimiter } from '#lib/server/rateLimit.js';
import type { RequestEvent, RequestHandler } from './$types';

const headers = { 'cache-control': 'no-store' };
const limiter = createRateLimiter({ limit: 30, windowMs: 60 * 60_000 });
const Uuid = z.uuid();

const Body = z.object({
	childId: z.uuid(),
	title: z.string().trim().min(1).max(80),
	happenedOn: z.iso.date(),
	rating: z.coerce.number().int().min(1).max(5).nullable().optional()
});

/** The child must be in the caller's family (checked with the caller's own session). */
async function ownChild(event: RequestEvent, familyId: string, childId: string) {
	const { data } = await event.locals.supabase
		.from('children')
		.select('id')
		.eq('id', childId)
		.eq('family_id', familyId)
		.maybeSingle();
	return !!data;
}

export const GET: RequestHandler = async (event) => {
	const { member } = await requireParent(event);
	const childId = Uuid.safeParse(event.url.searchParams.get('childId'));
	if (!childId.success) return json({ error: 'invalid_body' }, { status: 400, headers });
	if (!(await ownChild(event, member.family_id, childId.data))) {
		return json({ error: 'not_found' }, { status: 404, headers });
	}

	// The parent's own calendar day (tz cookie), so an outing logged "today" in
	// Almaty or LA isn't treated as a future date by UTC.
	const today = localDate(new Date(), safeTimeZone(event.cookies.get('tz')));
	const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
	const [{ data: rows }, { suggestion }] = await Promise.all([
		event.locals.supabase
			.from('outings')
			.select('title, child_rating, happened_on')
			.eq('child_id', childId.data)
			.eq('parent_member_id', member.member_id)
			.gte('happened_on', since)
			.order('happened_on', { ascending: false })
			.limit(50),
		suggestForParent(member.member_id, childId.data)
	]);

	return json(
		{ ...summarizeOutings(rows ?? [], today), suggestion, days: MY_TIME_DAYS },
		{ headers }
	);
};

export const POST: RequestHandler = async (event) => {
	const { member } = await requireParent(event);
	if (!limiter.check(member.member_id).ok) {
		return json({ error: 'rate_limited' }, { status: 429, headers });
	}
	const parsed = Body.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success) return json({ error: 'invalid_body' }, { status: 400, headers });
	const { childId, title, happenedOn, rating } = parsed.data;

	const today = new Date();
	const latest = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10); // tz slack
	const earliest = new Date(today.getTime() - 366 * 86_400_000).toISOString().slice(0, 10);
	if (happenedOn > latest || happenedOn < earliest) {
		return json({ error: 'invalid_body' }, { status: 400, headers });
	}
	if (!(await ownChild(event, member.family_id, childId))) {
		return json({ error: 'not_found' }, { status: 404, headers });
	}

	const { data, error } = await event.locals.supabase
		.from('outings')
		.insert({
			family_id: member.family_id,
			child_id: childId,
			parent_member_id: member.member_id,
			title,
			happened_on: happenedOn,
			child_rating: rating ?? null
		})
		.select('id')
		.single();
	if (error || !data) return json({ error: 'save_failed' }, { status: 500, headers });

	await logAudit({
		familyId: member.family_id,
		actorMemberId: member.member_id,
		action: 'outing.logged',
		entity: 'outings',
		entityId: data.id
	});
	return json({ id: data.id }, { status: 201, headers });
};

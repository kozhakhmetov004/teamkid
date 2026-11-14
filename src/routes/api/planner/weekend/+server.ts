/**
 * POST /api/planner/weekend (parent only): "Plan my weekend".
 *   { saturday, center: { lat, lon }, radiusMiles: 5 | 10 | 25, budget, from?, to? }
 *   (from/to: the parent's local time range, default 09:00-19:00, within 07:00-21:00)
 *   -> 200 { status: 'ok', weekend, suggestions, atHome, usedWishes, source, aiUsed }
 *    | 200 { status: 'not_with_you', saturday, nextSaturday }
 *    | 200 { status: 'no_time', saturday, from, to } (nothing free in that range)
 *    | 400 { error: 'invalid_body' | 'invalid_weekend' } | 429 { error: 'rate_limited' }
 *
 * The center is rounded to ~1 km here and is never stored or sent to the LLM.
 * The child's name never reaches the LLM or OpenStreetMap. Nothing is cached
 * beyond the request except the in-memory OSM result cache (10 min).
 */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import {
	DAY_END,
	DAY_START,
	freeWindows,
	MIN_RANGE_WINDOW_MINUTES,
	RANGE_END,
	RANGE_START
} from '#lib/custody/freeWindows.js';
import { safeTimeZone } from '#lib/custody/today.js';
import { BUDGETS, planWeekend } from '#lib/server/ai/planner.js';
import { requireParent } from '#lib/server/guards.js';
import { loadPlannerContext, scrubName } from '#lib/server/plannerContext.js';
import { roundCenter } from '#lib/server/places.js';
import { createRateLimiter } from '#lib/server/rateLimit.js';
import { TIME_RE } from '#lib/server/plannerSlot.js';
import type { RequestHandler } from './$types';

/** fast (8 s) + OpenStreetMap (8 s) + smart (20 s), with room to spare. */
export const config = { maxDuration: 60 };

const Body = z
	.object({
		saturday: z.iso.date(),
		center: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
		radiusMiles: z.union([z.literal(5), z.literal(10), z.literal(25)]),
		budget: z.enum(BUDGETS),
		from: z.string().regex(TIME_RE).default(DAY_START),
		to: z.string().regex(TIME_RE).default(DAY_END)
	})
	.refine(
		(v) => {
			const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
			return (
				v.from >= RANGE_START &&
				v.to <= RANGE_END &&
				mins(v.to) - mins(v.from) >= MIN_RANGE_WINDOW_MINUTES
			);
		},
		{ path: ['to'], message: 'Pick at least one hour between 7 AM and 9 PM' }
	);

const limiter = createRateLimiter({ limit: 10, windowMs: 60 * 60_000 });
const headers = { 'cache-control': 'no-store' };
const METERS_PER_MILE = 1609.344;

export const POST: RequestHandler = async (event) => {
	const { member } = await requireParent(event);

	const body = Body.safeParse(await event.request.json().catch(() => null));
	if (!body.success) return json({ error: 'invalid_body' }, { status: 400, headers });
	const v = body.data;

	const tz = safeTimeZone(event.cookies.get('tz'));
	const ctx = await loadPlannerContext(event.locals.supabase, member, tz);
	const weekend = ctx.weekends.find((w) => w.saturday === v.saturday);
	if (!weekend) return json({ error: 'invalid_weekend' }, { status: 400, headers });
	if (weekend.windows.length === 0) {
		const next = ctx.weekends.find((w) => w.saturday > v.saturday && w.windows.length > 0);
		return json(
			{ status: 'not_with_you', saturday: v.saturday, nextSaturday: next?.saturday ?? null },
			{ headers }
		);
	}

	// The parent's own time range: plan only inside it (AI and fallback alike).
	const windows = freeWindows({
		saturday: v.saturday,
		tz,
		myHome: ctx.myHome,
		blocks: ctx.blocks,
		busy: ctx.busy,
		now: new Date(),
		from: v.from,
		to: v.to,
		minMinutes: MIN_RANGE_WINDOW_MINUTES
	});
	if (windows.length === 0) {
		return json({ status: 'no_time', saturday: v.saturday, from: v.from, to: v.to }, { headers });
	}

	// Counted only for real planning runs (2 LLM calls + 1 OSM query each).
	const limit = limiter.check(member.member_id);
	if (!limit.ok) {
		return json(
			{ error: 'rate_limited' },
			{ status: 429, headers: { ...headers, 'retry-after': String(limit.retryAfterSec) } }
		);
	}

	const scrubbed = scrubName(ctx.wishes, ctx.child?.firstName);
	const result = await planWeekend({
		child: { ageYears: ctx.child?.ageYears ?? null, wishes: scrubbed, moodTrend: ctx.moodTrend },
		budget: v.budget,
		windows,
		center: roundCenter(v.center),
		radiusMeters: v.radiusMiles * METERS_PER_MILE
	});

	return json(
		{
			status: 'ok',
			weekend: { saturday: weekend.saturday, windows },
			suggestions: result.suggestions,
			atHome: result.atHome,
			// Back to the child's own words for the parent's screen.
			usedWishes: result.usedWishes.map((w) => ctx.wishes[scrubbed.indexOf(w)] ?? w),
			source: result.source,
			aiUsed: result.aiUsed
		},
		{ headers }
	);
};

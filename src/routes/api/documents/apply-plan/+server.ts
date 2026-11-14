/**
 * POST /api/documents/apply-plan (parent only): applies the schedule the
 * parent REVIEWED and possibly edited on the import screen. Never the raw AI
 * output: the body carries the parent's values, and the document must have
 * been parsed first.
 *   { documentId, template, startDate, firstHome, exchangeTime, exchangePlace?, holidays? }
 *   -> 200 { scheduleId, nights }
 *   | 400 { error: 'invalid_body' | 'manual_setup' | 'start_out_of_range' }
 *   | 404 { error: 'not_found' } | 409 { error: 'not_parsed' } | 429 { error: 'rate_limited' }
 *
 * Writes through Member 1's replace_custody_schedule() (same as the calendar's
 * "Set up schedule" form): it replaces FUTURE custody nights only, keeps the
 * past as history and writes the audit row in the same transaction. Times are
 * local to the parent's time zone (the `tz` cookie, as in /calendar).
 * Holidays are stored in custody_schedules.rules; they are not applied to the
 * calendar in P1.
 */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { PATTERN_TEMPLATES } from '#lib/custody/pattern.js';
import { planNights } from '#lib/custody/planSchedule.js';
import { nightsToBlocks } from '#lib/custody/schedule.js';
import { zonedToUtc } from '#lib/custody/time.js';
import { addDays, localDate, safeTimeZone } from '#lib/custody/today.js';
import { requireParent } from '#lib/server/guards.js';
import { createRateLimiter } from '#lib/server/rateLimit.js';
import type { RequestHandler } from './$types';

const Body = z.object({
	documentId: z.uuid(),
	template: z.enum([...PATTERN_TEMPLATES, 'custom']),
	startDate: z.iso.date(),
	firstHome: z.enum(['A', 'B']),
	exchangeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
	exchangePlace: z.string().trim().max(120).nullish(),
	holidays: z
		.array(
			z.object({ name: z.string().trim().min(1).max(60), rule: z.string().trim().min(1).max(160) })
		)
		.max(30)
		.default([])
});

const limiter = createRateLimiter({ limit: 10, windowMs: 60 * 60_000 });
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
	const v = body.data;
	// Schedules the generator can't express are set up by hand on /calendar.
	if (v.template === 'custom') return json({ error: 'manual_setup' }, { status: 400, headers });

	const tz = safeTimeZone(event.cookies.get('tz'));
	const today = localDate(new Date(), tz);
	if (v.startDate < '2000-01-01' || v.startDate > addDays(today, 365)) {
		return json({ error: 'start_out_of_range' }, { status: 400, headers });
	}

	const sb = event.locals.supabase;
	const { data: doc } = await sb
		.from('documents')
		.select('id, family_id, kind, extracted')
		.eq('id', v.documentId)
		.maybeSingle();
	if (!doc || doc.family_id !== member.family_id || doc.kind !== 'parenting_plan') {
		return json({ error: 'not_found' }, { status: 404, headers });
	}
	if (!doc.extracted) return json({ error: 'not_parsed' }, { status: 409, headers });

	const { nights } = planNights(v.template, v.startDate, v.firstHome, today);
	const blocks = nightsToBlocks(nights, v.exchangeTime, tz);
	const from = new Date(
		Math.max(Date.now(), zonedToUtc(v.startDate, v.exchangeTime, tz).getTime())
	).toISOString();

	const { data: scheduleId, error } = await sb.rpc('replace_custody_schedule', {
		p_family_id: member.family_id,
		p_template: v.template,
		p_start_date: v.startDate,
		p_exchange_time: v.exchangeTime,
		p_first_home: v.firstHome,
		p_from: from,
		p_blocks: blocks,
		p_rules: {
			tz,
			exchange_place: v.exchangePlace ?? null,
			holidays: v.holidays,
			document_id: doc.id
		},
		p_source: 'plan_pdf'
	});
	if (error || !scheduleId) throw new Error('could not apply the schedule');

	return json(
		{ scheduleId, nights: blocks.filter((b) => b.starts_at >= from).length },
		{ headers }
	);
};

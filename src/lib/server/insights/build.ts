/**
 * Weekly insight builder (owner: Member 2). SERVER ONLY. Rule-based, no LLM.
 *
 * Contract:
 * - Call from a kid form action AFTER requireChild(event) (reader = the child's
 *   session, reads go through RLS), or from a parent action AFTER checking the
 *   child is in that parent's family (reader = service role; e.g. profile edits).
 *   Never pass a childId that came from the client unchecked. Only the weekly_insights upsert uses the service
 *   role (users have no insert/update policy on it by design).
 * - Weeks are UTC, Monday start; one row per (child_id, week_start). Days inside
 *   the week are counted in the child's time zone (`tz`, from the tz cookie).
 * - Only check-ins the child shared count (see insightRules.ts).
 * - Never logs or stores raw choices: the row holds template text + theme keys,
 *   plus one AI line built only from SHARED labels/themes + the trend (weekAi.ts).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	computeInsight,
	isHardTrend,
	TREND_DISPLAY,
	type Insight
} from '#lib/kids/insightRules.js';
import { isoDate, utcWeekEnd, utcWeekStart } from '#lib/kids/time.js';
import type { Database } from '#lib/types/database.js';
import { supabaseAdmin } from '#lib/server/supabaseAdmin.js';
import { inputsKey, weekLine } from './weekAi.js';

export async function rebuildWeeklyInsight(
	childId: string,
	now: Date = new Date(),
	reader?: SupabaseClient<Database>,
	tz = 'UTC'
): Promise<Insight> {
	if (!reader) throw new Error('rebuildWeeklyInsight needs the child session (reader)');

	const start = utcWeekStart(now).toISOString();
	const end = utcWeekEnd(now).toISOString();
	const previousWeek = isoDate(new Date(utcWeekStart(now).getTime() - 7 * 86_400_000));

	const [child, checkins, wishes, previous] = await Promise.all([
		reader.from('children').select('family_id').eq('id', childId).single(),
		reader
			.from('mood_checkins')
			.select('mood, energy, created_at, shared')
			.eq('child_id', childId)
			.eq('shared', true)
			.gte('created_at', start)
			.lt('created_at', end),
		reader
			.from('wish_cards')
			.select('interest, shared_with_parents, shared_at, created_at, tags, card_kind')
			.eq('child_id', childId)
			.eq('shared_with_parents', true)
			.gte('shared_at', start)
			.lt('shared_at', end),
		// "Two harder weeks in a row" decides whether the pediatrician tip shows.
		reader
			.from('weekly_insights')
			.select('mood_trend')
			.eq('child_id', childId)
			.eq('week_start', previousWeek)
			.maybeSingle()
	]);
	for (const r of [child, checkins, wishes, previous]) {
		if (r.error) throw new Error(`insight read failed (${r.error.code})`);
	}
	if (!child.data) throw new Error('insight read failed (no child)');

	const insight = computeInsight(checkins.data ?? [], wishes.data ?? [], {
		tz,
		previousWeekHard: isHardTrend(previous.data?.mood_trend)
	});

	// One AI line from shared labels/themes + the trend; re-run only when they change.
	const week = isoDate(utcWeekStart(now));
	const items = (wishes.data ?? []).map((w) => ({
		label: w.interest,
		tags: w.tags ?? [],
		kind: w.card_kind
	}));
	const trendLabel = TREND_DISPLAY[insight.moodTrend].label;
	const [{ data: prev }, { data: profile }] = await Promise.all([
		supabaseAdmin()
			.from('weekly_insights')
			.select('ai_line, ai_line_key')
			.eq('child_id', childId)
			.eq('week_start', week)
			.maybeSingle(),
		// Parent-noted interests (parents-only table; read with the service role).
		supabaseAdmin().from('child_profiles').select('interests').eq('child_id', childId).maybeSingle()
	]);
	const noted = profile?.interests ?? [];
	const key = inputsKey([trendLabel, items.map((i) => [i.label, i.tags]).sort(), noted]);
	const aiLine =
		prev?.ai_line_key === key ? prev.ai_line : await weekLine(trendLabel, items, noted);

	const { error } = await supabaseAdmin().from('weekly_insights').upsert(
		{
			child_id: childId,
			family_id: child.data.family_id, // the DB trigger re-derives it from child_id anyway
			week_start: week,
			mood_trend: insight.moodTrend,
			interests: insight.interests,
			summary: insight.summary,
			gentle_flag: insight.gentleFlag,
			ai_line: aiLine,
			ai_line_key: key,
			// The table has no updated_at; created_at doubles as "last rebuilt" for "Updated …".
			created_at: now.toISOString()
		},
		{ onConflict: 'child_id,week_start' }
	);
	if (error) throw new Error(`insight upsert failed (${error.code})`);
	return insight;
}

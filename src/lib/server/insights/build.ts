/**
 * Weekly insight builder (owner: Member 2). SERVER ONLY. Rule-based, no LLM.
 *
 * Contract:
 * - Call ONLY from a kid form action, AFTER requireChild(event) has confirmed the
 *   signed-in child IS `childId`. Never pass a childId that came from the client.
 * - `reader` is the child's own session (event.locals.supabase): all reads go
 *   through RLS as that child. Only the weekly_insights upsert uses the service
 *   role (users have no insert/update policy on it by design).
 * - Weeks are UTC, Monday start; one row per (child_id, week_start).
 * - Never logs or stores raw choices: the row holds template text + theme keys.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeInsight, type Insight } from '#lib/kids/insightRules.js';
import { isoDate, utcWeekEnd, utcWeekStart } from '#lib/kids/time.js';
import type { Database } from '#lib/types/database.js';
import { supabaseAdmin } from '#lib/server/supabaseAdmin.js';

export async function rebuildWeeklyInsight(
	childId: string,
	now: Date = new Date(),
	reader?: SupabaseClient<Database>
): Promise<Insight> {
	if (!reader) throw new Error('rebuildWeeklyInsight needs the child session (reader)');

	const start = utcWeekStart(now).toISOString();
	const end = utcWeekEnd(now).toISOString();

	const [child, checkins, wishes] = await Promise.all([
		reader.from('children').select('family_id').eq('id', childId).single(),
		reader
			.from('mood_checkins')
			.select('mood, energy')
			.eq('child_id', childId)
			.gte('created_at', start)
			.lt('created_at', end),
		reader
			.from('wish_cards')
			.select('interest, shared_with_parents, shared_at, created_at, tags')
			.eq('child_id', childId)
			.eq('shared_with_parents', true)
			.gte('shared_at', start)
			.lt('shared_at', end)
	]);
	for (const r of [child, checkins, wishes]) {
		if (r.error) throw new Error(`insight read failed (${r.error.code})`);
	}
	if (!child.data) throw new Error('insight read failed (no child)');

	const insight = computeInsight(checkins.data ?? [], wishes.data ?? []);

	const { error } = await supabaseAdmin()
		.from('weekly_insights')
		.upsert(
			{
				child_id: childId,
				family_id: child.data.family_id, // the DB trigger re-derives it from child_id anyway
				week_start: isoDate(utcWeekStart(now)),
				mood_trend: insight.moodTrend,
				interests: insight.interests,
				summary: insight.summary,
				gentle_flag: insight.gentleFlag,
				// The table has no updated_at; created_at doubles as "last rebuilt" for "Updated …".
				created_at: now.toISOString()
			},
			{ onConflict: 'child_id,week_start' }
		);
	if (error) throw new Error(`insight upsert failed (${error.code})`);
	return insight;
}

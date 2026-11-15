/**
 * The ONE query for "what parents see" about a child: this UTC week's
 * weekly_insights row + the wishes the child chose to share. Used by the
 * parents' InsightCard (browser client, RLS as the parent) and by the kid's
 * /my-sharing page (server, RLS as the child), so both show the same thing.
 * Relative imports only so a tsx script can import it too.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.js';
import { isoDate, utcWeekStart } from '../../kids/time.js';

export interface InsightData {
	insight: {
		week_start: string;
		mood_trend: string;
		interests: string[];
		summary: string | null;
		gentle_flag: boolean;
		created_at: string;
	} | null;
	sharedWishes: SharedWish[];
}

export interface SharedWish {
	id: string;
	/** The preset label, or the cleaned label of the child's own typed idea (never raw text). */
	interest: string;
	emoji: string | null;
	kind: 'activity' | 'interest' | 'gift' | null;
	custom: boolean;
	tags: string[];
	/** True for this week's cards (older preset wishes are false). */
	thisWeek: boolean;
}

export async function loadInsight(
	client: SupabaseClient<Database>,
	childId: string,
	now: Date = new Date(),
	familyId?: string
): Promise<InsightData> {
	const week = isoDate(utcWeekStart(now));
	let insightQuery = client
		.from('weekly_insights')
		.select('week_start, mood_trend, interests, summary, gentle_flag, created_at')
		.eq('child_id', childId)
		.eq('week_start', week);
	let wishQuery = client
		.from('wish_cards')
		.select('id, interest, shared_at, emoji, card_kind, is_custom, tags, week_start')
		.eq('child_id', childId)
		.eq('shared_with_parents', true);
	if (familyId) {
		insightQuery = insightQuery.eq('family_id', familyId);
		wishQuery = wishQuery.eq('family_id', familyId);
	}
	const [insights, wishes] = await Promise.all([
		insightQuery.maybeSingle(),
		wishQuery.order('shared_at', { ascending: false, nullsFirst: false }).limit(12)
	]);
	if (insights.error) throw new Error(`insight load failed (${insights.error.code})`);
	if (wishes.error) throw new Error(`wishes load failed (${wishes.error.code})`);
	return {
		insight: insights.data ?? null,
		sharedWishes: (wishes.data ?? []).map((w) => ({
			id: w.id,
			interest: w.interest,
			emoji: w.emoji,
			kind:
				w.card_kind === 'activity' || w.card_kind === 'interest' || w.card_kind === 'gift'
					? w.card_kind
					: null,
			custom: w.is_custom,
			tags: w.tags,
			thisWeek: w.week_start === week
		}))
	};
}

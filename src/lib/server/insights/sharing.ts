/**
 * Share / unshare one of the child's wish cards, then rebuild the weekly insight.
 * SERVER ONLY. Call after requireChild(event); `childId` / `member` come from the
 * guard, never from the client. The update runs as the child (RLS: own rows only).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.js';
import type { Membership } from '#lib/types/domain.js';
import { logAudit } from '#lib/server/audit.js';
import { rebuildWeeklyInsight } from './build.js';

export type ShareResult = 'ok' | 'not_found' | 'error';

export async function setWishShared(
	sb: SupabaseClient<Database>,
	child: { childId: string; member: Membership },
	wishId: string,
	shared: boolean
): Promise<ShareResult> {
	const { data, error } = await sb
		.from('wish_cards')
		.update({ shared_with_parents: shared, shared_at: shared ? new Date().toISOString() : null })
		.eq('id', wishId)
		.eq('child_id', child.childId)
		.select('id');
	if (error) {
		console.error('wish share update failed', error.code);
		return 'error';
	}
	if (!data?.length) return 'not_found';

	// Parent-visible change → audit (ids only; never what the wish was).
	await logAudit({
		familyId: child.member.family_id,
		actorMemberId: child.member.member_id,
		action: shared ? 'wish.shared' : 'wish.unshared',
		entity: 'wish_cards',
		entityId: wishId
	});

	await rebuildQuietly(sb, child.childId);
	return 'ok';
}

/** Rebuild the weekly insight; a failure never breaks the child's action. */
export async function rebuildQuietly(sb: SupabaseClient<Database>, childId: string) {
	try {
		await rebuildWeeklyInsight(childId, new Date(), sb);
	} catch (err) {
		console.error('insight rebuild failed', err instanceof Error ? err.message : 'unknown');
	}
}

/** Share every answer of one card (a wish_questions row) with both parents. */
export async function setCardShared(
	sb: SupabaseClient<Database>,
	child: { childId: string; member: Membership },
	questionId: string
): Promise<ShareResult> {
	const { data, error } = await sb
		.from('wish_cards')
		.update({ shared_with_parents: true, shared_at: new Date().toISOString() })
		.eq('child_id', child.childId)
		.eq('question_id', questionId)
		.select('id');
	if (error) {
		console.error('card share update failed', error.code);
		return 'error';
	}
	if (!data?.length) return 'not_found';
	for (const row of data) {
		await logAudit({
			familyId: child.member.family_id,
			actorMemberId: child.member.member_id,
			action: 'wish.shared',
			entity: 'wish_cards',
			entityId: row.id
		});
	}
	await rebuildQuietly(sb, child.childId);
	return 'ok';
}

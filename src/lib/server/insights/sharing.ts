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
	child: { childId: string; member: Membership; tz?: string },
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

	try {
		await rebuildWeeklyInsight(child.childId, new Date(), sb, child.tz);
	} catch (err) {
		console.error('insight rebuild failed', err instanceof Error ? err.message : 'unknown');
	}
	return 'ok';
}

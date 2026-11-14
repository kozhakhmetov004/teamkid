/**
 * POST /messages/[threadId]/read: read receipts.
 * Sets first_read_at on the OTHER parent's unread messages in this thread.
 * The immutability trigger allows exactly this (null -> timestamp, once);
 * RLS (messages_mark_read) only lets you update messages you didn't send.
 */
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const { member } = await requireParent(event);
	const threadId = z.uuid().safeParse(event.params.threadId);
	if (!threadId.success) error(404, { message: 'Conversation not found', code: 'not_found' });

	const { data, error: updateError } = await event.locals.supabase
		.from('messages')
		.update({ first_read_at: new Date().toISOString() })
		.eq('thread_id', threadId.data)
		.neq('sender_id', member.member_id)
		.is('first_read_at', null)
		.select('id');
	if (updateError) error(500, { message: 'Could not update read receipts' });

	const count = data?.length ?? 0;
	if (count > 0) {
		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'message.read',
			entity: 'threads',
			entityId: threadId.data,
			meta: { count }
		});
	}
	return json({ marked: count }, { headers: { 'cache-control': 'no-store' } });
};

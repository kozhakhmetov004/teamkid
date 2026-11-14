/**
 * One thread: immutable messages (DB trigger), read receipts, sending.
 * The composer runs the AI tone check in the browser before posting here.
 * The original angry draft is never stored: original_body is always null.
 */
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { peopleFor } from '#lib/custody/people.js';
import { localDate, relativeDay, safeTimeZone, timeLabel } from '#lib/custody/today.js';
import type { BubbleMessage } from '#lib/components/messages/types.js';
import type { Actions, PageServerLoad } from './$types';

const ThreadId = z.uuid();

export const load: PageServerLoad = async (event) => {
	const { member } = await requireParent(event);
	event.depends('app:thread');
	const threadId = ThreadId.safeParse(event.params.threadId);
	if (!threadId.success) error(404, { message: 'Conversation not found', code: 'not_found' });

	const tz = safeTimeZone(event.cookies.get('tz'));
	const today = localDate(new Date(), tz);
	const sb = event.locals.supabase;
	const [thread, messages, parents] = await Promise.all([
		sb.from('threads').select('id, topic').eq('id', threadId.data).maybeSingle(),
		sb
			.from('messages')
			.select('id, sender_id, body, created_at, first_read_at, ai_rewritten')
			.eq('thread_id', threadId.data)
			.order('created_at')
			.limit(500),
		sb
			.from('members')
			.select('id, display_name, home')
			.eq('family_id', member.family_id)
			.eq('role', 'parent')
	]);
	// RLS: a thread of another family simply doesn't exist for this parent.
	if (!thread.data) error(404, { message: 'Conversation not found', code: 'not_found' });

	const people = peopleFor(parents.data ?? [], member);
	const when = (iso: string) => `${relativeDay(localDate(iso, tz), today)} ${timeLabel(iso, tz)}`;
	const bubbles: BubbleMessage[] = (messages.data ?? []).map((m) => ({
		id: m.id,
		mine: m.sender_id === member.member_id,
		from: people.nameById(m.sender_id),
		body: m.body,
		sentLabel: when(m.created_at),
		readLabel: m.first_read_at ? when(m.first_read_at) : null,
		aiRewritten: m.ai_rewritten
	}));

	return {
		thread: thread.data,
		messages: bubbles,
		otherName: people.otherName,
		unreadIncoming: (messages.data ?? []).filter(
			(m) => m.sender_id !== member.member_id && !m.first_read_at
		).length
	};
};

const Send = z.object({
	body: z
		.string()
		.trim()
		.min(1, 'Write a message first')
		.max(4000, 'Keep it under 4,000 characters'),
	aiRewritten: z
		.enum(['true', 'false'])
		.optional()
		.transform((v) => v === 'true')
});

export const actions: Actions = {
	send: async (event) => {
		const { member } = await requireParent(event);
		const threadId = ThreadId.safeParse(event.params.threadId);
		if (!threadId.success) return formFailure('send', 'Conversation not found', 404);
		const parsed = await parseForm(event.request, Send, 'send');
		if (!parsed.ok) return parsed.failure;

		const { data: message, error: insertError } = await event.locals.supabase
			.from('messages')
			.insert({
				// family_id is overwritten from the thread by a DB trigger; RLS then
				// checks this parent belongs to that family.
				family_id: member.family_id,
				thread_id: threadId.data,
				sender_id: member.member_id,
				body: parsed.data.body,
				ai_rewritten: parsed.data.aiRewritten,
				original_body: null
			})
			.select('id')
			.single();
		if (insertError || !message) {
			return formFailure('send', 'Could not send the message. Please try again.', 500);
		}
		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'message.sent',
			entity: 'messages',
			entityId: message.id,
			meta: { ai_rewritten: parsed.data.aiRewritten }
		});
		return { form: 'send', ok: true };
	}
};

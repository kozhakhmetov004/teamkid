/**
 * Thread list. Topics: School, Health, Schedule, Money, General (or any).
 * `?thread=<id>` (old Today links) redirects to the thread.
 */
import { redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { peopleFor } from '#lib/custody/people.js';
import { localDate, relativeDay, safeTimeZone, timeLabel } from '#lib/custody/today.js';
import type { Actions, PageServerLoad } from './$types';

const SUGGESTED_TOPICS = ['School', 'Health', 'Schedule', 'Money', 'General'];

export const load: PageServerLoad = async (event) => {
	const { member } = await requireParent(event);
	event.depends('app:messages');
	const legacy = z.uuid().safeParse(event.url.searchParams.get('thread'));
	if (legacy.success) redirect(303, `/messages/${legacy.data}`);

	const tz = safeTimeZone(event.cookies.get('tz'));
	const today = localDate(new Date(), tz);
	const sb = event.locals.supabase;
	const [threads, recent, parents] = await Promise.all([
		sb.from('threads').select('id, topic, created_at').eq('family_id', member.family_id),
		sb
			.from('messages')
			.select('id, thread_id, sender_id, body, created_at, first_read_at')
			.eq('family_id', member.family_id)
			.order('created_at', { ascending: false })
			.limit(500),
		sb
			.from('members')
			.select('id, display_name, home')
			.eq('family_id', member.family_id)
			.eq('role', 'parent')
	]);
	const people = peopleFor(parents.data ?? [], member);

	const rows = (threads.data ?? []).map((t) => {
		const msgs = (recent.data ?? []).filter((m) => m.thread_id === t.id);
		const last = msgs[0];
		return {
			id: t.id,
			topic: t.topic,
			sortKey: last?.created_at ?? t.created_at,
			snippet: last ? (last.body.length > 90 ? `${last.body.slice(0, 87)}…` : last.body) : null,
			from: last ? people.nameById(last.sender_id) : null,
			when: last
				? `${relativeDay(localDate(last.created_at, tz), today)} ${timeLabel(last.created_at, tz)}`
				: null,
			unread: msgs.filter((m) => m.sender_id !== member.member_id && !m.first_read_at).length
		};
	});
	rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

	return {
		threads: rows.map(({ sortKey: _sortKey, ...r }) => r),
		suggestedTopics: SUGGESTED_TOPICS,
		hasCoParent: people.other !== null
	};
};

const NewThread = z.object({
	topic: z.string().trim().min(1, 'Give the topic a name').max(120, 'Keep the topic short')
});

export const actions: Actions = {
	newThread: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, NewThread, 'newThread');
		if (!parsed.ok) return parsed.failure;
		const { data: thread, error } = await event.locals.supabase
			.from('threads')
			.insert({
				family_id: member.family_id,
				topic: parsed.data.topic,
				created_by: member.member_id
			})
			.select('id')
			.single();
		if (error || !thread)
			return formFailure('newThread', 'Could not create the topic. Please try again.', 500);
		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'thread.created',
			entity: 'threads',
			entityId: thread.id
		});
		redirect(303, `/messages/${thread.id}`);
	}
};

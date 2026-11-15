import { z } from 'zod';
import { safeTimeZone } from '#lib/custody/today.js';
import {
	CARD_KINDS,
	IDEA_MAX,
	MAX_PICKS,
	type CardKind,
	type DeckOption
} from '#lib/kids/weeklyDeck.js';
import { isoDate, utcDayStart, utcWeekStart } from '#lib/kids/time.js';
import { logAudit } from '#lib/server/audit.js';
import { requireChild } from '#lib/server/guards.js';
import { getTodayCards } from '#lib/server/insights/dailyCards.js';
import { checkIdea, loadWeekendFacts, weekendLine } from '#lib/server/insights/wishDeck.js';
import { rebuildQuietly, setCardShared } from '#lib/server/insights/sharing.js';
import { raiseSafetyAlert } from '#lib/server/safety.js';
import { formFailure } from '#lib/server/validation.js';
import { loadPet } from '../pet.server.js';
import type { Actions, PageServerLoad } from './$types';

export interface MyAnswer {
	/** wish_questions.id */
	card: string;
	key: string;
	label: string;
	emoji: string;
	custom: boolean;
	shared: boolean;
}

export const load: PageServerLoad = async (event) => {
	const { childId, member } = await requireChild(event);
	const sb = event.locals.supabase;
	const tz = safeTimeZone(event.cookies.get('tz'));
	const now = new Date();

	const facts = await loadWeekendFacts(member.family_id, childId, tz, now);
	const [pet, answers] = await Promise.all([
		loadPet(sb, childId),
		sb
			.from('wish_cards')
			.select('question_id, option_key, interest, emoji, is_custom, shared_with_parents')
			.eq('child_id', childId)
			.eq('day', isoDate(utcDayStart(now)))
			.order('created_at')
	]);
	return {
		firstName: member.display_name,
		pet,
		weekendLine: weekendLine(facts),
		answers: (answers.data ?? []).flatMap((r): MyAnswer[] =>
			r.question_id
				? [
						{
							card: r.question_id,
							key: r.option_key ?? '',
							label: r.interest,
							emoji: r.emoji ?? '⭐',
							custom: r.is_custom,
							shared: r.shared_with_parents
						}
					]
				: []
		),
		// Streamed: the first open of the day (or a refresh) may wait for the AI.
		deck: getTodayCards(sb, { childId, familyId: member.family_id }, facts, now).then((cards) => ({
			cards
		}))
	};
};

const AnswerSchema = z.object({
	card: z.uuid(),
	options: z.array(z.string().min(1).max(60)).max(10),
	keepOwn: z.array(z.string().min(1).max(60)).max(5),
	other: z.string().max(IDEA_MAX * 2)
});
const ShareSchema = z.object({ card: z.uuid() });

export const actions: Actions = {
	/** Save (or change) today's answers to one card. Private until the child shares. */
	answer: async (event) => {
		const { childId, member } = await requireChild(event);
		const fd = await event.request.formData();
		const parsed = AnswerSchema.safeParse({
			card: fd.get('card'),
			options: fd.getAll('options'),
			keepOwn: fd.getAll('keepOwn'),
			other: fd.get('other') ?? ''
		});
		if (!parsed.success) return formFailure('answer', 'Oops, try that again?', 400);
		const v = parsed.data;

		const sb = event.locals.supabase;
		const now = new Date();
		const day = isoDate(utcDayStart(now));
		const [question, existing] = await Promise.all([
			sb
				.from('wish_questions')
				.select('id, kind, prompt, max_picks, options, day')
				.eq('id', v.card)
				.eq('child_id', childId)
				.maybeSingle(),
			sb
				.from('wish_cards')
				.select('id, option_key, interest, emoji, tags, is_custom, shared_with_parents')
				.eq('child_id', childId)
				.eq('question_id', v.card)
		]);
		const q = question.data;
		// Answers can change only until the day ends.
		if (!q || q.day !== day) return formFailure('answer', 'That card is from another day.', 400);
		const kind = (
			(CARD_KINDS as readonly string[]).includes(q.kind) ? q.kind : 'everyday'
		) as CardKind;
		const options = (Array.isArray(q.options) ? q.options : []) as unknown as DeckOption[];
		const max = q.max_picks || MAX_PICKS[kind];

		const rows = options
			.filter((o) => v.options.includes(o.key))
			.map((o) => ({
				key: o.key,
				label: o.label,
				emoji: o.emoji,
				tags: o.tags as string[],
				custom: false
			}));
		for (const r of existing.data ?? []) {
			if (r.is_custom && r.option_key && v.keepOwn.includes(r.option_key)) {
				rows.push({
					key: r.option_key,
					label: r.interest,
					emoji: r.emoji ?? '✏️',
					tags: r.tags,
					custom: true
				});
			}
		}

		const other = v.other.trim();
		if (other) {
			const idea = await checkIdea(other, kind);
			if (idea.status === 'big_feeling') {
				if (idea.level === 'crisis') {
					try {
						await raiseSafetyAlert({
							childId,
							familyId: member.family_id,
							childMemberId: member.member_id,
							level: idea.level,
							category: idea.category
						});
					} catch {
						console.error('safety alert from wish idea failed');
					}
				}
				return { form: 'answer', status: 'big_feeling' as const, reply: idea.reply };
			}
			if (idea.status === 'retry') {
				return { form: 'answer', status: 'retry' as const, reply: idea.reply };
			}
			rows.push({ ...idea.option, custom: true });
		}

		if (!rows.length) return formFailure('answer', 'Pick one, or type your own idea!', 400);
		if (rows.length > max)
			return formFailure('answer', `You can pick up to ${max}. Take one away?`, 400);

		// Replace this card's answers (allowed until the day ends).
		const del = await sb
			.from('wish_cards')
			.delete()
			.eq('child_id', childId)
			.eq('question_id', v.card);
		if (del.error)
			return formFailure('answer', 'Oops, Pebble could not save that. Try again?', 500);
		const ins = await sb.from('wish_cards').insert(
			rows.map((r) => ({
				child_id: childId,
				family_id: member.family_id, // re-derived from child_id by the DB trigger
				question_id: v.card,
				day,
				week_start: isoDate(utcWeekStart(now)),
				card_kind: kind,
				option_key: r.key,
				prompt: q.prompt,
				interest: r.label,
				emoji: r.emoji,
				tags: r.tags,
				is_custom: r.custom,
				shared_with_parents: false
			}))
		);
		if (ins.error) {
			console.error('wish insert failed', ins.error.code);
			return formFailure('answer', 'Oops, Pebble could not save that. Try again?', 500);
		}

		// Changing shared answers is visible to parents: audit (ids only) + rebuild.
		const wasShared = (existing.data ?? []).filter((r) => r.shared_with_parents);
		for (const r of wasShared) {
			await logAudit({
				familyId: member.family_id,
				actorMemberId: member.member_id,
				action: 'wish.unshared',
				entity: 'wish_cards',
				entityId: r.id
			});
		}
		if (wasShared.length) await rebuildQuietly(sb, childId);

		return {
			form: 'answer',
			status: 'saved' as const,
			saved: rows.map((r) => ({ key: r.key, label: r.label, emoji: r.emoji, custom: r.custom }))
		};
	},

	/** "Yes, tell them": share this card's answers with both parents. */
	share: async (event) => {
		const { childId, member } = await requireChild(event);
		const fd = await event.request.formData();
		const parsed = ShareSchema.safeParse({ card: fd.get('card') });
		if (!parsed.success) return formFailure('share', 'Oops, try again?', 400);
		const result = await setCardShared(
			event.locals.supabase,
			{ childId, member },
			parsed.data.card
		);
		if (result === 'not_found') return formFailure('share', 'Nothing to share yet.', 404);
		if (result === 'error') return formFailure('share', 'Oops, try again?', 500);
		return { form: 'share', ok: true };
	}
};

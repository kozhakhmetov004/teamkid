/**
 * Server helpers for swap requests (create / respond / counter actions).
 * All queries run as the signed-in parent (locals.supabase, RLS applies).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { addDays, localDate, nightsByDate, shortDate, type Home } from '#lib/custody/today.js';
import { DATE_RE, zonedToUtc } from '#lib/custody/time.js';
import type { Database } from '#lib/types/database.js';

type Sb = SupabaseClient<Database>;

export const SWAP_WINDOW_DAYS = 60;
export const zDate = z.string().regex(DATE_RE, 'Pick a date');
export const zOptionalDate = z
	.string()
	.optional()
	.transform((v) => (v && v.trim() !== '' ? v : undefined))
	.pipe(zDate.optional());
export const zNote = z
	.string()
	.trim()
	.max(280, 'Keep the note under 280 characters')
	.optional()
	.transform((v) => (v ? v : undefined));

/** Range + shape checks shared by create and counter. Returns an error or null. */
export function checkSwapDates(
	original: string,
	proposed: string | undefined,
	today: string
): string | null {
	const max = addDays(today, SWAP_WINDOW_DAYS);
	for (const d of [original, proposed].filter(Boolean) as string[]) {
		if (d < today) return 'You can only swap nights from today on.';
		if (d > max) return `You can only swap nights in the next ${SWAP_WINDOW_DAYS} days.`;
	}
	if (proposed && proposed === original) return 'Choose two different nights.';
	return null;
}

/**
 * The night you give must be yours today, and the night you take must be the
 * other parent's. Returns an error message or null.
 */
export async function checkNightOwnership(
	sb: Sb,
	familyId: string,
	tz: string,
	myHome: string | null,
	original: string,
	proposed: string | undefined
): Promise<string | null> {
	if (!myHome) return 'Your home (A/B) is not set yet. Ask the team to check the family setup.';
	const dates = [original, proposed].filter(Boolean) as string[];
	const from = zonedToUtc(dates.slice().sort()[0], '00:00', tz).toISOString();
	const to = zonedToUtc(addDays(dates.slice().sort().at(-1)!, 1), '00:00', tz).toISOString();
	const { data, error } = await sb
		.from('events')
		.select('starts_at, ends_at, home')
		.eq('family_id', familyId)
		.eq('kind', 'custody')
		.gte('starts_at', from)
		.lt('starts_at', to);
	if (error) return 'Could not check the calendar. Please try again.';
	const nights = nightsByDate(
		(data ?? []).filter((e) => e.home).map((e) => ({ ...e, home: e.home as Home })),
		tz
	);
	const originalHome = nights.get(original);
	if (!originalHome) return `There's no custody night on ${shortDate(original)} yet.`;
	if (originalHome !== myHome) return `The night of ${shortDate(original)} isn't yours to give.`;
	if (proposed) {
		const proposedHome = nights.get(proposed);
		if (!proposedHome) return `There's no custody night on ${shortDate(proposed)} yet.`;
		if (proposedHome === myHome) return `The night of ${shortDate(proposed)} is already yours.`;
	}
	return null;
}

export function describeSwap(original: string, proposed: string | null | undefined): string {
	return proposed
		? `${shortDate(original)} ↔ ${shortDate(proposed)}`
		: `${shortDate(original)} (no night back)`;
}

/**
 * Leaves a record in the family's "Schedule" thread (created if missing).
 * Messages are immutable, so this is part of the court-ready history.
 * Best effort: a failure here never undoes the swap itself.
 */
export async function postScheduleNote(
	sb: Sb,
	familyId: string,
	senderId: string,
	body: string
): Promise<void> {
	let { data: thread } = await sb
		.from('threads')
		.select('id')
		.eq('family_id', familyId)
		.eq('topic', 'Schedule')
		.order('created_at')
		.limit(1)
		.maybeSingle();
	if (!thread) {
		const created = await sb
			.from('threads')
			.insert({ family_id: familyId, topic: 'Schedule', created_by: senderId })
			.select('id')
			.single();
		thread = created.data;
	}
	if (!thread) return;
	const { error } = await sb.from('messages').insert({
		family_id: familyId,
		thread_id: thread.id,
		sender_id: senderId,
		body,
		original_body: null
	});
	if (error) console.error('schedule note failed:', error.message);
}

/** Friendly text for errors raised by respond_to_swap / counter_swap. */
export function friendlySwapError(message: string | undefined): string {
	if (!message) return 'Something went wrong. Please try again.';
	if (/already handled/i.test(message)) return 'This swap was already handled.';
	if (/own swap/i.test(message)) return "You can't answer your own swap request.";
	if (/no longer with/i.test(message))
		return 'The calendar changed since this request was made. Ask for a new swap.';
	if (/not allowed/i.test(message)) return "You can't answer swaps for this family.";
	return message;
}

export const todayIn = (tz: string) => localDate(new Date(), tz);

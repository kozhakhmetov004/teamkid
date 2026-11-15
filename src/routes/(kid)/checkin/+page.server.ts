import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { safeTimeZone } from '#lib/custody/today.js';
import { requireChild } from '#lib/server/guards.js';
import { rebuildWeeklyInsight } from '#lib/server/insights/build.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { checkinDays, HARD_MIN_DAYS } from '#lib/kids/insightRules.js';
import { BIG_FEELINGS, CHECKIN_MOOD_VALUES, ENERGY_FORM_VALUES } from '#lib/kids/moods.js';
import type { Database } from '#lib/types/database.js';
import { loadPet } from '../pet.server.js';
import type { Actions, PageServerLoad } from './$types';

const DAY_MS = 86_400_000;

export const load: PageServerLoad = async (event) => {
	const { childId, member } = await requireChild(event);
	return {
		firstName: member.display_name,
		pet: await loadPet(event.locals.supabase, childId)
	};
};

// Enum values only: no free text from the child in P1.
const CheckinSchema = z.object({
	mood: z.enum(CHECKIN_MOOD_VALUES),
	energy: z.enum(ENERGY_FORM_VALUES).transform(Number),
	// "Yes, tell them" / "Keep it just for me". Anything else = private.
	share: z
		.enum(['yes', 'no'])
		.optional()
		.transform((v) => v === 'yes')
});

type Sb = SupabaseClient<Database>;
type Child = { childId: string; familyId: string };

/** What the parents' Today page shows: the child's latest answer ("just for me" clears it). */
async function setSharedMood(
	sb: Sb,
	child: Child,
	feeling: { mood: string; energy: number | null } | null
) {
	return sb.from('shared_moods').upsert({
		child_id: child.childId,
		family_id: child.familyId, // re-derived from child_id by the DB trigger
		mood: feeling?.mood ?? null,
		energy: feeling?.energy ?? null,
		shared_at: new Date().toISOString()
	});
}

async function rebuild(sb: Sb, childId: string, tz: string) {
	try {
		await rebuildWeeklyInsight(childId, new Date(), sb, tz);
	} catch (err) {
		// The check-in is saved; the summary catches up on the next change.
		console.error('insight rebuild failed', err instanceof Error ? err.name : 'unknown');
	}
}

/**
 * Big feelings on several different days this past week, counting private
 * check-ins too. Only ever shown to the child (Pebble's gentle nudge), never
 * sent to the parents.
 */
async function hadHardDays(sb: Sb, childId: string, tz: string): Promise<boolean> {
	const { data, error } = await sb
		.from('mood_checkins')
		.select('mood, energy, created_at')
		.eq('child_id', childId)
		.gte('created_at', new Date(Date.now() - 7 * DAY_MS).toISOString());
	if (error) return false;
	return checkinDays(data ?? [], tz).filter((d) => d.big).length >= HARD_MIN_DAYS;
}

export const actions: Actions = {
	checkin: async (event) => {
		const { childId, member } = await requireChild(event);
		const parsed = await parseForm(event.request, CheckinSchema, 'checkin');
		if (!parsed.ok) return parsed.failure;
		const { mood, energy, share } = parsed.data;
		const sb = event.locals.supabase;
		const tz = safeTimeZone(event.cookies.get('tz'));
		const child = { childId, familyId: member.family_id };

		// Insert as the child (RLS: child_id must be the signed-in child).
		// Multiple check-ins per day are fine; the insight merges them per day.
		const { error } = await sb
			.from('mood_checkins')
			.insert({ child_id: childId, mood, energy, shared: share });
		if (error) {
			// Never log what the child chose; the error code is enough.
			console.error('checkin insert failed', error.code);
			return formFailure('checkin', 'Oops, Pebble could not save that. Try again?', 500);
		}

		const { error: shareError } = await setSharedMood(sb, child, share ? { mood, energy } : null);
		if (shareError) {
			console.error('mood share failed', shareError.code);
			return formFailure('checkin', 'Oops, Pebble could not save that. Try again?', 500);
		}

		await rebuild(sb, childId, tz);

		// A big feeling kept private, after several hard days: Pebble offers to help.
		const nudge =
			!share && BIG_FEELINGS.includes(mood) ? await hadHardDays(sb, childId, tz) : false;
		return { form: 'checkin', ok: true, shared: share, nudge };
	},

	/** "Tell Mom and Dad" from Pebble's nudge: share the latest check-in after all. */
	share: async (event) => {
		const { childId, member } = await requireChild(event);
		const sb = event.locals.supabase;
		const tz = safeTimeZone(event.cookies.get('tz'));

		const { data: latest } = await sb
			.from('mood_checkins')
			.select('id, mood, energy')
			.eq('child_id', childId)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();
		if (!latest) return formFailure('share', 'Oops, Pebble could not find that. Try again?', 404);

		const [marked, sharedMood] = await Promise.all([
			sb.from('mood_checkins').update({ shared: true }).eq('id', latest.id),
			setSharedMood(
				sb,
				{ childId, familyId: member.family_id },
				{ mood: latest.mood, energy: latest.energy }
			)
		]);
		const failed = marked.error ?? sharedMood.error;
		if (failed) {
			console.error('mood share failed', failed.code);
			return formFailure('share', 'Oops, Pebble could not tell them. Try again?', 500);
		}

		await rebuild(sb, childId, tz);
		return { form: 'share', ok: true, shared: true };
	}
};

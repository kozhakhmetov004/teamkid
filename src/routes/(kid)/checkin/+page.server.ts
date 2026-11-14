import { z } from 'zod';
import { requireChild } from '#lib/server/guards.js';
import { rebuildWeeklyInsight } from '#lib/server/insights/build.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { CHECKIN_MOOD_VALUES, ENERGY_FORM_VALUES } from '#lib/kids/moods.js';
import { loadPet } from '../pet.server.js';
import type { Actions, PageServerLoad } from './$types';

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
	energy: z.enum(ENERGY_FORM_VALUES).transform(Number)
});

export const actions: Actions = {
	default: async (event) => {
		const { childId } = await requireChild(event);
		const parsed = await parseForm(event.request, CheckinSchema, 'checkin');
		if (!parsed.ok) return parsed.failure;

		// Insert as the child (RLS: child_id must be the signed-in child).
		// Multiple check-ins per day are fine; the latest counts as "done today".
		const { error } = await event.locals.supabase
			.from('mood_checkins')
			.insert({ child_id: childId, mood: parsed.data.mood, energy: parsed.data.energy });
		if (error) {
			// Never log what the child chose; the error code is enough.
			console.error('checkin insert failed', error.code);
			return formFailure('checkin', 'Oops, Pebble could not save that. Try again?', 500);
		}

		try {
			await rebuildWeeklyInsight(childId, new Date(), event.locals.supabase);
		} catch (err) {
			// The check-in is saved; the summary catches up on the next change.
			console.error('insight rebuild failed', err instanceof Error ? err.name : 'unknown');
		}

		return { form: 'checkin', ok: true };
	}
};

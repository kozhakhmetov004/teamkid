import { z } from 'zod';
import { safeTimeZone } from '#lib/custody/today.js';
import { requireChild } from '#lib/server/guards.js';
import { setWishShared } from '#lib/server/insights/sharing.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { CARD_KEYS, findOption, OPTION_KEYS, findCard } from '#lib/kids/wishDeck.js';
import { loadPet } from '../pet.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { childId, member } = await requireChild(event);
	return {
		firstName: member.display_name,
		pet: await loadPet(event.locals.supabase, childId)
	};
};

const PickSchema = z.object({
	card: z.enum(CARD_KEYS as [string, ...string[]]),
	option: z.enum(OPTION_KEYS as [string, ...string[]])
});
const ShareSchema = z.object({ wishId: z.string().uuid() });

export const actions: Actions = {
	/** Save a picked wish (private by default). */
	pick: async (event) => {
		const { childId, member } = await requireChild(event);
		const parsed = await parseForm(event.request, PickSchema, 'pick');
		if (!parsed.ok) return parsed.failure;

		const card = findCard(parsed.data.card);
		const option = findOption(parsed.data.card, parsed.data.option);
		if (!card || !option) return formFailure('pick', 'That card is not in the deck.', 400);

		const { data, error } = await event.locals.supabase
			.from('wish_cards')
			.insert({
				child_id: childId,
				family_id: member.family_id, // re-derived from child_id by the DB trigger
				prompt: card.prompt,
				interest: option.label,
				shared_with_parents: false
			})
			.select('id')
			.single();
		if (error || !data) {
			console.error('wish insert failed', error?.code);
			return formFailure('pick', 'Oops, Pebble could not save that. Try again?', 500);
		}
		return { form: 'pick', ok: true, wishId: data.id };
	},

	/** "Yes, tell them": share that one wish with both parents. */
	share: async (event) => {
		const { childId, member } = await requireChild(event);
		const parsed = await parseForm(event.request, ShareSchema, 'share');
		if (!parsed.ok) return parsed.failure;

		const result = await setWishShared(
			event.locals.supabase,
			{ childId, member, tz: safeTimeZone(event.cookies.get('tz')) },
			parsed.data.wishId,
			true
		);
		if (result === 'not_found') return formFailure('share', 'That wish is not here.', 404);
		if (result === 'error') return formFailure('share', 'Oops, try again?', 500);
		return { form: 'share', ok: true };
	}
};

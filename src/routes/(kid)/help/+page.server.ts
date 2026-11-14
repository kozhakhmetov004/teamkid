import { z } from 'zod';
import { requireChild } from '#lib/server/guards.js';
import { raiseSafetyAlert } from '#lib/server/safety.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { HELP_OPTIONS, helpOption } from '#lib/safety/help.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	await requireChild(event);
	return {};
};

const Schema = z.object({
	need: z.enum(HELP_OPTIONS.map((o) => o.key) as [string, ...string[]])
});

export const actions: Actions = {
	/**
	 * The child tapped a preset "I need a grown-up" choice. Both parents get a
	 * safety alert (level + category only; there is no free text to store).
	 */
	default: async (event) => {
		const { childId, member } = await requireChild(event);
		const parsed = await parseForm(event.request, Schema, 'help');
		if (!parsed.ok) return parsed.failure;
		const option = helpOption(parsed.data.need)!;

		try {
			await raiseSafetyAlert({
				childId,
				familyId: member.family_id,
				childMemberId: member.member_id,
				level: option.level,
				category: option.key
			});
		} catch {
			// The child still gets the safe reply; say it plainly that the alert failed.
			return formFailure('help', 'I couldn’t reach your grown-ups. Please go find one now.', 500);
		}
		return { form: 'help', ok: true, need: option.key };
	}
};

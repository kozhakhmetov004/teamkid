import { z } from 'zod';
import { loadInsight } from '#lib/components/insights/loadInsight.js';
import { safeTimeZone } from '#lib/custody/today.js';
import { requireChild } from '#lib/server/guards.js';
import { setWishShared } from '#lib/server/insights/sharing.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { loadPet } from '../pet.server.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { childId, member } = await requireChild(event);
	const sb = event.locals.supabase; // as the child (kid_read_own_insight policy)
	const [view, pet] = await Promise.all([loadInsight(sb, childId), loadPet(sb, childId)]);
	return { firstName: member.display_name, view, pet };
};

const UnshareSchema = z.object({ wishId: z.string().uuid() });

export const actions: Actions = {
	/** "Stop sharing": the wish goes back to private, then the summary is rebuilt. */
	unshare: async (event) => {
		const { childId, member } = await requireChild(event);
		const parsed = await parseForm(event.request, UnshareSchema, 'unshare');
		if (!parsed.ok) return parsed.failure;
		const result = await setWishShared(
			event.locals.supabase,
			{ childId, member, tz: safeTimeZone(event.cookies.get('tz')) },
			parsed.data.wishId,
			false
		);
		if (result === 'not_found') return formFailure('unshare', 'That wish is not here.', 404);
		if (result === 'error') return formFailure('unshare', 'Oops, try again?', 500);
		return { form: 'unshare', ok: true };
	}
};

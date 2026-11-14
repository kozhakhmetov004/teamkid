import {
	addChildAction,
	consentAction,
	createInviteAction,
	loadFamilyOverview
} from '#lib/server/family.js';
import { requireParent } from '#lib/server/guards.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { member } = await requireParent(event);
	return {
		meMemberId: member.member_id,
		overview: await loadFamilyOverview(event, member.family_id, member.member_id)
	};
};

export const actions: Actions = {
	invite: createInviteAction,
	addChild: addChildAction,
	consent: consentAction
};

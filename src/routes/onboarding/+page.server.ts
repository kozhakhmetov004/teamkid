import { redirect } from '@sveltejs/kit';
import {
	addChildAction,
	createFamilyAction,
	createInviteAction,
	loadFamilyOverview
} from '#lib/server/family.js';
import { requireUser } from '#lib/server/guards.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = await requireUser(event);
	const member = await event.locals.getMember();
	if (member?.role === 'child') redirect(303, '/pebble');
	if (member && member.role !== 'parent') redirect(303, '/');

	return {
		email: user.email ?? '',
		member,
		overview: member ? await loadFamilyOverview(event, member.family_id, member.member_id) : null
	};
};

export const actions: Actions = {
	createFamily: createFamilyAction,
	invite: createInviteAction,
	addChild: addChildAction
};

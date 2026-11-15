import { requireChild } from '#lib/server/guards.js';
import { loadPet } from '../pet.server.js';
import type { PageServerLoad } from './$types';

/** Only Pebble's look (name + shell colour); the breathing exercise itself saves nothing. */
export const load: PageServerLoad = async (event) => {
	const { childId } = await requireChild(event);
	const pet = await loadPet(event.locals.supabase, childId);
	return { pet: { name: pet.name, colorKey: pet.colorKey } };
};

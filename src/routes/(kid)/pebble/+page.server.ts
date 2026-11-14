import { requireChild } from '#lib/server/guards.js';
import type { PageServerLoad } from './$types';

const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' });

export const load: PageServerLoad = async (event) => {
	const { childId, member } = await requireChild(event);
	const sb = event.locals.supabase; // signed in as the child: RLS = own data only

	const now = new Date();
	const [pet, tonight] = await Promise.all([
		sb.from('pet_state').select('name, mood_shown').eq('child_id', childId).maybeSingle(),
		// "Where am I tonight?": the overnight event covering tonight, if any.
		sb
			.from('events')
			.select('title, home, starts_at')
			.lte('starts_at', new Date(now.getTime() + 12 * 3_600_000).toISOString())
			.gte('ends_at', now.toISOString())
			.not('home', 'is', null)
			.order('starts_at', { ascending: false })
			.limit(1)
			.maybeSingle()
	]);

	return {
		firstName: member.display_name,
		petName: pet.data?.name ?? 'Pebble',
		mood: pet.data?.mood_shown ?? 'happy',
		today: fmt.format(now),
		tonight: tonight.data?.title ?? null
	};
};

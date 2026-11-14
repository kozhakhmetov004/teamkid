import { z } from 'zod';
import { requireChild } from '#lib/server/guards.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import {
	canClaimPattern,
	currentPattern,
	nextLockedPattern,
	PET_NAMES,
	petLookFrom,
	SHELL_COLOR_KEYS,
	shellColorByKey
} from '#lib/kids/pet.js';
import { isoDate, partOfDay, partOfHour, utcDayStart } from '#lib/kids/time.js';
import { localHour, safeTimeZone } from '#lib/custody/today.js';
import type { Json } from '#lib/types/database.js';
import type { Actions, PageServerLoad } from './$types';

const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' });
const DAY_MS = 86_400_000;

type Sb = App.Locals['supabase'];

/**
 * Today's state for the signed-in child. Every query uses the child's own
 * session (RLS = own rows only) and reads ids/timestamps only, never content.
 */
async function loadToday(sb: Sb, childId: string, now: Date) {
	const dayStart = utcDayStart(now).toISOString();
	const [pet, checkin, wish, lastCheckin, lastWish] = await Promise.all([
		sb
			.from('pet_state')
			.select('name, colors, shell_patterns')
			.eq('child_id', childId)
			.maybeSingle(),
		sb
			.from('mood_checkins')
			.select('id')
			.eq('child_id', childId)
			.gte('created_at', dayStart)
			.limit(1),
		sb.from('wish_cards').select('id').eq('child_id', childId).gte('created_at', dayStart).limit(1),
		sb
			.from('mood_checkins')
			.select('created_at')
			.eq('child_id', childId)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle(),
		sb
			.from('wish_cards')
			.select('created_at')
			.eq('child_id', childId)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle()
	]);

	const last = [lastCheckin.data?.created_at, lastWish.data?.created_at]
		.filter((v): v is string => !!v)
		.map((v) => new Date(v).getTime())
		.sort((a, b) => b - a)[0];

	return {
		look: petLookFrom(pet.data),
		checkedInToday: (checkin.data?.length ?? 0) > 0,
		wishedToday: (wish.data?.length ?? 0) > 0,
		awayDays:
			last === undefined
				? null
				: Math.floor((utcDayStart(now).getTime() - utcDayStart(new Date(last)).getTime()) / DAY_MS)
	};
}

export const load: PageServerLoad = async (event) => {
	const { childId, member } = await requireChild(event);
	const sb = event.locals.supabase; // signed in as the child: RLS = own data only
	const now = new Date();
	const today = isoDate(now);
	const tz = safeTimeZone(event.cookies.get('tz'));

	const [state, tonight] = await Promise.all([
		loadToday(sb, childId, now),
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

	const { look } = state;
	return {
		firstName: member.display_name,
		pet: {
			name: look.name,
			colorKey: look.color.key,
			pattern: currentPattern(look.patterns),
			patterns: look.patterns
		},
		checkedInToday: state.checkedInToday,
		wishedToday: state.wishedToday,
		awayDays: state.awayDays,
		canClaim: canClaimPattern({
			checkedInToday: state.checkedInToday,
			wishedToday: state.wishedToday,
			owned: look.patterns,
			today
		}),
		claimedToday: look.patterns.some((p) => p.on === today),
		allUnlocked: nextLockedPattern(look.patterns) === null,
		// Greeting in the browser's time zone (tz cookie); "done today" stays UTC.
		part: tz === 'UTC' ? partOfDay(now) : partOfHour(localHour(now, tz)),
		tz,
		justDid:
			(['checkin', 'wishes'] as const).find((d) => d === event.url.searchParams.get('done')) ??
			null,
		today: fmt.format(now),
		tonight: tonight.data?.title ?? null
	};
};

const CustomizeSchema = z.object({
	name: z.enum(PET_NAMES),
	color: z.enum(SHELL_COLOR_KEYS)
});

export const actions: Actions = {
	/** Change Pebble's name/shell colour (preset values only). */
	customize: async (event) => {
		const { childId } = await requireChild(event);
		const parsed = await parseForm(event.request, CustomizeSchema, 'customize');
		if (!parsed.ok) return parsed.failure;

		const sb = event.locals.supabase;
		const { data: row } = await sb
			.from('pet_state')
			.select('colors')
			.eq('child_id', childId)
			.maybeSingle();
		const colors: Record<string, Json> =
			row?.colors && typeof row.colors === 'object' && !Array.isArray(row.colors)
				? { ...(row.colors as Record<string, Json>) }
				: {};
		colors.shell = shellColorByKey(parsed.data.color).hex;

		const { error } = await sb.from('pet_state').upsert(
			{
				child_id: childId,
				name: parsed.data.name,
				colors,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'child_id' }
		);
		if (error) return formFailure('customize', 'Could not save. Try again?', 500);
		return { form: 'customize', ok: true, name: parsed.data.name };
	},

	/** Unlock the next shell pattern. Eligibility is recomputed here, never trusted from the client. */
	claimShell: async (event) => {
		const { childId } = await requireChild(event);
		const sb = event.locals.supabase;
		const now = new Date();
		const today = isoDate(now);
		const state = await loadToday(sb, childId, now);

		const eligible = canClaimPattern({
			checkedInToday: state.checkedInToday,
			wishedToday: state.wishedToday,
			owned: state.look.patterns,
			today
		});
		const next = nextLockedPattern(state.look.patterns);
		if (!eligible || !next) {
			return formFailure('claimShell', 'No present to open right now.', 409);
		}

		const patterns: Json = [...state.look.patterns, { key: next, on: today }].map((p) => ({
			key: p.key,
			on: p.on
		}));
		const { error } = await sb
			.from('pet_state')
			.upsert(
				{ child_id: childId, shell_patterns: patterns, updated_at: now.toISOString() },
				{ onConflict: 'child_id' }
			);
		if (error) return formFailure('claimShell', 'Could not open the present. Try again?', 500);
		return { form: 'claimShell', ok: true, pattern: next };
	}
};

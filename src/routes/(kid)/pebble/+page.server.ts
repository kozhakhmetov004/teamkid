import { z } from 'zod';
import { HELP_OPTIONS } from '#lib/safety/help.js';
import { requireChild } from '#lib/server/guards.js';
import { classifySafety, raiseSafetyAlert } from '#lib/server/safety.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import {
	canClaimPattern,
	checkPetName,
	currentPattern,
	nextLockedPattern,
	PET_NAME_RETRY,
	PET_NAMES,
	petLookFrom,
	SHELL_COLOR_KEYS,
	shellColorByKey
} from '#lib/kids/pet.js';
import { parsePond } from '#lib/kids/pond.js';
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
			.select('name, colors, shell_patterns, pond')
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
		pondFriends: parsePond(pet.data?.pond).friends.length,
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
		// kid_calendar(): safe columns only, never hidden events (see the migration).
		sb.rpc('kid_calendar', {
			p_from: now.toISOString(),
			p_to: new Date(now.getTime() + 12 * 3_600_000).toISOString()
		})
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
		pondFriends: state.pondFriends,
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
		// The custody night covering tonight (latest start), if any.
		tonight:
			(tonight.data ?? []).filter((e) => e.kind === 'custody' && e.home).at(-1)?.title ?? null
	};
};

const CustomizeSchema = z.object({
	// a preset, or the child's own name (checked in the action)
	name: z.string().max(60),
	color: z.enum(SHELL_COLOR_KEYS)
});

export const actions: Actions = {
	/**
	 * Change Pebble's name and shell colour. A typed name gets the same treatment as
	 * a typed wish idea: safety check first (big feelings → Pebble's calm reply, help
	 * link and, for a crisis, an alert to both parents; the name is not saved), then
	 * checkPetName(). The raw text is never logged.
	 */
	customize: async (event) => {
		const { childId, member } = await requireChild(event);
		const parsed = await parseForm(event.request, CustomizeSchema, 'customize');
		if (!parsed.ok) return parsed.failure;

		let name = parsed.data.name;
		if (!(PET_NAMES as readonly string[]).includes(name)) {
			const safety = classifySafety(name);
			if (safety.level !== 'ok' && safety.category) {
				if (safety.level === 'crisis') {
					try {
						await raiseSafetyAlert({
							childId,
							familyId: member.family_id,
							childMemberId: member.member_id,
							level: safety.level,
							category: safety.category
						});
					} catch {
						console.error('safety alert from pet name failed');
					}
				}
				const help = HELP_OPTIONS.find((o) => o.key === safety.category);
				return {
					form: 'customize',
					status: 'big_feeling' as const,
					reply:
						help?.reply ??
						'Thank you for telling me. That sounds really big. Please tell a grown-up you trust.'
				};
			}
			const check = checkPetName(name);
			if (!check.ok) return formFailure('customize', PET_NAME_RETRY[check.reason], 400);
			name = check.name;
		}

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
				name,
				colors,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'child_id' }
		);
		if (error) return formFailure('customize', 'Could not save. Try again?', 500);
		return { form: 'customize', ok: true, name };
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

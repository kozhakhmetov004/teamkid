import { z } from 'zod';
import { requireChild } from '#lib/server/guards.js';
import { serverEnv } from '#lib/server/env.js';
import { newSeed, signTicket, verifyTicket } from '#lib/server/pondToken.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { isoDate } from '#lib/kids/time.js';
import { petLookFrom } from '#lib/kids/pet.js';
import {
	applyFinish,
	canPlay,
	dealDeck,
	friendToday,
	isUnlocked,
	LEVELS,
	levelInfo,
	parsePond,
	playedToday,
	replay,
	toJson,
	type Level
} from '#lib/kids/pond.js';
import type { Actions, PageServerLoad } from './$types';

type Sb = App.Locals['supabase'];

/** The child's own pet_state row (RLS: only the child). */
async function loadPet(sb: Sb, childId: string) {
	const { data } = await sb
		.from('pet_state')
		.select('name, colors, shell_patterns, pond')
		.eq('child_id', childId)
		.maybeSingle();
	return { look: petLookFrom(data), pond: parsePond(data?.pond) };
}

export const load: PageServerLoad = async (event) => {
	const { childId } = await requireChild(event);
	const today = isoDate(new Date());
	const { look, pond } = await loadPet(event.locals.supabase, childId);
	return {
		pet: { name: look.name, colorKey: look.color.key },
		friends: pond.friends,
		best: pond.best,
		playedToday: playedToday(pond, today),
		canPlay: canPlay(pond, today),
		friendToday: friendToday(pond, today),
		levels: LEVELS.map((l) => ({ ...l, unlocked: isUnlocked(pond, l.level) }))
	};
};

const StartSchema = z.object({ level: z.coerce.number().int().min(1).max(3) });
const FinishSchema = z.object({
	ticket: z.string().min(10).max(500),
	flips: z
		.string()
		.max(2000)
		.regex(/^(\d{1,2})(,\d{1,2})*$/)
});

export const actions: Actions = {
	/** Deal a new deck. The browser gets the cards and a signed ticket. */
	start: async (event) => {
		const { childId } = await requireChild(event);
		const parsed = await parseForm(event.request, StartSchema, 'start');
		if (!parsed.ok) return parsed.failure;
		const today = isoDate(new Date());
		const { pond } = await loadPet(event.locals.supabase, childId);
		const info = levelInfo(parsed.data.level)!;
		if (!isUnlocked(pond, info.level)) {
			return formFailure('start', 'Find more pond friends to open this pond!', 403);
		}
		if (!canPlay(pond, today)) {
			return formFailure('start', 'Pebble is ready for a rest. Let’s play again tomorrow!', 429);
		}
		const seed = newSeed();
		return {
			form: 'start',
			level: info.level,
			deck: dealDeck(seed, info.pairs),
			ticket: signTicket({ childId, day: today, level: info.level, seed }, serverEnv.kidAuthSecret)
		};
	},

	/** Replays the flips on the server's own deck; rewards only a real finish. */
	finish: async (event) => {
		const { childId } = await requireChild(event);
		const parsed = await parseForm(event.request, FinishSchema, 'finish');
		if (!parsed.ok) return parsed.failure;
		const ticket = verifyTicket(parsed.data.ticket, serverEnv.kidAuthSecret);
		const now = new Date();
		const today = isoDate(now);
		const yesterday = isoDate(new Date(now.getTime() - 86_400_000));
		// A game started just before midnight UTC still counts (for today).
		if (
			!ticket ||
			ticket.childId !== childId ||
			(ticket.day !== today && ticket.day !== yesterday)
		) {
			return formFailure('finish', 'That game got lost in the pond. Let’s start a new one!', 400);
		}
		const info = levelInfo(ticket.level);
		if (!info) return formFailure('finish', 'Unknown pond.', 400);

		const deck = dealDeck(ticket.seed, info.pairs);
		const result = replay(deck, parsed.data.flips.split(',').map(Number));
		if (!result.valid || !result.complete) {
			return formFailure('finish', 'Let’s finish all the pairs first!', 400);
		}

		const sb = event.locals.supabase;
		const { pond } = await loadPet(sb, childId);
		const outcome = applyFinish(pond, {
			level: info.level as Level,
			moves: result.moves,
			seed: ticket.seed,
			today
		});
		const { error } = await sb
			.from('pet_state')
			.upsert(
				{ child_id: childId, pond: toJson(outcome.state), updated_at: now.toISOString() },
				{ onConflict: 'child_id' }
			);
		if (error) return formFailure('finish', 'Pebble couldn’t save that. Try again?', 500);

		return {
			form: 'finish',
			moves: result.moves,
			stars: outcome.stars,
			newBest: outcome.newBest,
			newFriend: outcome.newFriend,
			unlocked: outcome.unlocked
		};
	}
};

/**
 * "Pond Pairs": Pebble's calm memory game + the pond friends collection.
 *
 * Design (kids 6–12, README safety rules):
 *  - Match pairs of Pebble's pond friends; each match teaches a tiny true fact.
 *  - No timer, no losing: every finished game earns 1–3 stars.
 *  - One NEW pond friend per day at most (12 in total) → a reason to come back,
 *    without streaks or guilt (missing a day costs nothing).
 *  - Soft daily cap: after DAILY_GAMES games Pebble suggests a break.
 *  - Levels unlock with friends collected (3 → 6 → 8 pairs).
 *  - The server deals the deck from a seed and replays the flips, so the
 *    result (moves → stars) can't simply be claimed by the browser.
 * Pure module: no I/O.
 */
import type { Json } from '#lib/types/database.js';

export const POND_FRIENDS = [
	{ key: 'frog', emoji: '🐸', name: 'Frog', fact: 'Frogs can drink water through their skin!' },
	{ key: 'fish', emoji: '🐟', name: 'Fish', fact: 'Fish sleep with their eyes open.' },
	{
		key: 'duck',
		emoji: '🦆',
		name: 'Duck',
		fact: 'Duck feathers are waterproof, like a raincoat.'
	},
	{ key: 'snail', emoji: '🐌', name: 'Snail', fact: 'A snail carries its home, just like Pebble!' },
	{
		key: 'butterfly',
		emoji: '🦋',
		name: 'Butterfly',
		fact: 'Butterflies taste their food with their feet.'
	},
	{ key: 'crab', emoji: '🦀', name: 'Crab', fact: 'Most crabs walk sideways.' },
	{
		key: 'ladybug',
		emoji: '🐞',
		name: 'Ladybug',
		fact: 'One ladybug can eat about 50 tiny bugs in a day.'
	},
	{ key: 'otter', emoji: '🦦', name: 'Otter', fact: 'Sea otters hold hands while they sleep.' },
	{
		key: 'lotus',
		emoji: '🪷',
		name: 'Lotus',
		fact: 'Lotus flowers close at night and open in the sun.'
	},
	{
		key: 'beaver',
		emoji: '🦫',
		name: 'Beaver',
		fact: 'Beavers build their homes out of sticks and mud.'
	},
	{ key: 'swan', emoji: '🦢', name: 'Swan', fact: 'Baby swans ride on their parents’ backs.' },
	{ key: 'shrimp', emoji: '🦐', name: 'Shrimp', fact: 'Some shrimp glow in the dark!' }
] as const;

export type FriendKey = (typeof POND_FRIENDS)[number]['key'];
export const FRIEND_KEYS = POND_FRIENDS.map((f) => f.key) as FriendKey[];
export const friendByKey = (key: string) => POND_FRIENDS.find((f) => f.key === key) ?? null;

export const LEVELS = [
	{ level: 1, name: 'Little pond', pairs: 3, cols: 3, unlockAt: 0 },
	{ level: 2, name: 'Lily pads', pairs: 6, cols: 4, unlockAt: 2 },
	{ level: 3, name: 'Big lake', pairs: 8, cols: 4, unlockAt: 5 }
] as const;
export type Level = (typeof LEVELS)[number]['level'];
export const levelInfo = (level: number) => LEVELS.find((l) => l.level === level) ?? null;

export const DAILY_GAMES = 5;

// ---- state --------------------------------------------------------------------------

export interface PondState {
	friends: { key: FriendKey; on: string }[];
	day: string | null;
	played: number;
	best: Partial<Record<Level, number>>;
}

export const EMPTY_POND: PondState = { friends: [], day: null, played: 0, best: {} };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Tolerant parse of pet_state.pond (unknown/old shapes → safe defaults). */
export function parsePond(raw: Json | null | undefined): PondState {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_POND, best: {} };
	const r = raw as Record<string, Json | undefined>;
	const seen = new Set<string>();
	const friends = (Array.isArray(r.friends) ? r.friends : [])
		.map((f) => (f && typeof f === 'object' && !Array.isArray(f) ? f : null))
		.filter((f): f is Record<string, Json> => !!f)
		.filter(
			(f) =>
				typeof f.key === 'string' &&
				FRIEND_KEYS.includes(f.key as FriendKey) &&
				typeof f.on === 'string' &&
				ISO_DAY.test(f.on)
		)
		.filter((f) => !seen.has(f.key as string) && !!seen.add(f.key as string))
		.map((f) => ({ key: f.key as FriendKey, on: f.on as string }));
	const best: PondState['best'] = {};
	if (r.best && typeof r.best === 'object' && !Array.isArray(r.best)) {
		for (const l of LEVELS) {
			const v = (r.best as Record<string, Json | undefined>)[String(l.level)];
			if (typeof v === 'number' && v >= 1 && v <= 3) best[l.level] = Math.floor(v);
		}
	}
	const day = typeof r.day === 'string' && ISO_DAY.test(r.day) ? r.day : null;
	const played = typeof r.played === 'number' && r.played >= 0 ? Math.floor(r.played) : 0;
	return { friends, day, played, best };
}

/** Always an object (the pond column is jsonb NOT NULL, object only). */
export function toJson(s: PondState): { [key: string]: Json } {
	return {
		friends: s.friends.map((f) => ({ key: f.key, on: f.on })),
		day: s.day,
		played: s.played,
		best: Object.fromEntries(Object.entries(s.best).map(([k, v]) => [k, v ?? 0]))
	};
}

/** Games played today (a new day starts at 0). */
export const playedToday = (s: PondState, today: string) => (s.day === today ? s.played : 0);
export const canPlay = (s: PondState, today: string) => playedToday(s, today) < DAILY_GAMES;
export const friendToday = (s: PondState, today: string) => s.friends.some((f) => f.on === today);
export const isUnlocked = (s: PondState, level: number) =>
	(levelInfo(level)?.unlockAt ?? Infinity) <= s.friends.length;

// ---- deck ----------------------------------------------------------------------------

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle<T>(items: T[], next: () => number): T[] {
	const a = [...items];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(next() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/** The deck for a seed: `pairs` different friends, each twice, shuffled. */
export function dealDeck(seed: number, pairs: number): FriendKey[] {
	const next = rng(seed);
	const chosen = shuffle(FRIEND_KEYS, next).slice(0, pairs);
	return shuffle([...chosen, ...chosen], next);
}

// ---- play --------------------------------------------------------------------------

export interface ReplayResult {
	valid: boolean;
	complete: boolean;
	/** a move = turning over two cards */
	moves: number;
}

/**
 * Replays card flips (indexes, two per move). Invalid if a flip is out of
 * range, re-flips a matched card, or flips the same card twice in one move.
 */
export function replay(deck: readonly string[], flips: readonly number[]): ReplayResult {
	const matched = new Set<number>();
	let moves = 0;
	if (flips.length % 2 !== 0 || flips.length > deck.length * 20) {
		return { valid: false, complete: false, moves: 0 };
	}
	for (let i = 0; i < flips.length; i += 2) {
		const a = flips[i];
		const b = flips[i + 1];
		const ok = (n: number) => Number.isInteger(n) && n >= 0 && n < deck.length && !matched.has(n);
		if (!ok(a) || !ok(b) || a === b) return { valid: false, complete: false, moves };
		moves += 1;
		if (deck[a] === deck[b]) {
			matched.add(a);
			matched.add(b);
		}
	}
	return { valid: true, complete: matched.size === deck.length, moves };
}

/**
 * Stars from moves. Perfect play = `pairs` moves; a careful player with a
 * good memory needs ≈1.5×. 3★ up to 1.75×, 2★ up to 2.75×, else 1★
 * (finishing always earns at least one star).
 */
export function starsFor(pairs: number, moves: number): 1 | 2 | 3 {
	if (moves <= Math.ceil(pairs * 1.75)) return 3;
	if (moves <= Math.ceil(pairs * 2.75)) return 2;
	return 1;
}

// ---- rewards -----------------------------------------------------------------------

export interface FinishOutcome {
	state: PondState;
	stars: 1 | 2 | 3;
	newBest: boolean;
	newFriend: FriendKey | null;
	/** levels that this game unlocked */
	unlocked: Level[];
}

/** Applies a finished game. One new friend per day; picked by the game's seed. */
export function applyFinish(
	prev: PondState,
	input: { level: Level; moves: number; seed: number; today: string }
): FinishOutcome {
	const info = levelInfo(input.level)!;
	const stars = starsFor(info.pairs, input.moves);
	const played = playedToday(prev, input.today) + 1;
	const best = { ...prev.best };
	const newBest = (best[input.level] ?? 0) < stars;
	if (newBest) best[input.level] = stars;

	let friends = prev.friends;
	let newFriend: FriendKey | null = null;
	const locked = FRIEND_KEYS.filter((k) => !prev.friends.some((f) => f.key === k));
	if (!friendToday(prev, input.today) && locked.length) {
		newFriend = locked[Math.floor(rng(input.seed ^ 0x5eed)() * locked.length)];
		friends = [...prev.friends, { key: newFriend, on: input.today }];
	}

	const state: PondState = { friends, day: input.today, played, best };
	const unlocked = LEVELS.filter(
		(l) => !isUnlocked(prev, l.level) && isUnlocked(state, l.level)
	).map((l) => l.level);
	return { state, stars, newBest, newFriend, unlocked };
}

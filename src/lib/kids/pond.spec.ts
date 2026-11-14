import { describe, expect, it } from 'vitest';
import {
	applyFinish,
	canPlay,
	DAILY_GAMES,
	dealDeck,
	EMPTY_POND,
	FRIEND_KEYS,
	isUnlocked,
	parsePond,
	replay,
	starsFor,
	toJson,
	type PondState
} from './pond';

const today = '2026-11-15';

/** Perfect play: flip each pair together. */
function perfectFlips(deck: string[]): number[] {
	const flips: number[] = [];
	const done = new Set<number>();
	deck.forEach((k, i) => {
		if (done.has(i)) return;
		const j = deck.findIndex((m, idx) => idx !== i && m === k);
		flips.push(i, j);
		done.add(i).add(j);
	});
	return flips;
}

describe('dealDeck', () => {
	it('is deterministic per seed and has each friend exactly twice', () => {
		const a = dealDeck(42, 6);
		expect(dealDeck(42, 6)).toEqual(a);
		expect(a).toHaveLength(12);
		const counts = new Map<string, number>();
		for (const k of a) counts.set(k, (counts.get(k) ?? 0) + 1);
		expect([...counts.values()].every((n) => n === 2)).toBe(true);
		expect(counts.size).toBe(6);
		expect(dealDeck(43, 6)).not.toEqual(a);
	});
});

describe('replay', () => {
	const deck = dealDeck(7, 3);

	it('completes a perfect game in `pairs` moves', () => {
		expect(replay(deck, perfectFlips(deck))).toEqual({ valid: true, complete: true, moves: 3 });
	});

	it('counts misses as moves', () => {
		const miss = deck.findIndex((k) => k !== deck[0]);
		const flips = [0, miss, ...perfectFlips(deck)];
		expect(replay(deck, flips)).toMatchObject({ valid: true, complete: true, moves: 4 });
	});

	it('rejects cheating flips', () => {
		expect(replay(deck, [0, 0]).valid).toBe(false); // same card twice
		expect(replay(deck, [0, 99]).valid).toBe(false); // out of range
		expect(replay(deck, [0]).valid).toBe(false); // half a move
		const flips = perfectFlips(deck);
		expect(replay(deck, [...flips.slice(0, 2), flips[0], flips[2]]).valid).toBe(false); // matched card
	});

	it('is not complete when pairs remain', () => {
		expect(replay(deck, perfectFlips(deck).slice(0, 2))).toMatchObject({
			valid: true,
			complete: false
		});
	});
});

describe('starsFor', () => {
	it('is generous but rewards a good memory', () => {
		expect(starsFor(3, 3)).toBe(3);
		expect(starsFor(3, 6)).toBe(3);
		expect(starsFor(3, 7)).toBe(2);
		expect(starsFor(8, 14)).toBe(3);
		expect(starsFor(8, 22)).toBe(2);
		expect(starsFor(8, 40)).toBe(1);
	});
});

describe('applyFinish', () => {
	it('gives one new friend per day, then only stars', () => {
		const first = applyFinish(EMPTY_POND, { level: 1, moves: 3, seed: 1, today });
		expect(first.newFriend).not.toBeNull();
		expect(first.stars).toBe(3);
		expect(first.newBest).toBe(true);
		expect(first.state.played).toBe(1);

		const second = applyFinish(first.state, { level: 1, moves: 9, seed: 2, today });
		expect(second.newFriend).toBeNull();
		expect(second.state.friends).toHaveLength(1);
		expect(second.state.best[1]).toBe(3); // keeps the best
		expect(second.newBest).toBe(false);

		const tomorrow = applyFinish(second.state, {
			level: 1,
			moves: 3,
			seed: 3,
			today: '2026-11-16'
		});
		expect(tomorrow.newFriend).not.toBeNull();
		expect(tomorrow.state.friends).toHaveLength(2);
		expect(tomorrow.state.played).toBe(1); // new day resets the count
		expect(tomorrow.newFriend).not.toBe(first.newFriend);
	});

	it('unlocks levels as friends are collected', () => {
		const one: PondState = { ...EMPTY_POND, friends: [{ key: 'frog', on: '2026-11-01' }] };
		expect(isUnlocked(one, 2)).toBe(false);
		const out = applyFinish(one, { level: 1, moves: 3, seed: 5, today });
		expect(out.unlocked).toEqual([2]);
		expect(isUnlocked(out.state, 2)).toBe(true);
		expect(isUnlocked(out.state, 3)).toBe(false);
	});

	it('stops giving friends when the collection is complete', () => {
		const all: PondState = {
			...EMPTY_POND,
			friends: FRIEND_KEYS.map((key) => ({ key, on: '2026-11-01' }))
		};
		expect(applyFinish(all, { level: 3, moves: 8, seed: 9, today }).newFriend).toBeNull();
	});
});

describe('daily cap and parsing', () => {
	it('suggests a break after the daily games', () => {
		const s: PondState = { ...EMPTY_POND, day: today, played: DAILY_GAMES };
		expect(canPlay(s, today)).toBe(false);
		expect(canPlay(s, '2026-11-16')).toBe(true);
	});

	it('round-trips and ignores junk', () => {
		const s: PondState = {
			friends: [{ key: 'otter', on: today }],
			day: today,
			played: 2,
			best: { 1: 3 }
		};
		expect(parsePond(toJson(s))).toEqual(s);
		expect(
			parsePond({
				friends: [
					{ key: 'dragon', on: today },
					{ key: 'otter', on: today },
					{ key: 'otter', on: today }
				],
				played: -4,
				best: { 1: 9 }
			})
		).toEqual({ friends: [{ key: 'otter', on: today }], day: null, played: 0, best: {} });
		expect(parsePond(null)).toEqual(EMPTY_POND);
	});
});

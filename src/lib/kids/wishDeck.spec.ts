import { describe, expect, it } from 'vitest';
import {
	findOption,
	isTheme,
	OPTION_KEYS,
	themeLabel,
	themeOfInterest,
	WISH_DECK
} from './wishDeck.js';

describe('wish deck integrity', () => {
	it('has at least 8 cards, each with exactly 3 options', () => {
		expect(WISH_DECK.length).toBeGreaterThanOrEqual(8);
		for (const card of WISH_DECK) expect(card.options).toHaveLength(3);
	});

	it('uses unique card keys, unique option keys and unique labels', () => {
		expect(new Set(WISH_DECK.map((c) => c.key)).size).toBe(WISH_DECK.length);
		const options = WISH_DECK.flatMap((c) => c.options);
		expect(new Set(options.map((o) => o.key)).size).toBe(options.length);
		expect(new Set(options.map((o) => o.label.toLowerCase())).size).toBe(options.length);
		expect(OPTION_KEYS).toHaveLength(options.length);
	});

	it('gives every option an icon, a valid theme and a label that fits wish_cards.interest', () => {
		for (const o of WISH_DECK.flatMap((c) => c.options)) {
			expect(o.icon.length).toBeGreaterThan(0);
			expect(isTheme(o.theme), o.key).toBe(true);
			expect(o.label.length).toBeGreaterThan(0);
			expect(o.label.length).toBeLessThanOrEqual(200);
			expect(o.ask).toBe(o.ask.toLowerCase());
		}
	});

	it('contains the demo options', () => {
		expect(findOption('free-saturday', 'zoo')?.label).toBe('Go to the zoo');
		expect(findOption('free-saturday', 'fort')?.label).toBe('Build a fort');
		expect(findOption('free-saturday', 'nope')).toBeUndefined();
	});
});

describe('themeOfInterest', () => {
	it('maps deck labels (case-insensitive) and old seed labels to themes', () => {
		expect(themeOfInterest('Go to the zoo')).toBe('animals');
		expect(themeOfInterest('  build a FORT ')).toBe('forts');
		expect(themeOfInterest('Build a blanket fort')).toBe('forts');
		expect(themeOfInterest('A puppy named Biscuit')).toBe('animals');
	});

	it('returns null for anything unknown (raw text is never passed through)', () => {
		expect(themeOfInterest('my secret hideout at 12 Elm St')).toBeNull();
		expect(themeLabel('my secret hideout')).toBeNull();
		expect(themeLabel('outdoors')).toBe('being outdoors');
	});
});

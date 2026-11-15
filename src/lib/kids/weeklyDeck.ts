/**
 * Weekly wish cards (pure logic, no I/O). The server builds one deck per child
 * per UTC week, usually with the AI, and falls back to the fixed deck below.
 *
 * Cards:
 *   activity: "question of the week", things to do with a parent this weekend (pick 1–3)
 *   interest: "What are you into right now?" (multi-select)
 *   gift:     only when the birthday is within 30 days (pick up to 3)
 * Every card also has "Other ✏️" (typed idea, max 100 chars, checked on the server).
 *
 * Relative imports only (scripts import this file too).
 */
import { BANNED_WORDS } from './pebbleLines.js';
import { THEMES, WISH_DECK, isTheme, type Theme } from './wishDeck.js';

export const CARD_KINDS = ['everyday', 'interest', 'activity', 'gift'] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const MAX_PICKS: Record<CardKind, number> = {
	everyday: 3,
	activity: 3,
	interest: 6,
	gift: 3
};
export const IDEA_MAX = 100;
export const LABEL_MAX = 28;

export interface DeckOption {
	key: string;
	label: string;
	emoji: string;
	tags: Theme[];
}

export interface DeckCard {
	/** wish_questions.id (daily cards). */
	id?: string;
	kind: CardKind;
	prompt: string;
	max: number;
	options: DeckOption[];
}

export interface WeeklyDeck {
	cards: DeckCard[];
}

export const DEFAULT_PROMPTS: Record<CardKind, string> = {
	everyday: 'What made you smile today?',
	activity: 'What should we do this weekend?',
	interest: 'What are you into right now?',
	gift: 'What kind of present would you like?'
};

export const THEME_EMOJI: Record<Theme, string> = {
	animals: '🐾',
	forts: '🏰',
	baking: '🧁',
	outdoors: '🌳',
	art: '🎨',
	swimming: '🏊',
	movies: '🍿',
	games: '🎲',
	science: '🔬',
	books: '📚',
	building: '🧱',
	sports: '⚽',
	music: '🎵'
};

const GIFT_FALLBACK: DeckOption[] = [
	{ key: 'gift-art', label: 'Art supplies', emoji: '🎨', tags: ['art'] },
	{ key: 'gift-books', label: 'Books', emoji: '📚', tags: ['books'] },
	{ key: 'gift-building', label: 'Building sets', emoji: '🧱', tags: ['building'] },
	{ key: 'gift-games', label: 'Board games', emoji: '🎲', tags: ['games'] },
	{ key: 'gift-sports', label: 'Sports gear', emoji: '⚽', tags: ['sports', 'outdoors'] },
	{ key: 'gift-science', label: 'Science kit', emoji: '🔬', tags: ['science'] }
];

// ---------------------------------------------------------------------------
// Small text helpers
// ---------------------------------------------------------------------------
export function slug(text: string): string {
	return (
		text
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 40) || 'option'
	);
}

const STOP = new Set(['the', 'and', 'with', 'for', 'our', 'your', 'some', 'have', 'make', 'play']);
const words = (s: string) =>
	s
		.toLowerCase()
		.split(/[^a-z]+/)
		.filter((w) => w.length >= 3 && !STOP.has(w))
		.map((w) => w.replace(/s$/, ''));

/** True when an option repeats something already on the weekend calendar. */
export function overlapsPlanned(label: string, plannedTitles: readonly string[]): boolean {
	const mine = new Set(words(label));
	return plannedTitles.some((t) => words(t).some((w) => mine.has(w)));
}

/** Words that never belong on a child's card (on top of Pebble's BANNED_WORDS). */
const UNSAFE =
	/\b(kill(s|ing)?|guns?|knife|knives|weapons?|blood|drugs?|beer|wine|alcohol|vap(e|ing)|smok(e|ing)|sexy?|casino|betting|gambl(e|ing)|horror|diet(ing)?)\b/i;
const RUDE =
	/\b(stupid|idiots?|dumb|shut up|hate|poop|butt|fart|crap|damn|hell|sh[i1]t\w*|f+u+c+k\w*|bitch\w*)\b/i;

export function isKidSafe(text: string): boolean {
	const t = text.toLowerCase();
	return !UNSAFE.test(t) && !RUDE.test(t) && !BANNED_WORDS.some((w) => t.includes(w));
}

/** Pebble's gentle "try again" line for a typed idea it can't use. */
export const IDEA_RETRY: Record<'empty' | 'too_long' | 'personal' | 'nonsense' | 'rude', string> = {
	empty: 'Type your idea in the box, then tap Save.',
	too_long: 'That’s a big idea! Can you say it in fewer words?',
	personal:
		'Let’s keep things like numbers, links and addresses private. Can you tell me your idea another way?',
	nonsense: 'Hmm, I didn’t quite get that. Can you try typing it again?',
	rude: 'Let’s use kind words. Can you try telling me your idea another way?'
};

/** Days until the next birthday (0 = today), or null without a birthday. */
export function daysToBirthday(birthday: string | null | undefined, today: string): number | null {
	if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null;
	const [, m, d] = birthday.split('-').map(Number);
	const t = Date.parse(`${today}T00:00:00Z`);
	const year = Number(today.slice(0, 4));
	for (const y of [year, year + 1]) {
		// Feb 29 birthdays are celebrated on Feb 28 in other years.
		const leap = new Date(Date.UTC(y, 1, 29)).getUTCMonth() === 1;
		const day = m === 2 && d === 29 && !leap ? 28 : d;
		const next = Date.UTC(y, m - 1, day);
		if (next >= t) return Math.round((next - t) / 86_400_000);
	}
	return null;
}

export const birthdaySoon = (birthday: string | null | undefined, today: string) => {
	const days = daysToBirthday(birthday, today);
	return days !== null && days <= 30;
};

// ---------------------------------------------------------------------------
// Fallback deck (the fixed questions) + cleaning of the AI's deck
// ---------------------------------------------------------------------------
const FIXED_ACTIVITIES: DeckOption[] = WISH_DECK.flatMap((c) =>
	c.options.map((o) => ({ key: o.key, label: o.label, emoji: o.icon, tags: [o.theme] }))
);

export function fallbackCard(kind: CardKind, planned: readonly string[] = []): DeckCard {
	let options: DeckOption[];
	if (kind === 'activity') {
		options = FIXED_ACTIVITIES.filter((o) => !overlapsPlanned(o.label, planned)).slice(0, 6);
	} else if (kind === 'interest' || kind === 'everyday') {
		options = (Object.keys(THEMES) as Theme[]).slice(0, 9).map((t) => ({
			key: `into-${t}`,
			label: THEMES[t][0].toUpperCase() + THEMES[t].slice(1),
			emoji: THEME_EMOJI[t],
			tags: [t]
		}));
	} else {
		options = GIFT_FALLBACK;
	}
	return { kind, prompt: DEFAULT_PROMPTS[kind], max: MAX_PICKS[kind], options };
}

export function fallbackDeck(opts: { planned?: string[]; gift: boolean }): WeeklyDeck {
	const kinds: CardKind[] = opts.gift ? ['activity', 'interest', 'gift'] : ['activity', 'interest'];
	return { cards: kinds.map((k) => fallbackCard(k, opts.planned)) };
}

/** What the model returns for one card (validated by zod on the server). */
export interface RawCard {
	prompt?: string;
	options: { label: string; emoji: string; tags: string[] }[];
}

const EMOJI_RE = /\p{Extended_Pictographic}/u;

/**
 * Keep only safe, short, unplanned, distinct options. A card with fewer than 3
 * good options is replaced by its fallback card.
 */
export function cleanCard(
	kind: CardKind,
	raw: RawCard | undefined,
	planned: readonly string[]
): { card: DeckCard; fromAi: boolean } {
	const options = cleanOptions(kind, raw, planned);
	if (options.length < 3) return { card: fallbackCard(kind, planned), fromAi: false };
	const prompt = raw?.prompt?.trim();
	return {
		card: {
			kind,
			prompt: prompt && prompt.length <= 60 && isKidSafe(prompt) ? prompt : DEFAULT_PROMPTS[kind],
			max: MAX_PICKS[kind],
			options
		},
		fromAi: true
	};
}

/** Safe, short, unplanned (activities), distinct options; at most 8. */
export function cleanOptions(
	kind: CardKind,
	raw: RawCard | undefined,
	planned: readonly string[]
): DeckOption[] {
	const seen = new Set<string>();
	const options: DeckOption[] = [];
	for (const o of raw?.options ?? []) {
		const label = o.label.replace(/\s+/g, ' ').trim();
		if (!label || label.length > LABEL_MAX || !isKidSafe(label)) continue;
		if (kind === 'activity' && overlapsPlanned(label, planned)) continue;
		const key = slug(label);
		if (seen.has(key)) continue;
		seen.add(key);
		const emoji = EMOJI_RE.test(o.emoji) ? [...o.emoji.trim()].slice(0, 4).join('') : '⭐';
		options.push({ key, label, emoji, tags: o.tags.filter(isTheme).slice(0, 3) });
		if (options.length === 8) break;
	}
	return options;
}

// ---------------------------------------------------------------------------
// The child's typed "Other" idea
// ---------------------------------------------------------------------------
export type IdeaPrecheck =
	| { ok: true; text: string }
	| { ok: false; reason: 'empty' | 'too_long' | 'personal' | 'nonsense' | 'rude' };

/** Fast local checks before anything else sees the text. Safety (big feelings) runs separately. */
export function precheckIdea(input: string): IdeaPrecheck {
	const text = input.normalize('NFKC').replace(/\s+/g, ' ').trim();
	if (!text) return { ok: false, reason: 'empty' };
	if (text.length > IDEA_MAX) return { ok: false, reason: 'too_long' };
	// Personal info: links, emails, long numbers (phone, address).
	if (/https?:|www\.|@|\d{4,}/i.test(text)) return { ok: false, reason: 'personal' };
	if (RUDE.test(text) || UNSAFE.test(text)) return { ok: false, reason: 'rude' };
	const letters = text.replace(/[^\p{L}]/gu, '');
	if (letters.length < 2 || /(.)\1{4,}/.test(letters) || !/[aeiouy]/i.test(letters)) {
		return { ok: false, reason: 'nonsense' };
	}
	return { ok: true, text };
}

const TAG_WORDS: [RegExp, Theme][] = [
	[/horse|pony|dog|cat|puppy|kitten|zoo|farm|animal|bird|fish|bunny|dino/i, 'animals'],
	[/park|hike|bike|outside|camp|beach|garden|forest|picnic|tree|snow/i, 'outdoors'],
	[/draw|paint|art|craft|color|clay/i, 'art'],
	[/swim|pool|water/i, 'swimming'],
	[/bake|cook|cake|cookie|pizza|pancake/i, 'baking'],
	[/movie|film|cinema|show/i, 'movies'],
	[/game|puzzle|cards|video/i, 'games'],
	[/science|space|star|planet|robot|experiment/i, 'science'],
	[/book|read|story|library/i, 'books'],
	[/lego|block|build/i, 'building'],
	[/soccer|ball|sport|skate|run|climb|gym/i, 'sports'],
	[/music|sing|song|dance|piano|guitar|drum/i, 'music'],
	[/fort|tent|den/i, 'forts']
];

/** Rule-based clean-up, used when the AI is off or fails: short label + tags. */
export function fallbackIdea(text: string): { label: string; emoji: string; tags: Theme[] } {
	const clean = text
		.replace(/[^\p{L}\p{N}\s'-]/gu, '')
		.replace(/\s+/g, ' ')
		.trim();
	let label = clean.length > LABEL_MAX ? clean.slice(0, LABEL_MAX).replace(/\s\S*$/, '') : clean;
	label = label.charAt(0).toUpperCase() + label.slice(1);
	const tags = [...new Set(TAG_WORDS.filter(([re]) => re.test(clean)).map(([, t]) => t))].slice(
		0,
		3
	);
	return { label, emoji: tags[0] ? THEME_EMOJI[tags[0]] : '✏️', tags };
}

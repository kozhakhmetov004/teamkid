/**
 * Daily wish cards (pure logic, no I/O). Each day the child gets 1-2 new
 * questions; the server asks the AI for them and falls back to the bank below.
 *
 * - dayPlan(): which kinds today (weekend activities mostly Wed-Fri, the
 *   present card at most twice a week while the birthday is within 30 days).
 * - isRepeat(): too similar to a question from the last 14 days.
 * - fallbackQuestion(): a bank question she hasn't seen recently.
 * - replaceableIds(): on refresh, only unanswered cards may be replaced.
 * Relative imports only.
 */
import {
	DEFAULT_PROMPTS,
	MAX_PICKS,
	fallbackCard,
	type CardKind,
	type DeckCard,
	type DeckOption
} from './weeklyDeck.js';
import type { Theme } from './wishDeck.js';

export const RECENT_DAYS = 14;

/** UTC weekday of a 'YYYY-MM-DD' (0 = Sunday). */
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);

/**
 * Kinds for today's cards (1-2).
 * Wed-Fri: a weekend-activity card + one other; Mon/Tue: everyday + interest;
 * Sat/Sun: one everyday card. The present card replaces the second card at most
 * twice a week, never two days in a row.
 */
export function dayPlan(opts: {
	date: string;
	birthdaySoon: boolean;
	giftsThisWeek: number;
	giftYesterday: boolean;
}): CardKind[] {
	const dow = weekday(opts.date);
	const alt: CardKind = dayNumber(opts.date) % 2 ? 'everyday' : 'interest';
	let kinds: CardKind[];
	if (dow >= 3 && dow <= 5) kinds = ['activity', alt];
	else if (dow === 1 || dow === 2) kinds = ['everyday', 'interest'];
	else kinds = ['everyday'];
	if (opts.birthdaySoon && opts.giftsThisWeek < 2 && !opts.giftYesterday) {
		kinds = kinds.length === 2 ? [kinds[0], 'gift'] : [...kinds, 'gift'];
	}
	return kinds;
}

const words = (s: string) =>
	new Set(
		s
			.toLowerCase()
			.replace(/[^a-z\s]/g, ' ')
			.split(/\s+/)
			.filter((w) => w.length > 2 && !['you', 'the', 'what', 'would', 'your', 'are'].includes(w))
	);

/** Jaccard similarity of the meaningful words of two questions (0..1). */
export function similarity(a: string, b: string): number {
	const x = words(a);
	const y = words(b);
	if (!x.size || !y.size) return a.trim().toLowerCase() === b.trim().toLowerCase() ? 1 : 0;
	let both = 0;
	for (const w of x) if (y.has(w)) both++;
	return both / (x.size + y.size - both);
}

/** True when `prompt` is (nearly) a question she already got recently. */
export function isRepeat(prompt: string, recent: readonly string[], threshold = 0.5): boolean {
	return recent.some((r) => similarity(prompt, r) >= threshold);
}

const opt = (label: string, emoji: string, tags: Theme[] = []): DeckOption => ({
	key: label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, ''),
	label,
	emoji,
	tags
});

/** Fallback bank (child-safe, short). Activities/gifts reuse the fixed deck. */
const BANK: Record<'everyday' | 'interest', { prompt: string; options: DeckOption[] }[]> = {
	everyday: [
		{
			prompt: 'What made you laugh today?',
			options: [
				opt('A funny animal', '🐶', ['animals']),
				opt('A silly joke', '😂'),
				opt('A funny show', '📺', ['movies']),
				opt('A friend', '🧒'),
				opt('A game', '🎲', ['games'])
			]
		},
		{
			prompt: 'What would you like to try someday?',
			options: [
				opt('Ice skating', '⛸️', ['sports']),
				opt('Cooking a meal', '🍳', ['baking']),
				opt('Camping', '⛺', ['outdoors']),
				opt('Playing drums', '🥁', ['music']),
				opt('Making a comic', '🖍️', ['art'])
			]
		},
		{
			prompt: 'What is your favorite snack?',
			options: [
				opt('Fruit', '🍎'),
				opt('Popcorn', '🍿', ['movies']),
				opt('Cookies', '🍪', ['baking']),
				opt('Cheese', '🧀'),
				opt('Pretzels', '🥨')
			]
		},
		{
			prompt: 'What are you curious about?',
			options: [
				opt('Space', '🚀', ['science']),
				opt('Dinosaurs', '🦖', ['science', 'animals']),
				opt('The ocean', '🐳', ['animals']),
				opt('How things work', '⚙️', ['science', 'building']),
				opt('Volcanoes', '🌋', ['science'])
			]
		},
		{
			prompt: 'What is your favorite color right now?',
			options: [
				opt('Blue', '💙'),
				opt('Green', '💚'),
				opt('Purple', '💜'),
				opt('Red', '❤️'),
				opt('Yellow', '💛')
			]
		},
		{
			prompt: 'Which animal would be the best friend?',
			options: [
				opt('A puppy', '🐶', ['animals']),
				opt('A dolphin', '🐬', ['animals']),
				opt('A bunny', '🐰', ['animals']),
				opt('A dragon', '🐉', ['books']),
				opt('A turtle', '🐢', ['animals'])
			]
		},
		{
			prompt: 'What is the best part of a cozy day?',
			options: [
				opt('Blanket fort', '🏰', ['forts']),
				opt('Reading a story', '📚', ['books']),
				opt('Drawing', '🎨', ['art']),
				opt('Hot cocoa', '☕'),
				opt('Board games', '🎲', ['games'])
			]
		}
	],
	interest: [
		{ prompt: DEFAULT_PROMPTS.interest, options: fallbackCard('interest').options },
		{
			prompt: 'Which of these do you love lately?',
			options: [
				opt('Drawing', '🎨', ['art']),
				opt('Building', '🧱', ['building']),
				opt('Animals', '🐾', ['animals']),
				opt('Music', '🎵', ['music']),
				opt('Sports', '⚽', ['sports']),
				opt('Stories', '📚', ['books'])
			]
		},
		{
			prompt: 'What could you do all day long?',
			options: [
				opt('Play outside', '🌳', ['outdoors']),
				opt('Make crafts', '✂️', ['art']),
				opt('Play games', '🎲', ['games']),
				opt('Swim', '🏊', ['swimming']),
				opt('Bake', '🧁', ['baking'])
			]
		}
	]
};

const ACTIVITY_PROMPTS = [
	'What should we do this weekend?',
	'Pick a fun weekend plan!',
	'What sounds fun for Saturday?'
];
const GIFT_PROMPTS = [
	'What kind of present would you like?',
	'Which birthday surprise sounds fun?'
];

/** A bank question for `kind` she hasn't seen recently (rotates by day). */
export function fallbackQuestion(
	kind: CardKind,
	recent: readonly string[],
	date: string,
	planned: readonly string[] = []
): DeckCard {
	const n = dayNumber(date);
	const pickPrompt = (list: readonly string[]) => {
		const rotated = [...list.slice(n % list.length), ...list.slice(0, n % list.length)];
		return rotated.find((p) => !isRepeat(p, recent)) ?? rotated[0];
	};
	if (kind === 'everyday' || kind === 'interest') {
		const bank = BANK[kind];
		const rotated = [...bank.slice(n % bank.length), ...bank.slice(0, n % bank.length)];
		const q = rotated.find((b) => !isRepeat(b.prompt, recent)) ?? rotated[0];
		return { kind, prompt: q.prompt, max: MAX_PICKS[kind], options: q.options };
	}
	const base = fallbackCard(kind, planned);
	const prompt = pickPrompt(kind === 'activity' ? ACTIVITY_PROMPTS : GIFT_PROMPTS);
	return { ...base, prompt };
}

/** On a refresh, only cards with no answers may be replaced. */
export function replaceableIds(
	questions: readonly { id: string }[],
	answeredQuestionIds: Iterable<string | null>
): string[] {
	const answered = new Set(answeredQuestionIds);
	return questions.filter((q) => !answered.has(q.id)).map((q) => q.id);
}

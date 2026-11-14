/**
 * Wish cards: fun questions with 3 picture options each (clicks only).
 *
 * - `label` is what wish_cards.interest stores (readable for parents and the planner).
 * - `key` is a stable id; `theme` is what weekly_insights.interests stores.
 * - `ask` completes Pebble's question "…you'd love to {ask}?".
 * Relative imports only: the seed script (tsx) imports this file too.
 */

export const THEMES = {
	animals: 'animals',
	forts: 'forts',
	baking: 'baking',
	outdoors: 'being outdoors',
	art: 'art',
	swimming: 'swimming',
	movies: 'movies',
	games: 'games',
	science: 'science',
	books: 'books',
	building: 'building',
	sports: 'sports',
	music: 'music'
} as const;
export type Theme = keyof typeof THEMES;

export interface WishOption {
	key: string;
	label: string;
	ask: string;
	icon: string;
	theme: Theme;
}

export interface WishCard {
	key: string;
	prompt: string;
	options: readonly [WishOption, WishOption, WishOption];
}

export const WISH_DECK: readonly WishCard[] = [
	{
		key: 'free-saturday',
		prompt: 'If we had a free Saturday…',
		options: [
			{ key: 'zoo', label: 'Go to the zoo', ask: 'go to the zoo', icon: '🦒', theme: 'animals' },
			{ key: 'cookies', label: 'Bake cookies', ask: 'bake cookies', icon: '🍪', theme: 'baking' },
			{ key: 'fort', label: 'Build a fort', ask: 'build a fort', icon: '🏰', theme: 'forts' }
		]
	},
	{
		key: 'after-school',
		prompt: 'What sounds fun after school?',
		options: [
			{
				key: 'park',
				label: 'Play at the park',
				ask: 'play at the park',
				icon: '🛝',
				theme: 'outdoors'
			},
			{ key: 'drawing', label: 'Draw and paint', ask: 'draw and paint', icon: '🎨', theme: 'art' },
			{ key: 'swimming', label: 'Go swimming', ask: 'go swimming', icon: '🏊', theme: 'swimming' }
		]
	},
	{
		key: 'rainy-day',
		prompt: 'Pick a rainy-day plan!',
		options: [
			{
				key: 'movie',
				label: 'Movie night',
				ask: 'have a movie night',
				icon: '🍿',
				theme: 'movies'
			},
			{
				key: 'board-game',
				label: 'Play a board game',
				ask: 'play a board game',
				icon: '🎲',
				theme: 'games'
			},
			{
				key: 'pillow-fort',
				label: 'Make a pillow fort',
				ask: 'make a pillow fort',
				icon: '🛋️',
				theme: 'forts'
			}
		]
	},
	{
		key: 'explore',
		prompt: 'Where should we explore?',
		options: [
			{
				key: 'aquarium',
				label: 'Visit the aquarium',
				ask: 'visit the aquarium',
				icon: '🐠',
				theme: 'animals'
			},
			{
				key: 'museum',
				label: 'Go to a dinosaur museum',
				ask: 'go to a dinosaur museum',
				icon: '🦖',
				theme: 'science'
			},
			{
				key: 'library',
				label: 'Visit the library',
				ask: 'visit the library',
				icon: '📚',
				theme: 'books'
			}
		]
	},
	{
		key: 'make',
		prompt: 'What would you like to make?',
		options: [
			{
				key: 'cupcakes',
				label: 'Decorate cupcakes',
				ask: 'decorate cupcakes',
				icon: '🧁',
				theme: 'baking'
			},
			{ key: 'craft', label: 'Make a craft', ask: 'make a craft', icon: '✂️', theme: 'art' },
			{
				key: 'blocks',
				label: 'Build with blocks',
				ask: 'build with blocks',
				icon: '🧱',
				theme: 'building'
			}
		]
	},
	{
		key: 'moving',
		prompt: "Let's get moving!",
		options: [
			{ key: 'bikes', label: 'Ride bikes', ask: 'ride bikes', icon: '🚲', theme: 'outdoors' },
			{ key: 'soccer', label: 'Play soccer', ask: 'play soccer', icon: '⚽', theme: 'sports' },
			{
				key: 'dance',
				label: 'Have a dance party',
				ask: 'have a dance party',
				icon: '💃',
				theme: 'music'
			}
		]
	},
	{
		key: 'animal-adventure',
		prompt: 'Pick an animal adventure!',
		options: [
			{ key: 'farm', label: 'Visit a farm', ask: 'visit a farm', icon: '🐄', theme: 'animals' },
			{
				key: 'birds',
				label: 'Go bird watching',
				ask: 'go bird watching',
				icon: '🐦',
				theme: 'outdoors'
			},
			{
				key: 'pet-shelter',
				label: 'Visit a pet shelter',
				ask: 'visit a pet shelter',
				icon: '🐶',
				theme: 'animals'
			}
		]
	},
	{
		key: 'picnic',
		prompt: 'Where should we have a picnic?',
		options: [
			{
				key: 'beach',
				label: 'Go to the beach',
				ask: 'go to the beach',
				icon: '🏖️',
				theme: 'swimming'
			},
			{ key: 'hike', label: 'Go on a hike', ask: 'go on a hike', icon: '🥾', theme: 'outdoors' },
			{
				key: 'camp',
				label: 'Camp in the backyard',
				ask: 'camp in the backyard',
				icon: '⛺',
				theme: 'forts'
			}
		]
	},
	{
		key: 'learn',
		prompt: 'What would you like to learn about?',
		options: [
			{
				key: 'stars',
				label: 'Look at the stars',
				ask: 'look at the stars',
				icon: '🔭',
				theme: 'science'
			},
			{
				key: 'instrument',
				label: 'Play an instrument',
				ask: 'play an instrument',
				icon: '🎵',
				theme: 'music'
			},
			{
				key: 'cooking',
				label: 'Cook dinner together',
				ask: 'cook dinner together',
				icon: '🍝',
				theme: 'baking'
			}
		]
	},
	{
		key: 'story-time',
		prompt: 'Story time! What should we read about?',
		options: [
			{
				key: 'dragons',
				label: 'Read about dragons',
				ask: 'read about dragons',
				icon: '🐉',
				theme: 'books'
			},
			{
				key: 'space',
				label: 'Read about space',
				ask: 'read about space',
				icon: '🚀',
				theme: 'science'
			},
			{
				key: 'ocean',
				label: 'Read about the ocean',
				ask: 'read about the ocean',
				icon: '🐳',
				theme: 'animals'
			}
		]
	}
];

/** Old/seed labels that aren't in the deck (wish_cards rows created before it existed). */
const LEGACY_LABELS: Record<string, Theme> = {
	'go to the zoo': 'animals',
	'build a blanket fort': 'forts',
	'a puppy named biscuit': 'animals',
	'go to the beach': 'swimming'
};

const norm = (s: string) => s.trim().toLowerCase();

const BY_LABEL = new Map<string, WishOption>(
	WISH_DECK.flatMap((c) => c.options.map((o) => [norm(o.label), o] as const))
);

export function findCard(key: string): WishCard | undefined {
	return WISH_DECK.find((c) => c.key === key);
}

export function findOption(cardKey: string, optionKey: string): WishOption | undefined {
	return findCard(cardKey)?.options.find((o) => o.key === optionKey);
}

/** Theme for a stored wish_cards.interest label, or null if unknown (never echoed raw). */
export function themeOfInterest(label: string): Theme | null {
	const n = norm(label);
	return BY_LABEL.get(n)?.theme ?? LEGACY_LABELS[n] ?? null;
}

export const isTheme = (v: string): v is Theme => Object.hasOwn(THEMES, v);

/** Human words for a theme ("being outdoors"); unknown values → null. */
export function themeLabel(theme: string): string | null {
	return isTheme(theme) ? THEMES[theme] : null;
}

export const CARD_KEYS = WISH_DECK.map((c) => c.key);
export const OPTION_KEYS = [...new Set(WISH_DECK.flatMap((c) => c.options.map((o) => o.key)))];

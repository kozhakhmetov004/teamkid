/**
 * Parent-facing lines about the child's week (pure; rule-based fallbacks for
 * the AI). Inputs are only what the child SHARED (preset or cleaned labels +
 * theme tags) and the mood trend. Relative imports only.
 */
import { isTheme, THEMES, type Theme } from './wishDeck.js';

/** "outdoor things", "animals", … for sentences. */
const PHRASE: Record<Theme, string> = {
	animals: 'animals',
	forts: 'building forts',
	baking: 'baking',
	outdoors: 'outdoor things',
	art: 'art and making things',
	swimming: 'swimming',
	movies: 'movies',
	games: 'games',
	science: 'science',
	books: 'books and stories',
	building: 'building things',
	sports: 'sports',
	music: 'music'
};

/** For "wants … this weekend". */
const WANT: Partial<Record<Theme, string>> = {
	outdoors: 'time outside',
	animals: 'time with animals',
	art: 'a creative day',
	sports: 'an active day',
	baking: 'some baking',
	movies: 'a cozy day in',
	games: 'a game day',
	forts: 'a cozy day in'
};

export function topTags(items: readonly { tags: readonly string[] }[], max = 2): Theme[] {
	const count = new Map<Theme, number>();
	for (const i of items)
		for (const t of i.tags) if (isTheme(t)) count.set(t, (count.get(t) ?? 0) + 1);
	return [...count.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, max)
		.map(([t]) => t);
}

/** "Leaning toward outdoor things this week." (null when nothing is shared). */
export function leaningLine(items: readonly { tags: readonly string[] }[]): string | null {
	const [first, second] = topTags(items);
	if (!first) return null;
	return second
		? `Leaning toward ${PHRASE[first]} and ${PHRASE[second]} this week.`
		: `Leaning toward ${PHRASE[first]} this week.`;
}

const list = (words: readonly string[]) =>
	words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;

/** "Lily seems to want time outside this weekend (picked park picnic and bike ride)." */
export function nudgeLine(
	childName: string,
	picks: readonly { label: string; tags: readonly string[] }[]
): string | null {
	if (!picks.length) return null;
	const [tag] = topTags(picks, 1);
	const want = (tag && WANT[tag]) ?? 'some time together';
	const labels = picks.slice(0, 3).map((p) => p.label.toLowerCase());
	// No pronoun: the app doesn't know how the child is referred to.
	return `${childName} seems to want ${want} this weekend (picked ${list(labels)}).`;
}

/** Planner place category → themes it fits. */
const CATEGORY_THEMES: Record<string, Theme[]> = {
	zoo: ['animals', 'outdoors'],
	aquarium: ['animals', 'science'],
	museum: ['science', 'art'],
	park: ['outdoors', 'sports'],
	playground: ['outdoors', 'sports'],
	swimming: ['swimming', 'sports'],
	climbing: ['sports'],
	sports: ['sports'],
	library: ['books'],
	ice_cream: ['baking'],
	cinema: ['movies']
};

/** "Matches: animals, being outdoors" for a suggestion (empty when nothing fits). */
export function matchesFor(category: string, childTags: readonly string[]): string[] {
	const mine = new Set(childTags);
	return (CATEGORY_THEMES[category] ?? []).filter((t) => mine.has(t)).map((t) => THEMES[t]);
}

/** Parent-noted interest words → theme tags (for matching). */
export function tagsFromWords(words: readonly string[]): Theme[] {
	const out = new Set<Theme>();
	for (const w of words) {
		const s = w.toLowerCase();
		for (const t of Object.keys(THEMES) as Theme[]) {
			if (s.includes(t.replace(/s$/, '')) || s.includes(THEMES[t])) out.add(t);
		}
		if (/horse|dog|cat|zoo|farm|dino/.test(s)) out.add('animals');
		if (/park|hike|bike|nature|camp|garden/.test(s)) out.add('outdoors');
		if (/draw|paint|craft/.test(s)) out.add('art');
		if (/lego|block/.test(s)) out.add('building');
		if (/soccer|football|ball|gym|dance/.test(s)) out.add('sports');
	}
	return [...out];
}

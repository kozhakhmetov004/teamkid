/**
 * "Plan my weekend" orchestration (spec 5.5, OpenStreetMap variant):
 *   1. categories (fast tier): shared wishes + age + mood trend + budget -> 1-3
 *      categories from a fixed list, plus one at-home idea;
 *   2. places: OpenStreetMap search (places.ts), demo places on failure;
 *   3. pick (smart tier): up to 3 of the RETURNED places with a time slot;
 *   4. validate: unknown place ids are dropped, slots must sit inside the free
 *      custody windows and (when known) opening hours; gaps are filled by a
 *      deterministic picker.
 * At most 2 LLM calls. Every step has a deterministic fallback, so an AI or
 * network failure never leaves the parent with nothing.
 *
 * Privacy: the model never sees the child's name (callers scrub it from the
 * wishes) or the family's location (only place names and distances).
 */
import { z } from 'zod';
import type { FreeWindow } from '#lib/custody/freeWindows.js';
import { weekdayOf } from '#lib/custody/pattern.js';
import { openDuring } from '../openingHours.js';
import {
	CATEGORY_LABEL,
	PlaceCategorySchema,
	searchPlaces,
	type LatLon,
	type Place,
	type PlaceCategory,
	type PlaceSearch
} from '../places.js';
import { aiErrorStatus, type Ask } from './llmCore.js';
import PICK_PROMPT from './prompts/planner_pick.md?raw';
import QUERIES_PROMPT from './prompts/planner_queries.md?raw';

export const BUDGETS = ['free', 'under_25', 'under_60', 'any'] as const;
export type Budget = (typeof BUDGETS)[number];

export interface PlannerChild {
	ageYears: number | null;
	/** Wishes the child shared, with the child's name already removed. */
	wishes: string[];
	moodTrend: string | null;
}

export interface Suggestion {
	place: Place;
	title: string;
	why: string;
	date: string;
	from: string;
	to: string;
}

export interface AtHomeIdea {
	title: string;
	why: string;
}

export interface PlanResult {
	suggestions: Suggestion[];
	atHome: AtHomeIdea;
	usedWishes: string[];
	categories: PlaceCategory[];
	source: PlaceSearch['source'];
	/** False when a step fell back to the deterministic picker. */
	aiUsed: boolean;
}

// ---------------------------------------------------------------------------
// Deterministic helpers (also the no-key "fake" answers)
// ---------------------------------------------------------------------------
const KEYWORDS: [RegExp, PlaceCategory][] = [
	[/zoo|animal|lion|giraff|elephant|monkey|petting|farm/i, 'zoo'],
	[/aquarium|fish|shark|sea ?life|ocean|whale|penguin|octopus/i, 'aquarium'],
	[/museum|dinosaur|science|art|history|space|planet|robot/i, 'museum'],
	[/swim|pool|splash|water ?park/i, 'swimming'],
	[/climb|boulder/i, 'climbing'],
	[/playground|swing|slide|monkey bars/i, 'playground'],
	[/park|picnic|nature|tree|hike|bike|kite|outside/i, 'park'],
	[/book|read|stor(y|ies)|library/i, 'library'],
	[/ice ?cream|gelato/i, 'ice_cream'],
	[/movie|film|cinema/i, 'cinema'],
	[/soccer|football|basketball|tennis|sport|skat|gym/i, 'sports']
];

const isTired = (mood: string | null) => /tired|low|sad|worried/i.test(mood ?? '');

export function wishFor(category: PlaceCategory, wishes: string[]): string | null {
	return wishes.find((w) => KEYWORDS.some(([re, c]) => c === category && re.test(w))) ?? null;
}

export function heuristicCategories(
	child: PlannerChild,
	budget: Budget
): { categories: PlaceCategory[]; usedWishes: string[]; atHome: AtHomeIdea } {
	const categories: PlaceCategory[] = [];
	const usedWishes: string[] = [];
	for (const wish of child.wishes) {
		const hit = KEYWORDS.find(([re]) => re.test(wish));
		if (hit && !categories.includes(hit[1])) {
			categories.push(hit[1]);
			usedWishes.push(wish);
		}
	}
	const fill: PlaceCategory[] = isTired(child.moodTrend)
		? ['library', 'park', 'museum']
		: budget === 'free'
			? ['park', 'playground', 'library']
			: ['park', 'museum', 'playground'];
	for (const c of fill) if (categories.length < 3 && !categories.includes(c)) categories.push(c);
	return { categories: categories.slice(0, 3), usedWishes, atHome: heuristicAtHome(child) };
}

export function heuristicAtHome(child: PlannerChild): AtHomeIdea {
	const fort = child.wishes.find((w) => /fort|tent|den/i.test(w));
	if (fort) return { title: 'Blanket fort movie night', why: `Builds on the wish “${fort}”.` };
	const art = child.wishes.find((w) => /draw|paint|art|craft/i.test(w));
	if (art)
		return { title: 'Art afternoon at the kitchen table', why: `Builds on the wish “${art}”.` };
	return {
		title: 'Bake cookies together',
		why: isTired(child.moodTrend)
			? 'A calm, cozy way to spend a slower weekend together.'
			: 'A cheap, easy way to spend time together at home.'
	};
}

const minutes = (hhmm: string) => {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + m;
};
const hhmm = (min: number) =>
	`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const cut = (s: string | null | undefined, max: number) =>
	(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function fallbackWhy(place: Place, wishes: string[]): string {
	const wish = wishFor(place.category, wishes);
	if (wish) return `Matches the wish “${wish}”.`;
	const miles = Math.round(place.distanceKm * 0.621 * 10) / 10;
	return `A ${CATEGORY_LABEL[place.category].toLowerCase()} about ${miles} mi away.`;
}

/** Nearest places of different categories, each in the first free 2-hour slot when it's open. */
export function heuristicPicks(
	places: Place[],
	windows: FreeWindow[],
	wishes: string[],
	exclude: Set<string> = new Set(),
	limit = 3
): Suggestion[] {
	// Up to 2-hour slots; a long window starts at 10:00 rather than first thing,
	// a short one (the parent's own range) uses what it has, down to 1 hour.
	const slots = windows.flatMap((w) => {
		const out: { date: string; from: string; to: string }[] = [];
		const end = minutes(w.to);
		const start = minutes(w.from) < 600 && end - 600 >= 120 ? 600 : minutes(w.from);
		const length = Math.min(120, end - start);
		if (length < 60) return out;
		for (let s = start; s + length <= end; s += length) {
			out.push({ date: w.date, from: hhmm(s), to: hhmm(s + length) });
		}
		return out;
	});
	const picks: Suggestion[] = [];
	const usedSlots = new Set<number>();
	const usedCats = new Set<PlaceCategory>();
	// Prefer wished categories, then variety, then distance (places come nearest-first).
	const ordered = [...places]
		.filter((p) => !exclude.has(p.id))
		.sort((a, b) => Number(!wishFor(a.category, wishes)) - Number(!wishFor(b.category, wishes)));
	for (const pass of [0, 1]) {
		for (const place of ordered) {
			if (picks.length >= limit) return picks;
			if (picks.some((p) => p.place.id === place.id)) continue;
			if (pass === 0 && usedCats.has(place.category)) continue;
			const i = slots.findIndex(
				(s, idx) =>
					!usedSlots.has(idx) &&
					openDuring(place.openingHours, weekdayOf(s.date), s.from, s.to) !== false
			);
			if (i < 0) continue;
			usedSlots.add(i);
			usedCats.add(place.category);
			picks.push({
				place,
				title: `${CATEGORY_LABEL[place.category]}: ${place.name}`.slice(0, 80),
				why: fallbackWhy(place, wishes),
				...slots[i]
			});
		}
	}
	return picks;
}

// ---------------------------------------------------------------------------
// Validation of the model's picks
// ---------------------------------------------------------------------------
const PickReply = z.object({
	suggestions: z.array(
		z.object({
			placeId: z.string(),
			title: z.string(),
			why: z.string(),
			date: z.string(),
			start: z.string(),
			end: z.string()
		})
	)
});
type PickReply = z.infer<typeof PickReply>;

/** Only returned places, inside a free window and (when known) opening hours, no duplicates. */
export function validatePicks(
	raw: PickReply['suggestions'],
	places: Place[],
	windows: FreeWindow[],
	wishes: string[]
): Suggestion[] {
	const byId = new Map(places.map((p) => [p.id, p]));
	const out: Suggestion[] = [];
	for (const r of raw) {
		const place = byId.get(r.placeId);
		if (!place || out.some((s) => s.place.id === place.id)) continue;
		if (!/^\d{2}:\d{2}$/.test(r.start) || !/^\d{2}:\d{2}$/.test(r.end)) continue;
		const length = minutes(r.end) - minutes(r.start);
		if (length < 60 || length > 240) continue;
		const inWindow = windows.some((w) => w.date === r.date && w.from <= r.start && r.end <= w.to);
		if (!inWindow) continue;
		if (openDuring(place.openingHours, weekdayOf(r.date), r.start, r.end) === false) continue;
		out.push({
			place,
			title: cut(r.title, 80) || `${CATEGORY_LABEL[place.category]}: ${place.name}`.slice(0, 80),
			why: cut(r.why, 200) || fallbackWhy(place, wishes),
			date: r.date,
			from: r.start,
			to: r.end
		});
		if (out.length === 3) break;
	}
	return out;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
const CategoryReply = z.object({
	categories: z.array(PlaceCategorySchema).min(1).max(3),
	usedWishes: z.array(z.string()),
	atHome: z.object({ title: z.string(), why: z.string() })
});

/** The model's input, wrapped in a random tag: data, not instructions. */
function wrap(data: unknown): string {
	const tag = `input-${crypto.randomUUID().slice(0, 8)}`;
	return `<${tag}>\n${JSON.stringify(data, null, 1)}\n</${tag}>`;
}

export interface PlanRequest {
	child: PlannerChild;
	budget: Budget;
	windows: FreeWindow[];
	center: LatLon;
	radiusMeters: number;
	/** "More like this": always search this category and offer its places first. */
	focusCategory?: PlaceCategory;
	/** Places the parent already saw or dismissed ("Not this time"): never suggested again. */
	excludeIds?: string[];
}

export async function planWeekend(
	req: PlanRequest,
	options: { ask?: Ask; search?: typeof searchPlaces } = {}
): Promise<PlanResult> {
	const ask = options.ask ?? (await import('./llm.js')).ask;
	const search = options.search ?? searchPlaces;
	const { child, budget, windows } = req;
	let aiUsed = true;

	// 1. Categories + at-home idea.
	const fallback = heuristicCategories(child, budget);
	let chosen = fallback;
	try {
		const reply = await ask({
			system: QUERIES_PROMPT,
			prompt: wrap({
				ageYears: child.ageYears,
				sharedWishes: child.wishes,
				moodTrend: child.moodTrend,
				budget
			}),
			json: CategoryReply,
			tier: 'fast',
			maxTokens: 400,
			timeoutMs: 8000,
			label: 'planner_categories',
			fake: fallback
		});
		chosen = {
			categories: [...new Set(reply.categories)].slice(0, 3),
			// Only wishes that really exist (the model may paraphrase).
			usedWishes: reply.usedWishes.filter((w) => child.wishes.includes(w)),
			atHome: {
				title: cut(reply.atHome.title, 80) || fallback.atHome.title,
				why: cut(reply.atHome.why, 200) || fallback.atHome.why
			}
		};
	} catch (err) {
		if (!aiErrorStatus(err)) throw err;
		aiUsed = false;
	}

	// "More like this": the liked category leads (searched even if the AI didn't pick it).
	if (req.focusCategory) {
		chosen.categories = [
			req.focusCategory,
			...chosen.categories.filter((c) => c !== req.focusCategory)
		].slice(0, 3);
	}

	// 2. Places (minus the ones already shown/dismissed; liked category first).
	const searched = await search(chosen.categories, req.center, req.radiusMeters);
	const exclude = new Set(req.excludeIds ?? []);
	const focus = req.focusCategory;
	const found = {
		...searched,
		places: searched.places
			.filter((p) => !exclude.has(p.id))
			.sort((a, b) => (focus ? Number(b.category === focus) - Number(a.category === focus) : 0))
	};

	// 3 + 4. Pick inside the windows, validate, fill gaps deterministically.
	let suggestions: Suggestion[] = [];
	if (found.places.length && windows.length) {
		try {
			const reply = await ask({
				system: PICK_PROMPT,
				prompt: wrap({
					ageYears: child.ageYears,
					sharedWishes: child.wishes,
					moodTrend: child.moodTrend,
					budget,
					freeWindows: windows,
					places: found.places.map((p) => ({
						id: p.id,
						name: p.name,
						category: p.category,
						distanceKm: p.distanceKm,
						openingHours: p.openingHours
					}))
				}),
				json: PickReply,
				tier: 'smart',
				maxTokens: 1200,
				timeoutMs: 20_000,
				label: 'planner_pick',
				fake: { suggestions: [] }
			});
			suggestions = validatePicks(reply.suggestions, found.places, windows, child.wishes);
		} catch (err) {
			if (!aiErrorStatus(err)) throw err;
			aiUsed = false;
		}
		if (suggestions.length < 3) {
			const used = new Set(suggestions.map((s) => s.place.id));
			suggestions.push(
				...heuristicPicks(found.places, windows, child.wishes, used, 3 - suggestions.length)
			);
		}
	}

	return {
		suggestions,
		atHome: chosen.atHome,
		usedWishes: chosen.usedWishes,
		categories: chosen.categories,
		source: found.source,
		aiUsed
	};
}

/**
 * Weekly insight rules (pure, deterministic, no LLM). Turns the child's private
 * check-ins + SHARED wishes into a safe summary both parents can read.
 *
 * Output contains only fixed template words: never the child's words, never
 * counts of specific feelings, never times, never which home anything happened in.
 *
 * `mood_trend` values are a shared contract (Member 3's planner reads them).
 * Relative imports only: the seed script (tsx) imports this file too.
 */
import { LOW_ENERGY_MAX } from './moods.js';
import { THEMES, themeOfInterest, type Theme } from './wishDeck.js';

export const MOOD_TRENDS = [
	'mostly_happy',
	'mostly_calm',
	'mixed',
	'a_bit_tired',
	'a_bit_worried',
	'a_hard_week',
	'not_enough'
] as const;
export type MoodTrend = (typeof MOOD_TRENDS)[number];

export interface CheckinRow {
	mood: string;
	energy: number | null;
}

export interface WishRow {
	interest: string;
	shared_with_parents: boolean;
	shared_at?: string | null;
	created_at?: string | null;
}

export interface Insight {
	moodTrend: MoodTrend;
	/** Themes (keys of THEMES), newest first, max 3. */
	interests: Theme[];
	summary: string;
	gentleFlag: boolean;
}

/** Chip text + icon for each trend (words AND icon, never colour alone). */
export const TREND_DISPLAY: Record<MoodTrend, { label: string; icon: string }> = {
	mostly_happy: { label: 'Mostly happy', icon: '😊' },
	mostly_calm: { label: 'Mostly calm', icon: '😌' },
	mixed: { label: 'A mix of feelings', icon: '🌤️' },
	a_bit_tired: { label: 'A bit tired', icon: '🥱' },
	a_bit_worried: { label: 'A bit worried', icon: '🫧' },
	a_hard_week: { label: 'A harder week', icon: '🌧️' },
	not_enough: { label: 'Not enough check-ins yet', icon: '🐢' }
};

const TREND_SENTENCE: Record<Exclude<MoodTrend, 'not_enough'>, string> = {
	mostly_happy: 'Mostly happy this week',
	mostly_calm: 'Mostly calm this week',
	mixed: 'A mix of feelings this week',
	a_bit_tired: 'A bit tired this week',
	a_bit_worried: 'A few worried feelings this week',
	a_hard_week: 'A harder week with some big feelings'
};

const GENTLE_TEXT: Partial<Record<MoodTrend, string>> = {
	a_bit_worried: 'Worried feelings came up a few times. A calm, open chat could help.',
	a_hard_week:
		'Big feelings came up often this week. A calm, open chat could help. If this continues, talking to a pediatrician or counselor can help.'
};

/** Gentle suggestion for parents (template only), or null. */
export function gentleText(trend: string): string | null {
	return GENTLE_TEXT[trend as MoodTrend] ?? null;
}

export function isMoodTrend(v: string): v is MoodTrend {
	return (MOOD_TRENDS as readonly string[]).includes(v);
}

// DB also allows 'excited' and 'okay' (not offered in the UI): treat them as happy / calm.
const BUCKET: Record<string, 'happy' | 'calm' | 'tired' | 'sad' | 'worried' | 'angry'> = {
	happy: 'happy',
	excited: 'happy',
	calm: 'calm',
	okay: 'calm',
	tired: 'tired',
	sad: 'sad',
	worried: 'worried',
	angry: 'angry'
};

/** Rule order: not_enough → a_hard_week → a_bit_worried → a_bit_tired → mostly_* → mixed. */
export function computeMoodTrend(checkins: readonly CheckinRow[]): MoodTrend {
	const rows = checkins.filter((c) => BUCKET[c.mood]);
	const n = rows.length;
	if (n < 2) return 'not_enough';

	const count = { happy: 0, calm: 0, tired: 0, sad: 0, worried: 0, angry: 0 };
	for (const c of rows) count[BUCKET[c.mood]]++;

	const big = count.sad + count.worried + count.angry;
	if (n >= 3 && big / n >= 0.6) return 'a_hard_week';
	if ((count.worried + count.sad) / n >= 0.4) return 'a_bit_worried';

	const energies = rows.map((c) => c.energy).filter((e): e is number => typeof e === 'number');
	const avgEnergy = energies.length ? energies.reduce((s, e) => s + e, 0) / energies.length : null;
	const maxOther = Math.max(count.happy, count.calm, count.sad, count.worried, count.angry);
	if (
		(count.tired > 0 && count.tired >= maxOther) ||
		(avgEnergy !== null && avgEnergy <= LOW_ENERGY_MAX)
	)
		return 'a_bit_tired';

	if (count.happy + count.calm > n / 2) {
		return count.calm > count.happy ? 'mostly_calm' : 'mostly_happy';
	}
	return 'mixed';
}

/** Top 3 themes from SHARED wishes only, newest share first. Unknown labels are dropped. */
export function topThemes(wishes: readonly WishRow[], max = 3): Theme[] {
	const when = (w: WishRow) => Date.parse(w.shared_at ?? w.created_at ?? '') || 0;
	const out: Theme[] = [];
	for (const w of [...wishes]
		.filter((w) => w.shared_with_parents)
		.sort((a, b) => when(b) - when(a))) {
		const t = themeOfInterest(w.interest);
		if (t && !out.includes(t)) out.push(t);
		if (out.length === max) break;
	}
	return out;
}

/** "animals" · "forts and animals" · "art, music and animals" */
export function joinThemes(themes: readonly Theme[]): string {
	const words = themes.map((t) => THEMES[t]);
	if (words.length <= 1) return words.join('');
	return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

export function summarize(trend: MoodTrend, themes: readonly Theme[]): string {
	const into = themes.length ? `Into ${joinThemes(themes)}` : '';
	if (trend === 'not_enough') return into || 'Not enough check-ins yet this week';
	return into ? `${TREND_SENTENCE[trend]} · ${into}` : TREND_SENTENCE[trend];
}

export function computeInsight(
	checkins: readonly CheckinRow[],
	wishes: readonly WishRow[]
): Insight {
	const moodTrend = computeMoodTrend(checkins);
	const interests = topThemes(wishes);
	// HOOK (P2): an AI-worded sentence could replace `summary` here, generated ONLY
	// from { moodTrend, interests } (aggregated labels), never from raw rows.
	return {
		moodTrend,
		interests,
		summary: summarize(moodTrend, interests),
		gentleFlag: moodTrend === 'a_bit_worried' || moodTrend === 'a_hard_week'
	};
}

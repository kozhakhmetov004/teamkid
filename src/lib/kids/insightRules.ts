/**
 * Weekly insight rules (pure, deterministic, no LLM). Turns the check-ins the
 * child chose to share + SHARED wishes into a safe summary both parents can read.
 *
 * How a week is counted:
 * - Only shared check-ins ("Yes, tell them"). "Just for me" never reaches parents.
 * - The unit is a DAY in the child's time zone, not a tap. Taps a few minutes
 *   apart merge into the last one, so trying the buttons changes nothing.
 * - The week's phrase comes from each day's LAST feeling.
 * - "A harder week" is separate and needs persistence: big feelings on 3+
 *   different days AND on most days with a check-in (any time of that day, so
 *   "worried every morning, fine every evening" still counts). One hard
 *   evening never sets it.
 * - The pediatrician tip only after two harder weeks in a row.
 *
 * Output contains only fixed template words: never the child's words, never
 * counts of specific feelings, never times, never which home anything happened in.
 *
 * `mood_trend` values are a shared contract (Member 3's planner reads them).
 * Relative imports only: the seed script (tsx) imports this file too.
 */
import { localDate } from '../custody/today.js';
import { LOW_ENERGY_MAX } from './moods.js';
import { THEMES, themeOfInterest, type Theme } from './wishDeck.js';

export const MOOD_TRENDS = [
	'mostly_happy',
	'mostly_calm',
	'mixed',
	'a_bit_tired',
	'a_bit_worried',
	'a_hard_week',
	'hard_weeks',
	'not_enough'
] as const;
export type MoodTrend = (typeof MOOD_TRENDS)[number];

export interface CheckinRow {
	mood: string;
	energy: number | null;
	created_at: string;
	/** The child chose "Yes, tell them" for this check-in. */
	shared?: boolean;
}

/** Taps closer together than this merge into the last one. */
export const BURST_MINUTES = 5;
/** "A harder week": big feelings on at least this many different days… */
export const HARD_MIN_DAYS = 3;
const BIG = new Set(['sad', 'worried', 'angry']);

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
	hard_weeks: { label: 'A second harder week', icon: '🌧️' },
	not_enough: { label: 'Not enough check-ins yet', icon: '🐢' }
};

const TREND_SENTENCE: Record<Exclude<MoodTrend, 'not_enough'>, string> = {
	mostly_happy: 'Mostly happy this week',
	mostly_calm: 'Mostly calm this week',
	mixed: 'A mix of feelings this week',
	a_bit_tired: 'A bit tired this week',
	a_bit_worried: 'A few worried feelings this week',
	a_hard_week: 'A harder week with some big feelings',
	hard_weeks: 'Another harder week with some big feelings'
};

const GENTLE_TEXT: Partial<Record<MoodTrend, string>> = {
	a_hard_week:
		'Big feelings came up on several days this week. A gentle "How was your week?" could help.',
	hard_weeks:
		'Big feelings have come up for two weeks in a row. A calm, open chat could help, and talking to a pediatrician or counselor can help too.'
};

/** Trends that count as "a harder week" (also for the week after). */
export function isHardTrend(trend: string | null | undefined): boolean {
	return trend === 'a_hard_week' || trend === 'hard_weeks';
}

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

export interface DayMood {
	date: string;
	/** The day's last feeling (after merging quick taps). */
	last: CheckinRow;
	/** A big feeling (sad / worried / angry) at any time of that day. */
	big: boolean;
}

/**
 * One entry per local day, oldest first. Check-ins less than BURST_MINUTES
 * apart merge into the last one; unknown moods are ignored.
 */
export function checkinDays(checkins: readonly CheckinRow[], tz: string): DayMood[] {
	const rows = checkins
		.filter((c) => BUCKET[c.mood] && !Number.isNaN(Date.parse(c.created_at)))
		.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
	const kept = rows.filter(
		(c, i) =>
			i === rows.length - 1 ||
			Date.parse(rows[i + 1].created_at) - Date.parse(c.created_at) >= BURST_MINUTES * 60_000
	);
	const days: DayMood[] = [];
	for (const c of kept) {
		const date = localDate(c.created_at, tz);
		const day = days.at(-1);
		if (day?.date === date) {
			day.last = c;
			day.big ||= BIG.has(BUCKET[c.mood]);
		} else {
			days.push({ date, last: c, big: BIG.has(BUCKET[c.mood]) });
		}
	}
	return days;
}

/** Big feelings on HARD_MIN_DAYS+ different days AND on most days with a check-in. */
export function isHardWeek(days: readonly DayMood[]): boolean {
	const big = days.filter((d) => d.big).length;
	return big >= HARD_MIN_DAYS && big > days.length / 2;
}

/**
 * The week's phrase from one feeling per day (each day's last one).
 * Rule order: not_enough → a_bit_worried → a_bit_tired → mostly_* → mixed.
 * "A harder week" is decided separately (isHardWeek).
 */
export function computeMoodTrend(
	dayMoods: readonly Pick<CheckinRow, 'mood' | 'energy'>[]
): MoodTrend {
	const rows = dayMoods.filter((c) => BUCKET[c.mood]);
	const n = rows.length;
	if (n < 2) return 'not_enough';

	const count = { happy: 0, calm: 0, tired: 0, sad: 0, worried: 0, angry: 0 };
	for (const c of rows) count[BUCKET[c.mood]]++;

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
	wishes: readonly WishRow[],
	opts: { tz: string; previousWeekHard?: boolean }
): Insight {
	const days = checkinDays(
		checkins.filter((c) => c.shared === true),
		opts.tz
	);
	const moodTrend: MoodTrend =
		days.length < 2
			? 'not_enough'
			: isHardWeek(days)
				? opts.previousWeekHard
					? 'hard_weeks'
					: 'a_hard_week'
				: computeMoodTrend(days.map((d) => d.last));
	const interests = topThemes(wishes);
	// HOOK (P2): an AI-worded sentence could replace `summary` here, generated ONLY
	// from { moodTrend, interests } (aggregated labels), never from raw rows.
	return {
		moodTrend,
		interests,
		summary: summarize(moodTrend, interests),
		gentleFlag: isHardTrend(moodTrend)
	};
}

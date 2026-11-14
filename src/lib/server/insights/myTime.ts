/**
 * Private "My time with <child>" (one parent only; README Analytics).
 * Pure helpers: summary of THIS parent's outings, a rule-based suggestion
 * (used when the AI is off or fails) and a guard for AI suggestions.
 * Never compares parents, never judges how much time someone spends.
 */

export interface OutingRow {
	title: string;
	child_rating: number | null;
	happened_on: string;
}

export interface MyTimeSummary {
	/** outings in the window */
	count: number;
	avgRating: number | null;
	/** best-rated activities (rating ≥ 4), most recent first, unique, max 3 */
	favorites: string[];
	/** latest outings, max 5 */
	recent: OutingRow[];
}

export const MY_TIME_DAYS = 30;

function addDaysIso(iso: string, n: number): string {
	const d = new Date(`${iso}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

export function summarizeOutings(
	rows: OutingRow[],
	todayIso: string,
	days = MY_TIME_DAYS
): MyTimeSummary {
	const since = addDaysIso(todayIso, -(days - 1));
	const inWindow = rows
		.filter((r) => r.happened_on >= since && r.happened_on <= todayIso)
		.sort((a, b) => b.happened_on.localeCompare(a.happened_on));
	const rated = inWindow.filter((r) => r.child_rating !== null);
	const avgRating = rated.length
		? Math.round((rated.reduce((s, r) => s + (r.child_rating ?? 0), 0) / rated.length) * 10) / 10
		: null;
	const favorites = [
		...new Set(
			rows
				.filter((r) => (r.child_rating ?? 0) >= 4)
				.sort(
					(a, b) =>
						(b.child_rating ?? 0) - (a.child_rating ?? 0) ||
						b.happened_on.localeCompare(a.happened_on)
				)
				.map((r) => r.title.trim())
		)
	].slice(0, 3);
	return { count: inWindow.length, avgRating, favorites, recent: inWindow.slice(0, 5) };
}

/** One short, positive idea without any AI. */
export function fallbackSuggestion(wishes: string[], favorites: string[]): string {
	const wish = wishes[0]?.trim();
	const fav = favorites[0]?.trim();
	if (wish && fav) {
		return `Your child wished for “${wish}”. Pair it with something they loved, like ${fav.toLowerCase()}, for an easy plan.`;
	}
	if (wish)
		return `Your child wished for “${wish}”. A short, simple version this week would be a great start.`;
	if (fav) return `${fav} got a top rating. A new twist on it could be a fun next outing.`;
	return 'Pick one small thing to do together this week, like a walk to the park or baking a snack.';
}

const BLOCKED = [
	/\b(mom|mum|dad|mother|father|co-?parent|ex|other parent|stepmom|stepdad)\b/i,
	/\b(more|less|fewer) (time )?than\b/i,
	/\b(compare|compared|comparison|enough time|should spend|not enough|neglect|guilt)\b/i,
	/\b(diagnos|therap|disorder|depress|anxiety)\w*/i
];

/** True when an AI suggestion follows the README rules (short, no other parent, no judging). */
export function isSafeSuggestion(text: string, blockedNames: string[] = []): boolean {
	const t = text.trim();
	if (t.length < 10 || t.length > 240) return false;
	if (BLOCKED.some((re) => re.test(t))) return false;
	const lower = t.toLowerCase();
	return !blockedNames.some((n) => n.trim().length > 1 && lower.includes(n.trim().toLowerCase()));
}

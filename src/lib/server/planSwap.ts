/**
 * Planner "Add to calendar" on the other parent's day → swap request.
 * Pure helpers (no I/O) shared by the /calendar add action and its test.
 *
 * Swap requests give one of MY nights (original_date) and take one of THEIRS
 * (proposed_date); see respond_to_swap. So asking for the other parent's day
 * needs a night to offer back: the nearest of my nights after today.
 */

export type AddDecision =
	| { kind: 'event' }
	| { kind: 'ask'; nightDate: string }
	| { kind: 'swap'; nightDate: string; giveBack: string }
	| { kind: 'no_night_to_give'; nightDate: string };

/**
 * @param slotNight the custody night running at the slot's start: its date + home
 * @param nights    my upcoming custody nights by date (date → home)
 */
export function decideAdd(opts: {
	myHome: string | null;
	slotNight: { date: string; home: string } | null;
	nights: ReadonlyMap<string, string>;
	today: string;
	wantsSwap: boolean;
}): AddDecision {
	const { myHome, slotNight } = opts;
	if (!myHome || !slotNight || slotNight.home === myHome) return { kind: 'event' };
	if (!opts.wantsSwap) return { kind: 'ask', nightDate: slotNight.date };
	const giveBack = pickGiveBack(opts.nights, myHome, slotNight.date, opts.today);
	return giveBack
		? { kind: 'swap', nightDate: slotNight.date, giveBack }
		: { kind: 'no_night_to_give', nightDate: slotNight.date };
}

/** My nearest night after today (closest to the target date), not the target itself. */
export function pickGiveBack(
	nights: ReadonlyMap<string, string>,
	myHome: string,
	target: string,
	today: string
): string | null {
	const t = Date.parse(`${target}T12:00:00Z`);
	let best: string | null = null;
	for (const [date, home] of nights) {
		if (home !== myHome || date <= today || date === target) continue;
		const d = Math.abs(Date.parse(`${date}T12:00:00Z`) - t);
		if (best === null || d < Math.abs(Date.parse(`${best}T12:00:00Z`) - t)) best = date;
	}
	return best;
}

/** "I'd like to take Lily to the zoo on Saturday." */
export function swapNote(childName: string, title: string, weekday: string): string {
	const what = title.length > 80 ? `${title.slice(0, 77)}…` : title;
	return `I'd like to take ${childName} to “${what}” on ${weekday}.`;
}

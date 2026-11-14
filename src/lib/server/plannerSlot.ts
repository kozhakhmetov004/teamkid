/**
 * Rules for a time the parent picks for a planner suggestion (one local day,
 * in the parent's time zone). Shared by POST /api/planner/check-slot and the
 * /plan "Add to calendar" action so both judge a slot the same way.
 */
import { z } from 'zod';
import { addDays, localDate } from '#lib/custody/today.js';

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MIN_SLOT_MINUTES = 30;
export const MAX_SLOT_MINUTES = 8 * 60;
export const MAX_DAYS_AHEAD = 60;

export const SlotFields = {
	date: z.iso.date(),
	from: z.string().regex(TIME_RE, 'Use HH:MM'),
	to: z.string().regex(TIME_RE, 'Use HH:MM')
};

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

/** Why a slot can't be saved, or null when it can. */
export function slotProblem(
	slot: { date: string; from: string; to: string },
	today: string
): string | null {
	if (slot.date < today || slot.date > addDays(today, MAX_DAYS_AHEAD)) {
		return 'Pick a day within the next two months.';
	}
	const length = minutes(slot.to) - minutes(slot.from);
	if (length <= 0) return 'The end time must be after the start time.';
	if (length < MIN_SLOT_MINUTES) return 'Make it at least 30 minutes.';
	if (length > MAX_SLOT_MINUTES) return 'Keep it to 8 hours or less.';
	return null;
}

/** Zod schema for a slot, judged against "today" in the parent's time zone. */
export const SlotSchema = (tz: string, now: Date = new Date()) =>
	z.object(SlotFields).superRefine((v, ctx) => {
		const problem = slotProblem(v, localDate(now, tz));
		if (problem) ctx.addIssue({ code: 'custom', path: ['to'], message: problem });
	});

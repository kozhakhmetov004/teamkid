/**
 * STUB (owner: Kids' space + insights).
 *
 * Future behaviour: once a week (Vercel Cron -> /api/cron/insights) build ONE
 * insight per child from that week's mood_checkins and wish_cards, using the
 * service role. The output is trends and themes only:
 *   - never quotes the child, never includes raw chat
 *   - never breaks mood down by home or by parent
 *   - identical for both parents (one row per child per week)
 * `gentleFlag` is true when the week suggests a grown-up should check in
 * (e.g. mostly sad/worried). Crisis content goes to safety_alerts instead.
 *
 * Writes: weekly_insights (service role; unique per child_id + week_start).
 */
import { z } from 'zod';

export const WeeklyInsight = z.object({
	childId: z.string().uuid(),
	weekStart: z.string().date(),
	moodTrend: z.enum(['mostly_happy', 'mostly_calm', 'mixed', 'a_bit_tired', 'a_bit_low']),
	interests: z.array(z.string()).max(5),
	summary: z.string().max(240),
	gentleFlag: z.boolean()
});
export type WeeklyInsight = z.infer<typeof WeeklyInsight>;

/** Monday of the current week (UTC), as YYYY-MM-DD. */
export function weekStartOf(date: Date = new Date()): string {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const day = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() - day + 1);
	return d.toISOString().slice(0, 10);
}

export async function buildWeeklyInsight(childId: string): Promise<WeeklyInsight> {
	return {
		childId,
		weekStart: weekStartOf(),
		moodTrend: 'a_bit_tired',
		interests: ['forts', 'animals', 'drawing'],
		summary: 'A bit tired this week; into forts and animals.',
		gentleFlag: false
	};
}

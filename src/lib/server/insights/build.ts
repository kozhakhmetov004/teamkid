/**
 * Weekly insight builder (owner: Member 2). SERVER ONLY.
 *
 * STUB until feat/insights: it does nothing yet, so kid form actions can already
 * call it after every check-in / share change. feat/insights fills in the body.
 *
 * Contract:
 * - Call ONLY from a kid form action, AFTER requireChild(event) has confirmed the
 *   signed-in child IS `childId`. Never pass a childId that came from the client.
 * - `reader` is the child's own session (event.locals.supabase), used for reads
 *   that RLS allows; the weekly_insights upsert uses the service role.
 * - Weeks are UTC, Monday start.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.js';

export async function rebuildWeeklyInsight(
	childId: string,
	now: Date = new Date(),
	reader?: SupabaseClient<Database>
): Promise<void> {
	void childId;
	void now;
	void reader;
}

/**
 * Live calendar changes (events table, published in the calendar_events
 * migration). Same pattern as subscribeToFamily() in #lib/realtime.ts, which
 * is frozen and doesn't list 'events' yet. When the team adds 'events' to
 * REALTIME_TABLES there, replace this helper with subscribeToFamily('events', …).
 * RLS applies: only events of the signed-in parent's family arrive.
 */
import { getSupabaseBrowserClient } from '#lib/supabase.js';

export function subscribeToEvents(familyId: string, onChange: () => void): () => void {
	const client = getSupabaseBrowserClient();
	const channel = client
		.channel(`family:${familyId}:events`)
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` },
			() => onChange()
		)
		.subscribe();
	return () => {
		void client.removeChannel(channel);
	};
}

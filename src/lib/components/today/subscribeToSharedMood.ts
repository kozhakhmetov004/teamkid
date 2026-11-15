/**
 * Live "feeling shared today" (shared_moods, published in the mood_shared_today
 * migration). Same pattern as subscribeToEvents(): #lib/realtime.ts is frozen
 * and doesn't list 'shared_moods'. RLS applies: only rows of the signed-in
 * parent's family arrive, and only what the child chose to share.
 */
import { getSupabaseBrowserClient } from '#lib/supabase.js';

export function subscribeToSharedMood(familyId: string, onChange: () => void): () => void {
	const client = getSupabaseBrowserClient();
	const channel = client
		.channel(`family:${familyId}:shared_moods`)
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'shared_moods', filter: `family_id=eq.${familyId}` },
			() => onChange()
		)
		.subscribe();
	return () => {
		void client.removeChannel(channel);
	};
}

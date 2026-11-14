/**
 * Live expense changes (published in the expenses_flow migration). Same
 * pattern as subscribeToEvents; replace with subscribeToFamily('expenses', …)
 * once 'expenses' is added to REALTIME_TABLES in the frozen realtime.ts.
 */
import { getSupabaseBrowserClient } from '#lib/supabase.js';

export function subscribeToExpenses(familyId: string, onChange: () => void): () => void {
	const client = getSupabaseBrowserClient();
	const channel = client
		.channel(`family:${familyId}:expenses`)
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'expenses', filter: `family_id=eq.${familyId}` },
			() => onChange()
		)
		.subscribe();
	return () => {
		void client.removeChannel(channel);
	};
}

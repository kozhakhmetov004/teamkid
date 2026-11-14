/**
 * Live updates via Supabase Realtime (postgres_changes). RLS still applies:
 * a client only receives rows it is allowed to SELECT.
 *
 * Tables published for Realtime (0007_analytics_realtime.sql):
 *   messages, swap_requests, wish_cards, weekly_insights
 * All of them carry `family_id`, so one filter works everywhere.
 *
 * Usage (in a component):
 *   $effect(() => subscribeToFamily('messages', familyId, (change) => { ... }));
 */
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './supabase.js';
import type { Database } from './types/database.js';

export const REALTIME_TABLES = [
	'messages',
	'swap_requests',
	'wish_cards',
	'weekly_insights'
] as const;
export type RealtimeTable = (typeof REALTIME_TABLES)[number];
type Row<T extends RealtimeTable> = Database['public']['Tables'][T]['Row'];

export type FamilyChange<T extends RealtimeTable> = RealtimePostgresChangesPayload<Row<T>>;

/** Subscribe to INSERT/UPDATE/DELETE on `table` for one family. Returns an unsubscribe function. */
export function subscribeToFamily<T extends RealtimeTable>(
	table: T,
	familyId: string,
	onChange: (change: FamilyChange<T>) => void,
	client = getSupabaseBrowserClient()
): () => void {
	const channel = client
		.channel(`family:${familyId}:${table}`)
		.on<Row<T>>(
			'postgres_changes',
			{ event: '*', schema: 'public', table, filter: `family_id=eq.${familyId}` },
			(payload) => onChange(payload)
		)
		.subscribe();

	return () => {
		void client.removeChannel(channel);
	};
}

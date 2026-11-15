/**
 * Live changes for the expenses page: expenses plus the v2 tables (requests,
 * monthly costs, settlements, split proposals, family split). RLS applies to
 * postgres_changes. parent_income is private and deliberately NOT published.
 */
import { getSupabaseBrowserClient } from '#lib/supabase.js';

const TABLES = [
	'expenses',
	'expense_requests',
	'recurring_expenses',
	'settlements',
	'split_proposals',
	'family_finance'
] as const;

export function subscribeToExpenses(familyId: string, onChange: () => void): () => void {
	const client = getSupabaseBrowserClient();
	let channel = client.channel(`family:${familyId}:expenses`);
	for (const table of TABLES) {
		channel = channel.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table, filter: `family_id=eq.${familyId}` },
			() => onChange()
		);
	}
	channel.subscribe();
	return () => {
		void client.removeChannel(channel);
	};
}

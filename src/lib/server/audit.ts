/**
 * Append-only audit trail (court-ready records). Rows can never be updated or
 * deleted (DB trigger). Written with the service role because users have no
 * insert policy on audit_log.
 *
 * Never put personal data (names, emails, child words) in `meta`; ids only.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '#lib/types/database.js';
import { supabaseAdmin } from './supabaseAdmin.js';

export type AuditAction =
	| 'family.created'
	| 'invite.created'
	| 'invite.accepted'
	| 'child.created'
	| 'child.consented'
	| 'child.activated'
	| (string & {});

export interface AuditEntry {
	familyId: string;
	actorMemberId: string | null;
	action: AuditAction;
	entity: string;
	entityId?: string | null;
	meta?: Record<string, Json>;
}

export async function logAudit(
	entry: AuditEntry,
	client: SupabaseClient<Database> = supabaseAdmin()
): Promise<void> {
	const { error } = await client.from('audit_log').insert({
		family_id: entry.familyId,
		actor_member_id: entry.actorMemberId,
		action: entry.action,
		entity: entry.entity,
		entity_id: entry.entityId ?? null,
		meta: entry.meta ?? {}
	});
	if (error) {
		// Fail loudly: an action without its audit record is not acceptable.
		throw new Error(`audit log write failed (${entry.action}): ${error.message}`);
	}
}

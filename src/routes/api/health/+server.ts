/**
 * GET /api/health: public warm-up/health check. One cheap DB round trip.
 * Returns only booleans/timestamps, never data. Uses the service role because
 * the anon role has no table privileges at all (see 0004_rls.sql); the query is
 * head-only (no rows, no count).
 */
import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '#lib/server/supabaseAdmin.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const started = Date.now();
	let db: boolean;
	try {
		const { error } = await supabaseAdmin().from('families').select('id', { head: true }).limit(1);
		db = !error;
	} catch {
		db = false;
	}
	return json(
		{ ok: true, db, time: new Date().toISOString(), latencyMs: Date.now() - started },
		{ status: db ? 200 : 503, headers: { 'cache-control': 'no-store' } }
	);
};

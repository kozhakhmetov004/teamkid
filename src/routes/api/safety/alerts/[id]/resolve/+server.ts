/**
 * POST /api/safety/alerts/:id/resolve (parent only): mark a child's alert as
 * handled. Both parents then see it resolved (and by whom).
 *   -> 200 { ok: true } | 400 | 404 { error: 'not_found' }
 */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import type { RequestHandler } from './$types';

const headers = { 'cache-control': 'no-store' };

export const POST: RequestHandler = async (event) => {
	const { member } = await requireParent(event);
	const id = z.uuid().safeParse(event.params.id);
	if (!id.success) return json({ error: 'invalid_body' }, { status: 400, headers });

	const { data, error } = await event.locals.supabase
		.from('safety_alerts')
		.update({ resolved_at: new Date().toISOString(), resolved_by: member.member_id })
		.eq('id', id.data)
		.eq('family_id', member.family_id)
		.is('resolved_at', null)
		.select('id')
		.maybeSingle();
	if (error || !data) return json({ error: 'not_found' }, { status: 404, headers });

	await logAudit({
		familyId: member.family_id,
		actorMemberId: member.member_id,
		action: 'safety.resolved',
		entity: 'safety_alerts',
		entityId: data.id
	});
	return json({ ok: true }, { headers });
};

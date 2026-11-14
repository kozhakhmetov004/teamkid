/**
 * GET /documents/signed?path=… → { url, kind } with a 60-second signed URL.
 * Uses the signed-in parent's client, so the bucket's RLS (own family only)
 * applies. Never a public URL.
 */
import { error, json } from '@sveltejs/kit';
import { requireParent } from '#lib/server/guards.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { member } = await requireParent(event);
	const path = event.url.searchParams.get('path') ?? '';
	if (!path.startsWith(`${member.family_id}/`) || path.includes('..')) {
		error(403, { message: 'Not your file', code: 'forbidden' });
	}
	const { data, error: signError } = await event.locals.supabase.storage
		.from('documents')
		.createSignedUrl(path, 60);
	if (signError || !data) error(404, { message: 'File not found', code: 'not_found' });
	return json(
		{ url: data.signedUrl, kind: path.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image' },
		{ headers: { 'cache-control': 'no-store' } }
	);
};

/**
 * POST /api/documents/register-plan (parent only).
 *
 * The browser uploads the PDF straight to Storage (bucket `documents`, path
 * {family_id}/{uuid}.pdf; a Vercel function body is capped at 4.5 MB, the
 * plan may be 10 MB). This route then checks the stored file and indexes it:
 *   { path, fileName } -> 200 { documentId, pages? } (pages only on the first registration)
 *   | 400 { error: 'invalid_body' } | 400 { error: 'invalid_pdf', problem, message }
 *   | 403 { error: 'forbidden' } | 404 { error: 'not_found' } | 429 { error: 'rate_limited' }
 *
 * A file that fails the check (not PDF, > 10 MB, > 30 pages, encrypted) is
 * deleted with the service role: users have no delete policy on documents.
 */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { checkPdf, PDF_PROBLEM_MESSAGE } from '#lib/server/ai/pdfCheck.js';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import { createRateLimiter } from '#lib/server/rateLimit.js';
import { supabaseAdmin } from '#lib/server/supabaseAdmin.js';
import type { RequestHandler } from './$types';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const Body = z.object({
	path: z.string().regex(new RegExp(`^(${UUID})/${UUID}\\.pdf$`)),
	fileName: z.string().trim().min(1).max(255)
});

const limiter = createRateLimiter({ limit: 20, windowMs: 60 * 60_000 });
const headers = { 'cache-control': 'no-store' };

/** "C:\\scans\\plan final.pdf" -> "plan final.pdf", without control characters, max 200. */
function titleFrom(fileName: string): string {
	const base = fileName.split(/[\\/]/).pop() ?? '';
	const clean = base
		.replace(/[\p{Cc}\p{Cf}]/gu, '')
		.trim()
		.slice(0, 200);
	return clean || 'Parenting plan';
}

export const POST: RequestHandler = async (event) => {
	const { member } = await requireParent(event);

	const limit = limiter.check(member.member_id);
	if (!limit.ok) {
		return json(
			{ error: 'rate_limited' },
			{ status: 429, headers: { ...headers, 'retry-after': String(limit.retryAfterSec) } }
		);
	}

	const body = Body.safeParse(await event.request.json().catch(() => null));
	if (!body.success) return json({ error: 'invalid_body' }, { status: 400, headers });
	const { path, fileName } = body.data;
	if (path.split('/')[0] !== member.family_id) {
		return json({ error: 'forbidden' }, { status: 403, headers });
	}

	const sb = event.locals.supabase;
	// Registering the same upload twice returns the same document.
	const { data: existing } = await sb
		.from('documents')
		.select('id')
		.eq('family_id', member.family_id)
		.eq('storage_path', path)
		.maybeSingle();
	if (existing) return json({ documentId: existing.id }, { headers });

	// Download as the user: Storage policies decide whether they may read it.
	const { data: file, error: downloadError } = await sb.storage.from('documents').download(path);
	if (downloadError || !file) return json({ error: 'not_found' }, { status: 404, headers });

	const check = checkPdf(new Uint8Array(await file.arrayBuffer()), file.type);
	if (!check.ok) {
		await supabaseAdmin().storage.from('documents').remove([path]);
		return json(
			{ error: 'invalid_pdf', problem: check.problem, message: PDF_PROBLEM_MESSAGE[check.problem] },
			{ status: 400, headers }
		);
	}

	const { data: doc, error } = await sb
		.from('documents')
		.insert({
			family_id: member.family_id,
			kind: 'parenting_plan',
			title: titleFrom(fileName),
			storage_path: path,
			mime: 'application/pdf',
			uploaded_by: member.member_id
		})
		.select('id')
		.single();
	if (error || !doc) throw new Error('could not register the document');

	await logAudit({
		familyId: member.family_id,
		actorMemberId: member.member_id,
		action: 'document.uploaded',
		entity: 'documents',
		entityId: doc.id,
		meta: { kind: 'parenting_plan', pages: check.pages }
	});
	return json({ documentId: doc.id, pages: check.pages }, { headers });
};

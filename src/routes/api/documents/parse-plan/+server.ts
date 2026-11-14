/**
 * POST /api/documents/parse-plan (parent only): reads a registered parenting
 * plan with the AI and stores the result for the review screen.
 *   { documentId } -> 200 { documentId, extraction, lowConfidence }
 *   | 400 { error: 'invalid_body' | 'invalid_pdf' } | 404 { error: 'not_found' }
 *   | 429 { error: 'rate_limited' } | 503 { error: 'ai_unavailable' }
 *
 * Nothing is applied to the calendar here: the parent reviews and edits the
 * extraction first (POST /api/documents/apply-plan). The file is read as the
 * user (RLS + Storage policies), never logged, and only sent to the LLM.
 */
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { aiErrorStatus } from '#lib/server/ai/llm.js';
import { extractPlan, isLowConfidence } from '#lib/server/ai/planExtract.js';
import { checkPdf } from '#lib/server/ai/pdfCheck.js';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import { createRateLimiter } from '#lib/server/rateLimit.js';
import type { RequestHandler } from './$types';

/** Vercel: the AI budget is 45 s (EXTRACT_TIMEOUT_MS); leave room for Storage and DB. */
export const config = { maxDuration: 60 };

const Body = z.object({ documentId: z.uuid() });

// Each parse sends a whole PDF to the smart model: keep the cost bounded.
const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60_000 });
const headers = { 'cache-control': 'no-store' };

export const POST: RequestHandler = async (event) => {
	const { member } = await requireParent(event);

	const body = Body.safeParse(await event.request.json().catch(() => null));
	if (!body.success) return json({ error: 'invalid_body' }, { status: 400, headers });

	const sb = event.locals.supabase;
	const { data: doc } = await sb
		.from('documents')
		.select('id, family_id, kind, storage_path')
		.eq('id', body.data.documentId)
		.maybeSingle();
	if (!doc || doc.family_id !== member.family_id || doc.kind !== 'parenting_plan') {
		return json({ error: 'not_found' }, { status: 404, headers });
	}

	const limit = limiter.check(member.member_id);
	if (!limit.ok) {
		return json(
			{ error: 'rate_limited' },
			{ status: 429, headers: { ...headers, 'retry-after': String(limit.retryAfterSec) } }
		);
	}

	const { data: file } = await sb.storage.from('documents').download(doc.storage_path);
	if (!file) return json({ error: 'not_found' }, { status: 404, headers });
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!checkPdf(bytes, file.type).ok)
		return json({ error: 'invalid_pdf' }, { status: 400, headers });

	let extraction;
	try {
		extraction = await extractPlan({ bytes, mime: 'application/pdf' });
	} catch (err) {
		if (aiErrorStatus(err)) return json({ error: 'ai_unavailable' }, { status: 503, headers });
		throw err;
	}

	const { error } = await sb.from('documents').update({ extracted: extraction }).eq('id', doc.id);
	if (error) throw new Error('could not save the extraction');
	await logAudit({
		familyId: member.family_id,
		actorMemberId: member.member_id,
		action: 'document.parsed',
		entity: 'documents',
		entityId: doc.id,
		meta: { template: extraction.template }
	});

	return json(
		{ documentId: doc.id, extraction, lowConfidence: isLowConfidence(extraction) },
		{ headers }
	);
};

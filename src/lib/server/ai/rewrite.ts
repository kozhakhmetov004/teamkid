/**
 * STUB (owner: AI + integrations).
 *
 * Future behaviour: rewrite a co-parent's draft message in BIFF style
 * (Brief, Informative, Friendly, Firm) before it is sent. Keep facts, dates
 * and requests; remove blame, sarcasm, insults and history. Never invent facts.
 * Implementation: `ask({ system: BIFF_PROMPT, prompt: draft, json: RewriteResult })`.
 * The original draft is stored in `messages.original_body` (sender's eyes only
 * in the UI) and `messages.ai_rewritten = true`.
 *
 * Used by: POST /api/ai/rewrite (parent only).
 */
import { z } from 'zod';

export const RewriteResult = z.object({ rewritten: z.string().min(1) });
export type RewriteResult = z.infer<typeof RewriteResult>;

export async function rewriteMessage(draft: string): Promise<RewriteResult> {
	const trimmed = draft.trim();
	if (/late|again|always|never/i.test(trimmed)) {
		return {
			rewritten:
				'Hi, pickup on Friday was about 40 minutes after the agreed 5:00 pm. ' +
				'Could we stick to 5:00 pm going forward, or let me know by 3:00 pm if plans change? Thanks.'
		};
	}
	return {
		rewritten: trimmed.length > 0 ? trimmed : 'Hi, just checking in about this week. Thanks.'
	};
}

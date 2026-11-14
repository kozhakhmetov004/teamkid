/**
 * Client-side tone check before sending (calls Member 3's POST /api/ai/rewrite).
 * Contract: { draft, threadId? } -> 200 { rewritten, changed, notes }
 *           | 429 rate_limited | 503 ai_unavailable | 400 invalid_body
 * Never blocks sending: any failure or a timeout (8 s) returns 'unavailable'.
 */
export type ToneResult =
	| { status: 'ok'; changed: boolean; rewritten: string; notes: string[] }
	| { status: 'unavailable'; reason: 'timeout' | 'rate_limited' | 'error' };

export const TONE_TIMEOUT_MS = 8000;

export async function checkTone(
	draft: string,
	options: { threadId?: string; timeoutMs?: number; fetchFn?: typeof fetch } = {}
): Promise<ToneResult> {
	const doFetch = options.fetchFn ?? fetch;
	try {
		const res = await doFetch('/api/ai/rewrite', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ draft, ...(options.threadId ? { threadId: options.threadId } : {}) }),
			signal: AbortSignal.timeout(options.timeoutMs ?? TONE_TIMEOUT_MS)
		});
		if (res.status === 429) return { status: 'unavailable', reason: 'rate_limited' };
		if (!res.ok) return { status: 'unavailable', reason: 'error' };
		const data: unknown = await res.json();
		const rec = (data ?? {}) as { rewritten?: unknown; changed?: unknown; notes?: unknown };
		if (typeof rec.rewritten !== 'string' || rec.rewritten.trim() === '') {
			return { status: 'unavailable', reason: 'error' };
		}
		const changed =
			typeof rec.changed === 'boolean' ? rec.changed : rec.rewritten.trim() !== draft.trim();
		const notes = Array.isArray(rec.notes)
			? rec.notes.filter((n): n is string => typeof n === 'string')
			: [];
		return { status: 'ok', changed, rewritten: rec.rewritten, notes };
	} catch (err) {
		const timeout =
			err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
		return { status: 'unavailable', reason: timeout ? 'timeout' : 'error' };
	}
}

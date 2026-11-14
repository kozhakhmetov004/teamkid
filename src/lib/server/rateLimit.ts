/**
 * In-memory sliding-window rate limiter (per key, e.g. per member id).
 *
 * LIMITATION: state lives in one server instance. On Vercel each instance has
 * its own window, so the real limit is "per instance". Good enough for the demo;
 * move to a shared store (e.g. a Postgres table) before launch.
 */
export interface RateLimiter {
	/** Records a hit for `key` and says whether it is allowed. */
	check(key: string): { ok: true } | { ok: false; retryAfterSec: number };
}

export function createRateLimiter(config: {
	limit: number;
	windowMs: number;
	now?: () => number;
}): RateLimiter {
	const { limit, windowMs, now = Date.now } = config;
	const hits = new Map<string, number[]>();

	return {
		check(key) {
			const t = now();
			const recent = (hits.get(key) ?? []).filter((at) => at > t - windowMs);
			if (recent.length >= limit) {
				hits.set(key, recent);
				return {
					ok: false,
					retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - t) / 1000))
				};
			}
			recent.push(t);
			hits.set(key, recent);
			// Keep memory bounded: drop keys with no recent hits now and then.
			if (hits.size > 5000) {
				for (const [k, list] of hits) if (list.every((at) => at <= t - windowMs)) hits.delete(k);
			}
			return { ok: true };
		}
	};
}

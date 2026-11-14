import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rateLimit.js';

describe('createRateLimiter', () => {
	it('allows up to the limit per window, then reports when to retry', () => {
		let t = 0;
		const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });
		expect(limiter.check('a')).toEqual({ ok: true });
		t = 10_000;
		expect(limiter.check('a')).toEqual({ ok: true });
		expect(limiter.check('a')).toEqual({ ok: false, retryAfterSec: 50 });
		expect(limiter.check('b')).toEqual({ ok: true });
	});

	it('frees slots as old hits leave the window', () => {
		let t = 0;
		const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
		expect(limiter.check('a').ok).toBe(true);
		expect(limiter.check('a').ok).toBe(false);
		t = 1001;
		expect(limiter.check('a').ok).toBe(true);
	});

	it('does not count rejected requests', () => {
		let t = 0;
		const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
		limiter.check('a');
		t = 500;
		limiter.check('a');
		limiter.check('a');
		t = 1001;
		expect(limiter.check('a').ok).toBe(true);
	});
});

import { describe, expect, it } from 'vitest';
import { checkTone } from './toneCheck.js';

const reply = (status: number, body: unknown) =>
	(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('checkTone', () => {
	it('returns the calmer version when the API changed the draft', async () => {
		const res = await checkTone('You are late AGAIN', {
			fetchFn: reply(200, {
				rewritten: 'Pickup was late today.',
				changed: true,
				notes: ['Removed blame']
			})
		});
		expect(res).toEqual({
			status: 'ok',
			changed: true,
			rewritten: 'Pickup was late today.',
			notes: ['Removed blame']
		});
	});

	it('derives `changed` when the API omits it', async () => {
		const same = await checkTone('Hello', { fetchFn: reply(200, { rewritten: 'Hello' }) });
		expect(same).toMatchObject({ status: 'ok', changed: false });
		const diff = await checkTone('Hello', { fetchFn: reply(200, { rewritten: 'Hi there' }) });
		expect(diff).toMatchObject({ status: 'ok', changed: true });
	});

	it('never blocks: errors, rate limits and bad bodies are "unavailable"', async () => {
		expect(await checkTone('x', { fetchFn: reply(503, { error: 'ai_unavailable' }) })).toEqual({
			status: 'unavailable',
			reason: 'error'
		});
		expect(await checkTone('x', { fetchFn: reply(429, { error: 'rate_limited' }) })).toEqual({
			status: 'unavailable',
			reason: 'rate_limited'
		});
		expect(await checkTone('x', { fetchFn: reply(200, { nope: true }) })).toMatchObject({
			status: 'unavailable'
		});
		const network = (async () => {
			throw new TypeError('network down');
		}) as unknown as typeof fetch;
		expect(await checkTone('x', { fetchFn: network })).toEqual({
			status: 'unavailable',
			reason: 'error'
		});
	});

	it('gives up after the timeout', async () => {
		const slow = ((_url: string, init?: RequestInit) =>
			new Promise((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
			})) as unknown as typeof fetch;
		const started = Date.now();
		const res = await checkTone('x', { fetchFn: slow, timeoutMs: 50 });
		expect(res).toEqual({ status: 'unavailable', reason: 'timeout' });
		expect(Date.now() - started).toBeLessThan(2000);
	});
});

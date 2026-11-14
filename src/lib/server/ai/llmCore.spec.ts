import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PlanExtraction } from './planExtract.js';
import {
	AiSchemaError,
	AiTimeoutError,
	AiUnavailableError,
	aiErrorStatus,
	createAsk,
	extractJson,
	fakeComplete,
	LlmJsonError,
	LlmRefusalError,
	pickModel,
	type AskLogEntry,
	type CompleteFn,
	type CompletionRequest
} from './llmCore.js';

const Schema = z.object({ rewritten: z.string().min(1) });

/** A provider that replies with the given strings in order and records requests. */
function scripted(replies: string[]) {
	const calls: CompletionRequest[] = [];
	const complete = async (req: CompletionRequest) => {
		calls.push(req);
		return replies[Math.min(calls.length - 1, replies.length - 1)];
	};
	return { calls, complete };
}

describe('ask() text mode', () => {
	it('returns the raw text', async () => {
		const { complete, calls } = scripted(['hello']);
		const ask = createAsk(complete);
		await expect(ask({ system: 's', prompt: 'p' })).resolves.toBe('hello');
		expect(calls[0].jsonSchema).toBeUndefined();
		expect(calls[0].maxTokens).toBe(16000);
	});
});

describe('ask() JSON mode', () => {
	it('parses and validates valid JSON on the first try', async () => {
		const { complete, calls } = scripted(['{"rewritten":"Calm message"}']);
		const ask = createAsk(complete);
		await expect(ask({ system: 's', prompt: 'p', json: Schema })).resolves.toEqual({
			rewritten: 'Calm message'
		});
		expect(calls).toHaveLength(1);
		expect(calls[0].jsonSchema).toBe(Schema);
	});

	it('accepts JSON wrapped in code fences or prose', async () => {
		const ask = createAsk(scripted(['Sure! ```json\n{"rewritten":"ok"}\n```']).complete);
		await expect(ask({ system: 's', prompt: 'p', json: Schema })).resolves.toEqual({
			rewritten: 'ok'
		});
	});

	it('retries once with the validation problem, then succeeds', async () => {
		const { complete, calls } = scripted(['{"rewritten":""}', '{"rewritten":"fixed"}']);
		const ask = createAsk(complete);
		await expect(ask({ system: 's', prompt: 'p', json: Schema })).resolves.toEqual({
			rewritten: 'fixed'
		});
		expect(calls).toHaveLength(2);
		expect(calls[1].attempt).toBe(2);
		expect(calls[1].prompt).toContain('could not be used');
	});

	it('retries once on unparseable output, then throws LlmJsonError', async () => {
		const { complete, calls } = scripted(['not json', 'still not json']);
		const ask = createAsk(complete);
		const err = await ask({ system: 's', prompt: 'p', json: Schema }).catch((e: unknown) => e);
		expect(err).toBeInstanceOf(LlmJsonError);
		expect((err as LlmJsonError).raw).toBe('still not json');
		expect(calls).toHaveLength(2);
	});
});

describe('fake provider', () => {
	it('returns deterministic text', async () => {
		const ask = createAsk(fakeComplete());
		const a = await ask({ system: 's', prompt: 'Rewrite this\nmore' });
		expect(a).toBe(await ask({ system: 's', prompt: 'Rewrite this\nmore' }));
		expect(a).toContain('Rewrite this');
	});

	it('returns the given fake value for JSON', async () => {
		const ask = createAsk(fakeComplete({ rewritten: 'demo' }));
		await expect(ask({ system: 's', prompt: 'p', json: Schema })).resolves.toEqual({
			rewritten: 'demo'
		});
	});

	it('generates schema-valid sample JSON when no fake value is given', async () => {
		const Sample = z.object({
			childId: z.string().uuid(),
			weekStart: z.string().date(),
			trend: z.enum(['calm', 'tired']),
			interests: z.array(z.string()),
			score: z.number().min(1),
			flag: z.boolean(),
			note: z.string().optional()
		});
		const ask = createAsk(fakeComplete());
		const value = await ask({ system: 's', prompt: 'p', json: Sample });
		expect(Sample.safeParse(value).success).toBe(true);
	});

	it('uses the fake value for pattern-constrained schemas', async () => {
		const demo = {
			template: '2-2-3',
			templateQuote: null,
			startDate: '2026-01-05',
			startDateQuote: null,
			firstParentLabel: 'Mother',
			firstParentQuote: null,
			exchangeTime: '17:00',
			exchangePlace: null,
			exchangeQuote: null,
			holidays: [],
			confidence: { template: 0.9, startDate: 0.9, exchange: 0.9 },
			warnings: []
		} as const;
		const ask = createAsk(fakeComplete(demo));
		await expect(ask({ system: 's', prompt: 'p', json: PlanExtraction })).resolves.toEqual(demo);
	});
});

describe('ask() options', () => {
	it('passes tier, documents and the time budget to the provider', async () => {
		const { complete, calls } = scripted(['ok']);
		const ask = createAsk(complete);
		const documents = [{ mime: 'application/pdf' as const, base64: 'JVBERi0=' }];
		await ask({ system: 's', prompt: 'p', tier: 'smart', documents, timeoutMs: 45_000 });
		expect(calls[0].tier).toBe('smart');
		expect(calls[0].documents).toEqual(documents);
		expect(calls[0].signal.aborted).toBe(false);
		expect(calls[0].timeoutMs).toBeGreaterThan(44_000);
		expect(calls[0].timeoutMs).toBeLessThanOrEqual(45_000);
	});

	it('picks the tier model, then the default model, then the provider default', () => {
		const models = { model: 'base', fastModel: 'quick', smartModel: 'deep' };
		expect(pickModel(models, 'fast', 'x')).toBe('quick');
		expect(pickModel(models, 'smart', 'x')).toBe('deep');
		expect(pickModel(models, undefined, 'x')).toBe('base');
		expect(pickModel({ model: 'base' }, 'fast', 'x')).toBe('base');
		expect(pickModel({}, 'smart', 'x')).toBe('x');
	});
});

describe('ask() errors', () => {
	/** A provider that never answers but stops when aborted (like the SDK). */
	const hanging: CompleteFn = (req) =>
		new Promise((_, reject) =>
			req.signal.addEventListener('abort', () => reject(new Error('aborted')))
		);

	it('throws AiTimeoutError when the budget runs out', async () => {
		const ask = createAsk(hanging);
		const err = await ask({ system: 's', prompt: 'p', timeoutMs: 20 }).catch((e: unknown) => e);
		expect(err).toBeInstanceOf(AiTimeoutError);
		expect(err).toBeInstanceOf(AiUnavailableError);
		expect(aiErrorStatus(err)).toBe(503);
	});

	it('times out even if the provider ignores the abort signal', async () => {
		const ask = createAsk(() => new Promise(() => {}));
		await expect(ask({ system: 's', prompt: 'p', timeoutMs: 20 })).rejects.toBeInstanceOf(
			AiTimeoutError
		);
	});

	it('shares one deadline across the JSON retry', async () => {
		const calls: CompletionRequest[] = [];
		const ask = createAsk(async (req) => {
			calls.push(req);
			await new Promise((r) => setTimeout(r, 30));
			return 'not json';
		});
		const err = await ask({ system: 's', prompt: 'p', json: Schema, timeoutMs: 50 }).catch(
			(e: unknown) => e
		);
		expect(err).toBeInstanceOf(AiTimeoutError);
		expect(calls).toHaveLength(2);
		expect(calls[1].timeoutMs).toBeLessThan(calls[0].timeoutMs);
	});

	it('wraps provider failures in AiUnavailableError', async () => {
		const cause = new Error('401 invalid x-api-key');
		const ask = createAsk(async () => {
			throw cause;
		});
		const err = await ask({ system: 's', prompt: 'p' }).catch((e: unknown) => e);
		expect(err).toBeInstanceOf(AiUnavailableError);
		expect(err).not.toBeInstanceOf(AiTimeoutError);
		expect((err as Error).cause).toBe(cause);
	});

	it('passes refusals through unchanged', async () => {
		const ask = createAsk(async () => {
			throw new LlmRefusalError('cyber');
		});
		const err = await ask({ system: 's', prompt: 'p' }).catch((e: unknown) => e);
		expect(err).toBeInstanceOf(LlmRefusalError);
		expect(aiErrorStatus(err)).toBe(503);
	});

	it('throws AiSchemaError (still an LlmJsonError) after two bad replies', async () => {
		const ask = createAsk(scripted(['nope', 'nope']).complete);
		const err = await ask({ system: 's', prompt: 'p', json: Schema }).catch((e: unknown) => e);
		expect(err).toBeInstanceOf(AiSchemaError);
		expect(err).toBeInstanceOf(LlmJsonError);
		expect(aiErrorStatus(err)).toBe(503);
	});

	it('does not map unrelated errors', () => {
		expect(aiErrorStatus(new Error('bug'))).toBeNull();
	});
});

describe('ask() logging', () => {
	it('logs metadata and token counts, never prompt or reply text', async () => {
		const entries: AskLogEntry[] = [];
		const ask = createAsk(
			async () => ({
				text: '{"rewritten":"SECRET-REPLY"}',
				model: 'm-1',
				usage: { inputTokens: 12, outputTokens: 5 }
			}),
			{ log: (e) => entries.push(e) }
		);
		await ask({
			system: 'SECRET-SYSTEM',
			prompt: 'SECRET-PROMPT',
			json: Schema,
			tier: 'fast',
			label: 'rewrite'
		});
		expect(entries).toEqual([
			expect.objectContaining({
				label: 'rewrite',
				tier: 'fast',
				model: 'm-1',
				attempts: 1,
				inputTokens: 12,
				outputTokens: 5,
				outcome: 'ok'
			})
		]);
		expect(JSON.stringify(entries)).not.toMatch(/SECRET/);
	});

	it('logs the failure outcome', async () => {
		const entries: AskLogEntry[] = [];
		const ask = createAsk(scripted(['x', 'x']).complete, { log: (e) => entries.push(e) });
		await ask({ system: 's', prompt: 'p', json: Schema }).catch(() => {});
		expect(entries[0]).toMatchObject({ outcome: 'schema', attempts: 2, label: 'ask' });
	});
});

describe('extractJson', () => {
	it('throws when there is no JSON', () => {
		expect(() => extractJson('nothing here')).toThrow();
	});
});

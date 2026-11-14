import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PlanExtraction } from './planExtract.js';
import {
	createAsk,
	extractJson,
	fakeComplete,
	LlmJsonError,
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
			startDate: '2026-01-05',
			exchangeTime: '17:00',
			startingHome: 'A',
			holidayRules: [],
			confidence: 0.9
		} as const;
		const ask = createAsk(fakeComplete(demo));
		await expect(ask({ system: 's', prompt: 'p', json: PlanExtraction })).resolves.toEqual(demo);
	});
});

describe('extractJson', () => {
	it('throws when there is no JSON', () => {
		expect(() => extractJson('nothing here')).toThrow();
	});
});

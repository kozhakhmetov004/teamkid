/**
 * Provider-agnostic core of `ask()` (no SvelteKit imports => unit-testable).
 * `llm.ts` wires it to the configured provider.
 */
import { z, type ZodType } from 'zod';

export interface AskOptions<T = unknown> {
	system: string;
	prompt: string;
	/** When set, the model is asked for JSON which is parsed and validated (1 retry). */
	json?: ZodType<T>;
	maxTokens?: number;
	/**
	 * Deterministic value returned by the fake provider (no API key / tests).
	 * Without it, JSON requests get a sample generated from the schema, which
	 * cannot satisfy regex patterns: pass `fake` for schemas that use them.
	 */
	fake?: T extends string ? string : T;
}

export interface CompletionRequest {
	system: string;
	prompt: string;
	maxTokens: number;
	/** Present when JSON output is requested. */
	jsonSchema?: ZodType;
	/** 1 for the first try, 2 for the retry. */
	attempt: number;
}

/** A provider turns a request into raw text. */
export type CompleteFn = (req: CompletionRequest) => Promise<string>;

export class LlmJsonError extends Error {
	constructor(
		message: string,
		readonly raw: string
	) {
		super(message);
		this.name = 'LlmJsonError';
	}
}

export class LlmRefusalError extends Error {
	constructor(readonly category: string | null) {
		super(`The model declined the request${category ? ` (${category})` : ''}`);
		this.name = 'LlmRefusalError';
	}
}

export interface Ask {
	(opts: AskOptions<string> & { json?: undefined }): Promise<string>;
	<T>(opts: AskOptions<T> & { json: ZodType<T> }): Promise<T>;
}

export const DEFAULT_MAX_TOKENS = 16000;

/** Pull a JSON value out of a reply that may be wrapped in prose or ``` fences. */
export function extractJson(text: string): unknown {
	const trimmed = text.trim();
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced ? fenced[1].trim() : trimmed;
	try {
		return JSON.parse(candidate);
	} catch {
		const start = candidate.search(/[[{]/);
		const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
		if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
		throw new SyntaxError('no JSON found in model reply');
	}
}

export function createAsk(complete: CompleteFn): Ask {
	async function ask<T>(opts: AskOptions<T>): Promise<T | string> {
		const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
		if (!opts.json) {
			return complete({ system: opts.system, prompt: opts.prompt, maxTokens, attempt: 1 });
		}

		const schema = opts.json;
		const system = `${opts.system}\n\nReply with a single JSON value only. No prose, no code fences.`;
		let prompt = opts.prompt;
		let lastRaw = '';
		let lastProblem = '';

		for (let attempt = 1; attempt <= 2; attempt++) {
			lastRaw = await complete({ system, prompt, maxTokens, jsonSchema: schema, attempt });
			try {
				const parsed = schema.safeParse(extractJson(lastRaw));
				if (parsed.success) return parsed.data;
				lastProblem = z.prettifyError(parsed.error);
			} catch (e) {
				lastProblem = e instanceof Error ? e.message : 'invalid JSON';
			}
			prompt =
				`${opts.prompt}\n\nYour previous reply could not be used:\n${lastProblem}\n` +
				'Reply again with ONLY valid JSON that matches the requested shape.';
		}
		throw new LlmJsonError(`LLM JSON output failed validation twice: ${lastProblem}`, lastRaw);
	}
	return ask as Ask;
}

// ---------------------------------------------------------------------------
// Fake provider: deterministic output so the app runs without an API key.
// ---------------------------------------------------------------------------
type JsonSchemaNode = {
	type?: string | string[];
	enum?: unknown[];
	const?: unknown;
	properties?: Record<string, JsonSchemaNode>;
	required?: string[];
	items?: JsonSchemaNode;
	anyOf?: JsonSchemaNode[];
	minimum?: number;
	format?: string;
};

function sampleFromJsonSchema(node: JsonSchemaNode | undefined): unknown {
	if (!node) return null;
	if (node.const !== undefined) return node.const;
	if (node.enum?.length) return node.enum[0];
	if (node.anyOf?.length) return sampleFromJsonSchema(node.anyOf[0]);
	const type = Array.isArray(node.type) ? node.type[0] : node.type;
	switch (type) {
		case 'object': {
			const out: Record<string, unknown> = {};
			for (const key of node.required ?? Object.keys(node.properties ?? {})) {
				out[key] = sampleFromJsonSchema(node.properties?.[key]);
			}
			return out;
		}
		case 'array':
			return [];
		case 'string':
			if (node.format === 'date') return '2026-01-05';
			if (node.format === 'date-time') return '2026-01-05T09:00:00.000Z';
			if (node.format === 'uuid') return '00000000-0000-4000-8000-000000000000';
			if (node.format === 'email') return 'demo@example.com';
			return 'example';
		case 'integer':
		case 'number':
			return node.minimum ?? 0;
		case 'boolean':
			return false;
		default:
			return null;
	}
}

/** A fake CompleteFn. Pass the `fake` value from AskOptions via a closure if you have one. */
export function fakeComplete(fakeValue?: unknown): CompleteFn {
	return async (req) => {
		if (fakeValue !== undefined) {
			return typeof fakeValue === 'string' && !req.jsonSchema
				? fakeValue
				: JSON.stringify(fakeValue);
		}
		if (req.jsonSchema) {
			return JSON.stringify(sampleFromJsonSchema(z.toJSONSchema(req.jsonSchema) as JsonSchemaNode));
		}
		const firstLine = req.prompt.split('\n')[0].slice(0, 80);
		return `[demo reply: no LLM key configured] ${firstLine}`;
	};
}

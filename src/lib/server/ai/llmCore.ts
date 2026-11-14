/**
 * Provider-agnostic core of `ask()` (no SvelteKit imports => unit-testable).
 * `llm.ts` wires it to the configured provider.
 */
import { z, type ZodType } from 'zod';

/** `fast` => LLM_MODEL_FAST (rewrite, query building), `smart` => LLM_MODEL_SMART (PDFs, picking). */
export type AiTier = 'fast' | 'smart';

/** A file the model reads directly (e.g. a parenting-plan PDF). */
export interface AskDocument {
	mime: 'application/pdf';
	base64: string;
}

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
	/** Model tier. Falls back to LLM_MODEL when the tier's variable is not set. */
	tier?: AiTier;
	/** Budget for the whole call, JSON retry included. Default 15 s. */
	timeoutMs?: number;
	/** Files sent alongside the prompt (treat their content as data, not instructions). */
	documents?: AskDocument[];
	/** Short name for logs, e.g. 'rewrite'. Logs never contain prompt or reply text. */
	label?: string;
}

export interface CompletionRequest {
	system: string;
	prompt: string;
	maxTokens: number;
	/** Present when JSON output is requested. */
	jsonSchema?: ZodType;
	/** 1 for the first try, 2 for the retry. */
	attempt: number;
	tier?: AiTier;
	documents?: AskDocument[];
	/** Aborted when the call's time budget runs out. */
	signal: AbortSignal;
	/** Time left in the budget when this attempt started. */
	timeoutMs: number;
}

/** What a provider returns: the text, optionally with the model used and token counts. */
export type CompletionResult =
	string | { text: string; model?: string; usage?: { inputTokens: number; outputTokens: number } };

/** A provider turns a request into raw text. */
export type CompleteFn = (req: CompletionRequest) => Promise<CompletionResult>;

/** The provider can't be reached or failed (network, auth, rate limit, 5xx). Routes map it to 503. */
export class AiUnavailableError extends Error {
	constructor(message = 'The AI service is unavailable', options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'AiUnavailableError';
	}
}

/** The call ran out of its time budget. A kind of AiUnavailableError, so routes can catch both. */
export class AiTimeoutError extends AiUnavailableError {
	constructor(readonly timeoutMs: number) {
		super(`The AI call took longer than ${timeoutMs} ms`);
		this.name = 'AiTimeoutError';
	}
}

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

/** JSON output failed validation twice. Still an LlmJsonError for existing callers. */
export class AiSchemaError extends LlmJsonError {
	constructor(message: string, raw: string) {
		super(message, raw);
		this.name = 'AiSchemaError';
	}
}

/** HTTP status for an AI failure (503), or null when `err` is not one. Never expose the message. */
export function aiErrorStatus(err: unknown): 503 | null {
	return err instanceof AiUnavailableError ||
		err instanceof LlmJsonError ||
		err instanceof LlmRefusalError
		? 503
		: null;
}

export interface Ask {
	(opts: AskOptions<string> & { json?: undefined }): Promise<string>;
	<T>(opts: AskOptions<T> & { json: ZodType<T> }): Promise<T>;
}

export const DEFAULT_MAX_TOKENS = 16000;
export const DEFAULT_TIMEOUT_MS = 15_000;

/** The model for a tier: the tier's model, else the default model, else the provider default. */
export function pickModel(
	models: { model?: string; fastModel?: string; smartModel?: string },
	tier: AiTier | undefined,
	providerDefault: string
): string {
	const tierModel =
		tier === 'fast' ? models.fastModel : tier === 'smart' ? models.smartModel : undefined;
	return tierModel || models.model || providerDefault;
}

/** One line per ask() call. Metadata only: never prompt, document or reply text. */
export interface AskLogEntry {
	label: string;
	tier: AiTier | null;
	model: string | null;
	ms: number;
	attempts: number;
	inputTokens: number;
	outputTokens: number;
	outcome: 'ok' | 'timeout' | 'unavailable' | 'schema' | 'refusal';
}

export interface CreateAskOptions {
	log?: (entry: AskLogEntry) => void;
}

function outcomeOf(err: unknown): AskLogEntry['outcome'] {
	if (err instanceof AiTimeoutError) return 'timeout';
	if (err instanceof LlmRefusalError) return 'refusal';
	if (err instanceof LlmJsonError) return 'schema';
	return 'unavailable';
}

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

export function createAsk(complete: CompleteFn, options: CreateAskOptions = {}): Ask {
	async function ask<T>(opts: AskOptions<T>): Promise<T | string> {
		const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
		const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		const started = Date.now();
		// One deadline for the whole call, so the JSON retry can't exceed the budget.
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		const stats = { attempts: 0, inputTokens: 0, outputTokens: 0, model: null as string | null };

		/** One provider call: races the deadline and maps provider failures to typed errors. */
		async function call(req: Omit<CompletionRequest, 'signal' | 'timeoutMs'>): Promise<string> {
			if (controller.signal.aborted) throw new AiTimeoutError(timeoutMs);
			stats.attempts++;
			const result = await new Promise<CompletionResult>((resolve, reject) => {
				const onAbort = () => reject(new AiTimeoutError(timeoutMs));
				controller.signal.addEventListener('abort', onAbort, { once: true });
				complete({
					...req,
					tier: opts.tier,
					documents: opts.documents,
					signal: controller.signal,
					timeoutMs: Math.max(1, timeoutMs - (Date.now() - started))
				})
					.then(resolve, (e: unknown) => {
						if (controller.signal.aborted) reject(new AiTimeoutError(timeoutMs));
						else if (e instanceof LlmRefusalError || e instanceof AiUnavailableError) reject(e);
						else reject(new AiUnavailableError(undefined, { cause: e }));
					})
					.finally(() => controller.signal.removeEventListener('abort', onAbort));
			});
			if (typeof result === 'string') return result;
			stats.model = result.model ?? stats.model;
			stats.inputTokens += result.usage?.inputTokens ?? 0;
			stats.outputTokens += result.usage?.outputTokens ?? 0;
			return result.text;
		}

		async function run(): Promise<T | string> {
			if (!opts.json) {
				return call({ system: opts.system, prompt: opts.prompt, maxTokens, attempt: 1 });
			}

			const schema = opts.json;
			const system = `${opts.system}\n\nReply with a single JSON value only. No prose, no code fences.`;
			let prompt = opts.prompt;
			let lastRaw = '';
			let lastProblem = '';

			for (let attempt = 1; attempt <= 2; attempt++) {
				lastRaw = await call({ system, prompt, maxTokens, jsonSchema: schema, attempt });
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
			throw new AiSchemaError(`LLM JSON output failed validation twice: ${lastProblem}`, lastRaw);
		}

		let outcome: AskLogEntry['outcome'] = 'ok';
		try {
			return await run();
		} catch (err) {
			outcome = outcomeOf(err);
			throw err;
		} finally {
			clearTimeout(timer);
			options.log?.({
				label: opts.label ?? 'ask',
				tier: opts.tier ?? null,
				model: stats.model,
				ms: Date.now() - started,
				attempts: stats.attempts,
				inputTokens: stats.inputTokens,
				outputTokens: stats.outputTokens,
				outcome
			});
		}
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

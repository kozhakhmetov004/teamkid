/**
 * `ask()`: the single entry point for LLM calls.
 *
 *   const text = await ask({ system, prompt });
 *   const data = await ask({ system, prompt, json: MySchema }); // parsed + validated, 1 retry
 *   const fast = await ask({ system, prompt, tier: 'fast', timeoutMs: 6000, label: 'rewrite' });
 *
 * Failures are typed: AiTimeoutError / AiUnavailableError (provider down),
 * AiSchemaError (bad JSON twice), LlmRefusalError. `aiErrorStatus(err)` maps
 * them to 503 for routes. Logs carry metadata only, never prompt or reply text.
 *
 * Provider comes from LLM_PROVIDER (anthropic | openai | fake). If no
 * LLM_API_KEY is set, a deterministic fake is used so the app still runs.
 *
 * SAFETY: never send a child's words or identifiers to the LLM without the
 * safety layer (src/lib/server/safety.ts, to be built). Parents' private data
 * goes only into that parent's requests.
 */
import { serverEnv } from '../env.js';
import {
	createAsk,
	fakeComplete,
	type Ask,
	type AskLogEntry,
	type AskOptions,
	type CompleteFn
} from './llmCore.js';
import { anthropicComplete, openaiComplete } from './providers.js';

export {
	LlmJsonError,
	LlmRefusalError,
	AiSchemaError,
	AiTimeoutError,
	AiUnavailableError,
	aiErrorStatus,
	type AiTier,
	type AskDocument,
	type AskOptions
} from './llmCore.js';

function realProvider(): CompleteFn | null {
	const { provider, apiKey, model, modelFast, modelSmart } = serverEnv.llm;
	if (!apiKey || provider === 'fake') return null;
	return provider === 'openai'
		? openaiComplete({ apiKey, model })
		: anthropicComplete({ apiKey, model, fastModel: modelFast, smartModel: modelSmart });
}

/** Metadata only (family data lives in prompts and replies, so they are never logged). */
const log = (entry: AskLogEntry) => console.info('[ai]', JSON.stringify(entry));

let realAsk: Ask | null | undefined;

/** True when a real LLM is configured (useful for UI hints). */
export function llmConfigured(): boolean {
	return realProvider() !== null;
}

export const ask: Ask = (<T>(opts: AskOptions<T>) => {
	if (realAsk === undefined) {
		const provider = realProvider();
		realAsk = provider ? createAsk(provider, { log }) : null;
	}
	const impl = realAsk ?? createAsk(fakeComplete(opts.fake), { log });
	return impl(opts as never);
}) as Ask;

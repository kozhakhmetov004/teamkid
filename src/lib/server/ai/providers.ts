/**
 * LLM providers for `ask()`. Add a new provider by writing a `CompleteFn`
 * factory here and a case in `llm.ts`.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { LlmRefusalError, pickModel, type CompleteFn } from './llmCore.js';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5-5';

/**
 * Anthropic (Claude) provider.
 * - JSON requests use structured outputs (`output_config.format`) so the reply
 *   is already shaped by the Zod schema; `ask()` still validates it.
 * - Server-side refusal fallbacks are enabled (`fallbacks: 'default'`): if the
 *   model declines on a safety category, the API retries on a fallback model
 *   inside the same call.
 * - The model comes from the request's tier (`fastModel` / `smartModel`), else `model`.
 *   The `fast` tier uses low effort and no SDK retries so it fits short budgets.
 * - PDFs are sent as `document` blocks before the prompt text.
 */
export function anthropicComplete(config: {
	apiKey: string;
	model?: string;
	fastModel?: string;
	smartModel?: string;
}): CompleteFn {
	const client = new Anthropic({ apiKey: config.apiKey, maxRetries: 2, timeout: 60_000 });

	return async (req) => {
		const model = pickModel(config, req.tier, DEFAULT_ANTHROPIC_MODEL);
		const fast = req.tier === 'fast';
		const content = req.documents?.length
			? [
					...req.documents.map((doc) => ({
						type: 'document' as const,
						source: { type: 'base64' as const, media_type: doc.mime, data: doc.base64 }
					})),
					{ type: 'text' as const, text: req.prompt }
				]
			: req.prompt;

		let format: ReturnType<typeof zodOutputFormat> | undefined;
		if (req.jsonSchema) {
			try {
				format = zodOutputFormat(req.jsonSchema);
			} catch {
				format = undefined; // schema not expressible as structured output; rely on prompt + validation
			}
		}

		const effort = fast ? 'low' : 'medium';
		const response = await client.beta.messages.create(
			{
				model,
				max_tokens: req.maxTokens,
				system: req.system,
				messages: [{ role: 'user', content }],
				output_config: format ? { effort, format } : { effort },
				betas: ['server-side-fallback-2026-07-01'],
				fallbacks: 'default'
			},
			{ signal: req.signal, timeout: req.timeoutMs, maxRetries: fast ? 0 : 1 }
		);

		if (response.stop_reason === 'refusal') {
			throw new LlmRefusalError(response.stop_details?.category ?? null);
		}
		return {
			text: response.content
				.filter((block) => block.type === 'text')
				.map((block) => block.text)
				.join(''),
			model: response.model,
			usage: {
				inputTokens: response.usage.input_tokens,
				outputTokens: response.usage.output_tokens
			}
		};
	};
}

/**
 * OpenAI provider: not implemented yet.
 * To add it: install the official `openai` SDK, then return a CompleteFn that
 * calls the Responses API and returns the text (use JSON mode when
 * `req.jsonSchema` is set).
 */
export function openaiComplete(_config: { apiKey: string; model?: string }): CompleteFn {
	return async () => {
		throw new Error(
			'LLM_PROVIDER=openai is not implemented yet (see src/lib/server/ai/providers.ts)'
		);
	};
}

/**
 * Environment variables (SvelteKit 3 `defineEnvVars`).
 *
 * - `public: true`  -> import from `$app/env/public` (safe in the browser)
 * - otherwise       -> import from `$app/env/private` (server only; SvelteKit
 *   refuses to bundle it into browser code). In this repo private vars are
 *   only imported in `src/lib/server/env.ts` (enforced by `pnpm check:env-imports`).
 *
 * Values come from `.env` in dev/build and from the Vercel project settings in
 * production. Keep this list in sync with `.env.example`.
 */
import { building } from '$app/env';
import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

/** Required at runtime, optional while `vite build` analyses the app. */
const required = (schema: z.ZodString) => (building ? schema.optional() : schema);
const optional = z
	.string()
	.optional()
	.transform((v) => (v && v.trim() !== '' ? v : undefined));

export const variables = defineEnvVars({
	// ---- Public (safe in the browser) ----
	PUBLIC_SUPABASE_URL: {
		public: true,
		schema: required(z.string().url()),
		description: 'Supabase API URL (local: http://127.0.0.1:54321)'
	},
	PUBLIC_SUPABASE_ANON_KEY: {
		public: true,
		schema: required(z.string().min(20)),
		description: 'Supabase anon / publishable key (RLS protects all data)'
	},
	PUBLIC_STRIPE_PUBLISHABLE_KEY: {
		public: true,
		schema: optional,
		description: 'Stripe publishable key (later)'
	},

	// ---- Private (server only) ----
	SUPABASE_SERVICE_ROLE_KEY: {
		schema: required(z.string().min(20)),
		description: 'Bypasses RLS. Server only: src/lib/server/supabaseAdmin.ts'
	},
	KID_AUTH_SECRET: {
		schema: required(z.string().min(32, 'KID_AUTH_SECRET must be at least 32 characters')),
		description:
			'HMAC secret that derives the hidden kid auth passwords. Never rotate without migrating kids.'
	},
	LLM_PROVIDER: {
		schema: z
			.enum(['anthropic', 'openai', 'fake'])
			.optional()
			.transform((v) => v ?? 'anthropic'),
		description: 'LLM provider for ask(): anthropic | openai | fake'
	},
	LLM_API_KEY: { schema: optional, description: 'LLM API key. Empty => deterministic fake output' },
	LLM_MODEL: { schema: optional, description: 'LLM model id (provider default if empty)' },
	LLM_MODEL_FAST: {
		schema: optional,
		description: "Model for ask({ tier: 'fast' }) (rewrite, planner queries). Empty => LLM_MODEL"
	},
	LLM_MODEL_SMART: {
		schema: optional,
		description: "Model for ask({ tier: 'smart' }) (plan PDF, planner pick). Empty => LLM_MODEL"
	},
	GOOGLE_PLACES_API_KEY: { schema: optional, description: 'Google Places (later)' },
	STRIPE_SECRET_KEY: { schema: optional, description: 'Stripe secret key (later)' },
	STRIPE_WEBHOOK_SECRET: { schema: optional, description: 'Stripe webhook signing secret (later)' },
	STRIPE_PRICE_ID_FAMILY_PLUS: { schema: optional, description: 'Stripe price id (later)' },
	RESEND_API_KEY: { schema: optional, description: 'Resend key for invite emails (optional)' },
	CRON_SECRET: { schema: optional, description: 'Bearer secret Vercel Cron sends to /api/cron/*' }
});

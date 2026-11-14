/**
 * The ONLY place in the app that imports `$app/env/private`.
 * Everything server-side reads configuration from here.
 * (`pnpm check:env-imports` fails the lint if private env is imported elsewhere.)
 */
import {
	SUPABASE_SERVICE_ROLE_KEY,
	KID_AUTH_SECRET,
	LLM_PROVIDER,
	LLM_API_KEY,
	LLM_MODEL,
	LLM_MODEL_FAST,
	LLM_MODEL_SMART,
	GOOGLE_PLACES_API_KEY,
	STRIPE_SECRET_KEY,
	STRIPE_WEBHOOK_SECRET,
	STRIPE_PRICE_ID_FAMILY_PLUS,
	RESEND_API_KEY,
	CRON_SECRET
} from '$app/env/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$app/env/public';

function must(name: string, value: string | undefined): string {
	if (value === undefined || value === '') {
		throw new Error(`Missing required environment variable ${name} (see .env.example)`);
	}
	return value;
}

/** Typed, lazily validated server configuration. */
export const serverEnv = {
	get supabaseUrl() {
		return must('PUBLIC_SUPABASE_URL', PUBLIC_SUPABASE_URL);
	},
	get supabaseAnonKey() {
		return must('PUBLIC_SUPABASE_ANON_KEY', PUBLIC_SUPABASE_ANON_KEY);
	},
	get supabaseServiceRoleKey() {
		return must('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
	},
	get kidAuthSecret() {
		return must('KID_AUTH_SECRET', KID_AUTH_SECRET);
	},
	llm: {
		provider: LLM_PROVIDER,
		apiKey: LLM_API_KEY,
		model: LLM_MODEL,
		modelFast: LLM_MODEL_FAST,
		modelSmart: LLM_MODEL_SMART
	},
	googlePlacesApiKey: GOOGLE_PLACES_API_KEY,
	stripe: {
		secretKey: STRIPE_SECRET_KEY,
		webhookSecret: STRIPE_WEBHOOK_SECRET,
		priceIdFamilyPlus: STRIPE_PRICE_ID_FAMILY_PLUS
	},
	resendApiKey: RESEND_API_KEY,
	cronSecret: CRON_SECRET
} as const;

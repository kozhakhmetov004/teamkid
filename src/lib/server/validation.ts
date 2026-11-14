/**
 * Validation helpers for form actions and API routes. Every input is checked
 * with Zod; failures return a typed `fail(400, { errors, values })`.
 */
import { fail, type ActionFailure } from '@sveltejs/kit';
import { z, type ZodType } from 'zod';

export type FieldErrors = Record<string, string>;

/** The shape every action failure in this app returns. */
export interface FormFailure {
	/** Which form (action) failed, so pages with several forms show the right message. */
	form: string;
	message: string;
	errors: FieldErrors;
	values?: Record<string, string>;
}

export function formFailure(
	form: string,
	message: string,
	status = 400,
	errors: FieldErrors = {},
	values?: Record<string, string>
): ActionFailure<FormFailure> {
	return fail(status, { form, message, errors, values });
}

/** Parse FormData with a Zod schema. Never echoes secret fields (pin, password) back. */
export async function parseForm<T>(
	request: Request,
	schema: ZodType<T>,
	form: string
): Promise<{ ok: true; data: T } | { ok: false; failure: ActionFailure<FormFailure> }> {
	const formData = await request.formData();
	const raw: Record<string, string> = {};
	for (const [key, value] of formData.entries()) {
		if (typeof value === 'string') raw[key] = value;
	}
	const parsed = schema.safeParse(raw);
	if (parsed.success) return { ok: true, data: parsed.data };

	const errors: FieldErrors = {};
	for (const issue of parsed.error.issues) {
		const key = String(issue.path[0] ?? 'form');
		errors[key] ??= issue.message;
	}
	const values = Object.fromEntries(
		Object.entries(raw).filter(([key]) => !/pin|password|token/i.test(key))
	);
	return {
		ok: false,
		failure: formFailure(form, 'Please check the highlighted fields.', 400, errors, values)
	};
}

/** Only allow same-site relative redirects (prevents open redirects). */
export function safeNext(next: string | null | undefined): string | null {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\'))
		return null;
	return next;
}

export const zEmail = z.string().trim().toLowerCase().email('Enter a valid email address');
export const zName = (label: string, max = 60) =>
	z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

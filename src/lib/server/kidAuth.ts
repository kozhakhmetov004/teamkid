/**
 * Kid login (family code + PIN). Children have no email or password of their own.
 *
 * Each child has a HIDDEN Supabase auth user:
 *   email    = kid-<child_uuid>@kids.teamkid.invalid
 *   password = HMAC_SHA256(KID_AUTH_SECRET, child_uuid) as hex   (derived, never stored)
 *   app_metadata.role = 'child'
 *
 * The PIN is stored only as a bcrypt hash in children.pin_hash. After the PIN
 * matches (and the child is active), the server signs in with the derived
 * password through the SSR client so the normal session cookie is set and RLS
 * works exactly like for parents (`current_child_id()`).
 *
 * This module has no SvelteKit imports, so it is usable from scripts and tests.
 * Secrets and clients are passed in by the caller.
 */
import { createHmac } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.js';

export const KID_EMAIL_DOMAIN = 'kids.teamkid.invalid';
export const MAX_FAILED_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

export const PinSchema = z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits');
export const FamilyCodeSchema = z
	.string()
	.trim()
	.toUpperCase()
	.regex(/^[A-Z]{3,10}-?[0-9]{4}$/, 'Family code looks like TURTLE-1234')
	.transform((code) => (code.includes('-') ? code : code.replace(/^([A-Z]+)(\d{4})$/, '$1-$2')));

export function kidEmail(childId: string): string {
	return `kid-${childId}@${KID_EMAIL_DOMAIN}`;
}

export function deriveKidPassword(secret: string, childId: string): string {
	if (secret.length < 32) throw new Error('KID_AUTH_SECRET must be at least 32 characters');
	return createHmac('sha256', secret).update(childId).digest('hex');
}

export function hashPin(pin: string): Promise<string> {
	return bcrypt.hash(PinSchema.parse(pin), BCRYPT_ROUNDS);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
	return bcrypt.compare(pin, hash);
}

// ---------------------------------------------------------------------------
// Rate limiting (max 5 failed attempts per family code per 15 minutes)
// ---------------------------------------------------------------------------
export interface AttemptStore {
	countFailuresSince(familyCode: string, since: Date): Promise<number>;
	record(familyCode: string, success: boolean): Promise<void>;
}

export async function isRateLimited(
	store: AttemptStore,
	familyCode: string,
	now: Date = new Date()
): Promise<boolean> {
	const since = new Date(now.getTime() - ATTEMPT_WINDOW_MS);
	return (await store.countFailuresSince(familyCode, since)) >= MAX_FAILED_ATTEMPTS;
}

export function supabaseAttemptStore(admin: SupabaseClient<Database>): AttemptStore {
	return {
		async countFailuresSince(familyCode, since) {
			const { count, error } = await admin
				.from('kid_login_attempts')
				.select('id', { count: 'exact', head: true })
				.eq('family_code', familyCode)
				.eq('success', false)
				.gte('created_at', since.toISOString());
			if (error) throw new Error(`rate limit lookup failed: ${error.message}`);
			return count ?? 0;
		},
		async record(familyCode, success) {
			const { error } = await admin
				.from('kid_login_attempts')
				.insert({ family_code: familyCode, success });
			if (error) throw new Error(`rate limit write failed: ${error.message}`);
		}
	};
}

// ---------------------------------------------------------------------------
// PIN check
// ---------------------------------------------------------------------------
export interface KidCandidate {
	id: string;
	pin_hash: string | null;
	status: Database['public']['Enums']['child_status'];
}

export interface KidDirectory {
	/** Children of the family with this code (empty if the code is unknown). */
	childrenForFamilyCode(familyCode: string): Promise<KidCandidate[]>;
}

export function supabaseKidDirectory(admin: SupabaseClient<Database>): KidDirectory {
	return {
		async childrenForFamilyCode(familyCode) {
			const { data: family, error: famErr } = await admin
				.from('families')
				.select('id')
				.eq('family_code', familyCode)
				.maybeSingle();
			if (famErr) throw new Error(`family lookup failed: ${famErr.message}`);
			if (!family) return [];
			const { data, error } = await admin
				.from('children')
				.select('id, pin_hash, status')
				.eq('family_id', family.id);
			if (error) throw new Error(`children lookup failed: ${error.message}`);
			return data ?? [];
		}
	};
}

export type KidAuthResult =
	| { ok: true; childId: string }
	| { ok: false; reason: 'rate_limited' | 'invalid' | 'pending_consent' | 'disabled' };

/**
 * Checks family code + PIN. Does NOT sign in; the caller does that with
 * `kidEmail(childId)` + `deriveKidPassword(secret, childId)`.
 * Unknown code and wrong PIN both count as a failed attempt and return the
 * same generic 'invalid' reason.
 */
export async function authenticateKid(input: {
	familyCode: string;
	pin: string;
	directory: KidDirectory;
	attempts: AttemptStore;
	now?: Date;
}): Promise<KidAuthResult> {
	const { familyCode, pin, directory, attempts } = input;
	if (await isRateLimited(attempts, familyCode, input.now)) {
		return { ok: false, reason: 'rate_limited' };
	}

	const candidates = await directory.childrenForFamilyCode(familyCode);
	for (const child of candidates) {
		if (child.pin_hash && (await verifyPin(pin, child.pin_hash))) {
			if (child.status === 'pending_consent') return { ok: false, reason: 'pending_consent' };
			if (child.status !== 'active') return { ok: false, reason: 'disabled' };
			await attempts.record(familyCode, true);
			return { ok: true, childId: child.id };
		}
	}

	await attempts.record(familyCode, false);
	return { ok: false, reason: 'invalid' };
}

// ---------------------------------------------------------------------------
// Hidden auth user
// ---------------------------------------------------------------------------
/** Creates (or, if it exists, re-syncs) the hidden auth user for a child. Returns its user id. */
export async function ensureKidAuthUser(
	admin: SupabaseClient<Database>,
	secret: string,
	childId: string
): Promise<string> {
	const email = kidEmail(childId);
	const password = deriveKidPassword(secret, childId);
	const attrs = {
		email,
		password,
		email_confirm: true,
		app_metadata: { role: 'child', child_id: childId },
		user_metadata: {}
	};

	const created = await admin.auth.admin.createUser(attrs);
	if (!created.error && created.data.user) return created.data.user.id;

	// Already exists (e.g. seed re-run): find it and re-sync the password.
	const existingId = await findAuthUserIdByEmail(admin, email);
	if (!existingId) throw new Error(`could not create kid auth user: ${created.error?.message}`);
	const updated = await admin.auth.admin.updateUserById(existingId, attrs);
	if (updated.error) throw new Error(`could not update kid auth user: ${updated.error.message}`);
	return existingId;
}

export async function findAuthUserIdByEmail(
	admin: SupabaseClient<Database>,
	email: string
): Promise<string | null> {
	const target = email.toLowerCase();
	for (let page = 1; page <= 50; page++) {
		const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
		if (error) throw new Error(`listUsers failed: ${error.message}`);
		const hit = data.users.find((u) => u.email?.toLowerCase() === target);
		if (hit) return hit.id;
		if (data.users.length < 200) return null;
	}
	return null;
}

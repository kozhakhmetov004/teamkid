import bcrypt from 'bcryptjs';
import { beforeAll, describe, expect, it } from 'vitest';
import {
	ATTEMPT_WINDOW_MS,
	authenticateKid,
	deriveKidPassword,
	FamilyCodeSchema,
	isRateLimited,
	kidEmail,
	MAX_FAILED_ATTEMPTS,
	type AttemptStore,
	type KidCandidate,
	type KidDirectory
} from './kidAuth.js';

/** In-memory attempt store with a controllable clock. */
function memoryStore(clock: { now: Date }) {
	const rows: { code: string; success: boolean; at: number }[] = [];
	const store: AttemptStore = {
		async countFailuresSince(code, since) {
			return rows.filter((r) => r.code === code && !r.success && r.at >= since.getTime()).length;
		},
		async record(code, success) {
			rows.push({ code, success, at: clock.now.getTime() });
		}
	};
	return { store, rows };
}

const SECRET = 'x'.repeat(40);
let lily: KidCandidate;
let leo: KidCandidate;
let directory: KidDirectory;

beforeAll(async () => {
	lily = { id: 'child-lily', pin_hash: await bcrypt.hash('1234', 4), status: 'active' };
	leo = { id: 'child-leo', pin_hash: await bcrypt.hash('9999', 4), status: 'pending_consent' };
	directory = {
		async childrenForFamilyCode(code) {
			return code === 'TURTLE-1234' ? [lily, leo] : [];
		}
	};
});

describe('kid credentials', () => {
	it('derives a stable, secret-dependent password', () => {
		const a = deriveKidPassword(SECRET, 'child-1');
		expect(a).toMatch(/^[0-9a-f]{64}$/);
		expect(deriveKidPassword(SECRET, 'child-1')).toBe(a);
		expect(deriveKidPassword('y'.repeat(40), 'child-1')).not.toBe(a);
		expect(deriveKidPassword(SECRET, 'child-2')).not.toBe(a);
	});

	it('refuses a short secret', () => {
		expect(() => deriveKidPassword('short', 'child-1')).toThrow();
	});

	it('builds the hidden email on the .invalid domain', () => {
		expect(kidEmail('abc')).toBe('kid-abc@kids.teamkid.invalid');
	});

	it('normalises family codes', () => {
		expect(FamilyCodeSchema.parse(' turtle-1234 ')).toBe('TURTLE-1234');
		expect(FamilyCodeSchema.parse('turtle1234')).toBe('TURTLE-1234');
		expect(FamilyCodeSchema.safeParse('1234').success).toBe(false);
	});
});

describe('authenticateKid', () => {
	it('accepts the right PIN for an active child', async () => {
		const { store, rows } = memoryStore({ now: new Date() });
		const res = await authenticateKid({
			familyCode: 'TURTLE-1234',
			pin: '1234',
			directory,
			attempts: store
		});
		expect(res).toEqual({ ok: true, childId: 'child-lily' });
		expect(rows.at(-1)?.success).toBe(true);
	});

	it('returns a generic error for a wrong PIN or unknown code and counts it', async () => {
		const { store, rows } = memoryStore({ now: new Date() });
		expect(
			await authenticateKid({ familyCode: 'TURTLE-1234', pin: '0000', directory, attempts: store })
		).toEqual({ ok: false, reason: 'invalid' });
		expect(
			await authenticateKid({ familyCode: 'NOPE-0000', pin: '1234', directory, attempts: store })
		).toEqual({ ok: false, reason: 'invalid' });
		expect(rows.filter((r) => !r.success)).toHaveLength(2);
	});

	it('refuses a child whose consent is pending', async () => {
		const { store } = memoryStore({ now: new Date() });
		const res = await authenticateKid({
			familyCode: 'TURTLE-1234',
			pin: '9999',
			directory,
			attempts: store
		});
		expect(res).toEqual({ ok: false, reason: 'pending_consent' });
	});
});

describe('rate limiting', () => {
	it(`blocks after ${MAX_FAILED_ATTEMPTS} failures, even with the right PIN`, async () => {
		const clock = { now: new Date('2026-01-01T10:00:00Z') };
		const { store } = memoryStore(clock);
		for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
			const res = await authenticateKid({
				familyCode: 'TURTLE-1234',
				pin: '0000',
				directory,
				attempts: store,
				now: clock.now
			});
			expect(res).toEqual({ ok: false, reason: 'invalid' });
		}
		const blocked = await authenticateKid({
			familyCode: 'TURTLE-1234',
			pin: '1234',
			directory,
			attempts: store,
			now: clock.now
		});
		expect(blocked).toEqual({ ok: false, reason: 'rate_limited' });
	});

	it('is per family code', async () => {
		const clock = { now: new Date('2026-01-01T10:00:00Z') };
		const { store } = memoryStore(clock);
		for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) await store.record('OTHER-0001', false);
		expect(await isRateLimited(store, 'OTHER-0001', clock.now)).toBe(true);
		expect(await isRateLimited(store, 'TURTLE-1234', clock.now)).toBe(false);
	});

	it('unblocks after the 15-minute window', async () => {
		const clock = { now: new Date('2026-01-01T10:00:00Z') };
		const { store } = memoryStore(clock);
		for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) await store.record('TURTLE-1234', false);
		expect(await isRateLimited(store, 'TURTLE-1234', clock.now)).toBe(true);
		const later = new Date(clock.now.getTime() + ATTEMPT_WINDOW_MS + 1000);
		expect(await isRateLimited(store, 'TURTLE-1234', later)).toBe(false);
	});

	it('does not count successful logins', async () => {
		const clock = { now: new Date() };
		const { store } = memoryStore(clock);
		for (let i = 0; i < 10; i++) await store.record('TURTLE-1234', true);
		expect(await isRateLimited(store, 'TURTLE-1234', clock.now)).toBe(false);
	});
});

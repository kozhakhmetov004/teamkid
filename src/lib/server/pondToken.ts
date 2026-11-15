/**
 * Signed game tickets for Pond Pairs. The server deals the deck from a random
 * seed and gives the browser a ticket (child, day, level, seed) signed with
 * HMAC. On finish the browser sends the ticket + flips; the server re-deals
 * from the seed and replays the flips (src/lib/kids/pond.ts). A ticket is only
 * valid for the same child, the same UTC day, and can't be edited.
 * Pure (secret passed in) so it's unit-tested.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface PondTicket {
	childId: string;
	day: string;
	level: number;
	seed: number;
}

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const sign = (body: string, secret: string) =>
	createHmac('sha256', `pond-ticket:${secret}`).update(body).digest('base64url');

export function signTicket(t: PondTicket, secret: string): string {
	const body = b64(JSON.stringify([t.childId, t.day, t.level, t.seed]));
	return `${body}.${sign(body, secret)}`;
}

export function verifyTicket(token: string, secret: string): PondTicket | null {
	const [body, sig] = token.split('.');
	if (!body || !sig) return null;
	const expected = Buffer.from(sign(body, secret));
	const got = Buffer.from(sig);
	if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
	try {
		const [childId, day, level, seed] = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
		if (
			typeof childId !== 'string' ||
			typeof day !== 'string' ||
			!Number.isInteger(level) ||
			!Number.isInteger(seed)
		) {
			return null;
		}
		return { childId, day, level, seed };
	} catch {
		return null;
	}
}

export const newSeed = () => (Math.random() * 2 ** 31) >>> 0;

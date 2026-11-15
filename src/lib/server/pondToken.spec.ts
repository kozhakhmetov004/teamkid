import { describe, expect, it } from 'vitest';
import { signTicket, verifyTicket } from './pondToken';

const secret = 'x'.repeat(32);
const ticket = { childId: 'child-1', day: '2026-11-15', level: 2, seed: 123456 };

describe('pond tickets', () => {
	it('round-trips a signed ticket', () => {
		expect(verifyTicket(signTicket(ticket, secret), secret)).toEqual(ticket);
	});

	it('rejects edited tickets and other secrets', () => {
		const token = signTicket(ticket, secret);
		const [, sig] = token.split('.');
		const forged = `${Buffer.from(JSON.stringify(['child-1', '2026-11-15', 3, 1])).toString('base64url')}.${sig}`;
		expect(verifyTicket(forged, secret)).toBeNull();
		expect(verifyTicket(token, 'y'.repeat(32))).toBeNull();
		expect(verifyTicket('garbage', secret)).toBeNull();
	});
});

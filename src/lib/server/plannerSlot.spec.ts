import { describe, expect, it } from 'vitest';
import { SlotSchema, slotProblem } from './plannerSlot.js';

const today = '2026-11-15';

describe('slotProblem', () => {
	it('accepts 30 minutes to 8 hours within two months', () => {
		expect(slotProblem({ date: '2026-11-21', from: '10:00', to: '10:30' }, today)).toBeNull();
		expect(slotProblem({ date: '2026-11-21', from: '09:00', to: '17:00' }, today)).toBeNull();
		expect(slotProblem({ date: '2027-01-14', from: '10:00', to: '12:00' }, today)).toBeNull();
	});

	it('rejects bad lengths and order', () => {
		expect(slotProblem({ date: '2026-11-21', from: '12:00', to: '10:00' }, today)).toMatch(/after/);
		expect(slotProblem({ date: '2026-11-21', from: '12:00', to: '12:00' }, today)).toMatch(/after/);
		expect(slotProblem({ date: '2026-11-21', from: '10:00', to: '10:15' }, today)).toMatch(
			/30 minutes/
		);
		expect(slotProblem({ date: '2026-11-21', from: '09:00', to: '17:30' }, today)).toMatch(
			/8 hours/
		);
	});

	it('rejects past days and days more than two months ahead', () => {
		expect(slotProblem({ date: '2026-11-14', from: '10:00', to: '12:00' }, today)).toMatch(
			/two months/
		);
		expect(slotProblem({ date: '2027-01-15', from: '10:00', to: '12:00' }, today)).toMatch(
			/two months/
		);
	});
});

describe('SlotSchema', () => {
	it('judges "today" in the parent time zone', () => {
		// 2026-11-15 03:00 UTC is still Nov 14 in Los Angeles.
		const now = new Date('2026-11-15T03:00:00Z');
		const slot = { date: '2026-11-14', from: '20:00', to: '21:00' };
		expect(SlotSchema('America/Los_Angeles', now).safeParse(slot).success).toBe(true);
		expect(SlotSchema('UTC', now).safeParse(slot).success).toBe(false);
	});

	it('rejects malformed times', () => {
		expect(
			SlotSchema('UTC').safeParse({ date: '2026-11-21', from: '9am', to: '11:00' }).success
		).toBe(false);
	});
});

import { describe, expect, it } from 'vitest';
import { generateNights, MAX_NIGHTS } from './pattern.js';
import { planNights } from './planSchedule.js';

describe('planNights', () => {
	it('starts at the plan start when it is today or later', () => {
		const { effectiveStart, nights } = planNights('2-2-3', '2026-11-16', 'A', '2026-11-15');
		expect(effectiveStart).toBe('2026-11-16');
		expect(nights[0]).toEqual({ date: '2026-11-16', home: 'A' });
		expect(nights).toHaveLength(365);
	});

	it('keeps the start of a plan that began this cycle', () => {
		const { effectiveStart, nights } = planNights('2-2-3', '2026-11-09', 'A', '2026-11-15');
		expect(effectiveStart).toBe('2026-11-09');
		expect(nights).toHaveLength(6 + 365);
		expect(
			nights
				.map((n) => n.home)
				.slice(0, 7)
				.join('')
		).toBe('AABBAAA');
	});

	it('moves an old start forward by whole cycles, keeping the phase', () => {
		const { effectiveStart, nights } = planNights('2-2-3', '2025-01-06', 'B', '2026-11-15');
		// 2025-01-06 + 49 * 14 days = 2026-11-09 (a Monday, same point of the cycle).
		expect(effectiveStart).toBe('2026-11-09');
		// Same position in the 14-night cycle as counted from the original start.
		const cycle = generateNights('2-2-3', '2025-01-06', 'B', 14);
		const offset = (Date.parse('2026-11-20') - Date.parse('2025-01-06')) / 86_400_000;
		expect(nights.find((n) => n.date === '2026-11-20')?.home).toBe(cycle[offset % 14].home);
		expect(nights[0]).toEqual({ date: '2026-11-09', home: 'B' });
		expect(nights.length).toBeLessThanOrEqual(MAX_NIGHTS);
		// 365 nights from today (2026-11-15) inclusive.
		expect(nights.at(-1)?.date).toBe('2027-11-14');
	});

	it('keeps alternate weekends on the right Fridays after the shift', () => {
		// Starting 2026-06-03 (Wed): away weekends are Fridays 06-05, 06-19, ... every 14 days.
		const old = generateNights('alternate_weekends', '2026-06-03', 'A', 200);
		const { nights } = planNights('alternate_weekends', '2026-06-03', 'A', '2026-11-15');
		const overlap = nights.filter((n) => old.some((o) => o.date === n.date));
		expect(overlap.length).toBeGreaterThan(0);
		for (const n of overlap) expect(n.home).toBe(old.find((o) => o.date === n.date)?.home);
	});
});

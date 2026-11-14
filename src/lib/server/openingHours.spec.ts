import { describe, expect, it } from 'vitest';
import { openDuring } from './openingHours.js';

const SAT = 6;
const SUN = 7;
const TUE = 2;

describe('openDuring', () => {
	it('is unknown without data or for rules it cannot read', () => {
		expect(openDuring(null, SAT, '10:00', '12:00')).toBeNull();
		expect(openDuring('', SAT, '10:00', '12:00')).toBeNull();
		expect(openDuring('Mo-Su sunrise-sunset', SAT, '10:00', '12:00')).toBeNull();
		expect(openDuring('Mo-Fr 09:00-17:00; PH off', SAT, '10:00', '12:00')).toBeNull();
		expect(openDuring('Apr-Oct: Mo-Su 10:00-18:00', SAT, '10:00', '12:00')).toBeNull();
	});

	it('handles 24/7 and simple day ranges', () => {
		expect(openDuring('24/7', SUN, '07:00', '09:00')).toBe(true);
		expect(openDuring('Mo-Su 09:00-17:00', SAT, '10:00', '12:00')).toBe(true);
		expect(openDuring('Mo-Su 09:00-17:00', SAT, '16:00', '18:00')).toBe(false);
	});

	it('treats days that are not listed as closed', () => {
		expect(openDuring('Mo-Fr 09:00-17:00', SAT, '10:00', '12:00')).toBe(false);
		expect(openDuring('Mo-Fr 09:00-17:00', TUE, '10:00', '12:00')).toBe(true);
	});

	it('applies later rules over earlier ones, including off', () => {
		const oh = 'Mo-Su 10:00-18:00; Tu off';
		expect(openDuring(oh, TUE, '11:00', '12:00')).toBe(false);
		expect(openDuring(oh, SAT, '11:00', '12:00')).toBe(true);
		expect(openDuring('Mo-Fr 09:00-17:00; Sa,Su 10:00-16:00', SUN, '13:00', '15:00')).toBe(true);
	});

	it('supports split hours, wrap-around day ranges and closing after midnight', () => {
		expect(openDuring('Mo-Su 09:00-12:00,13:00-17:00', SAT, '12:00', '14:00')).toBe(false);
		expect(openDuring('Mo-Su 09:00-12:00,13:00-17:00', SAT, '13:00', '15:00')).toBe(true);
		expect(openDuring('Fr-Mo 10:00-16:00', SUN, '10:00', '12:00')).toBe(true);
		expect(openDuring('Fr-Mo 10:00-16:00', TUE, '10:00', '12:00')).toBe(false);
		expect(openDuring('Mo-Su 18:00-01:00', SAT, '19:00', '21:00')).toBe(true);
	});
});

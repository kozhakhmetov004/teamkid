import { describe, expect, it } from 'vitest';
import { MOODS } from '#lib/types/domain.js';
import { CHECKIN_MOODS, ENERGY_FORM_VALUES, ENERGY_LEVELS, LOW_ENERGY_MAX } from './moods.js';

describe('check-in moods', () => {
	it('offers exactly the 6 approved feelings, each with a word and an icon', () => {
		expect(CHECKIN_MOODS.map((m) => m.label)).toEqual([
			'Happy',
			'Calm',
			'Tired',
			'Sad',
			'Worried',
			'Angry'
		]);
		for (const m of CHECKIN_MOODS) {
			expect(m.icon.length).toBeGreaterThan(0);
			expect(m.label.length).toBeGreaterThan(0);
		}
	});

	it('only uses values allowed by the mood_checkins check constraint', () => {
		for (const m of CHECKIN_MOODS) expect(MOODS).toContain(m.value);
	});
});

describe('energy levels', () => {
	it('maps Low/Medium/High to 1/3/5 inside the DB range 1–5', () => {
		expect(ENERGY_LEVELS.map((e) => [e.label, e.value])).toEqual([
			['Low', 1],
			['Medium', 3],
			['High', 5]
		]);
		expect(ENERGY_FORM_VALUES).toEqual(ENERGY_LEVELS.map((e) => String(e.value)));
	});

	it('treats Low (1) as low energy and Medium (3) as not low', () => {
		expect(1).toBeLessThanOrEqual(LOW_ENERGY_MAX);
		expect(3).toBeGreaterThan(LOW_ENERGY_MAX);
	});
});

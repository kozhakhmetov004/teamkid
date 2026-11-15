import { describe, expect, it } from 'vitest';
import { packingList } from './packing.js';

describe('packingList', () => {
	it('keeps the base list when plans are unknown', () => {
		const keys = packingList([{ title: 'Visit Marat', kind: 'other', weekday: 'Thu' }]).map(
			(i) => i.key
		);
		expect(keys).toEqual(['backpack', 'pajamas', 'toothbrush', 'toy']);
	});

	it('adds things for the plans, once, with the reason', () => {
		const items = packingList([
			{ title: 'Swim class', kind: 'activity', weekday: 'Thu' },
			{ title: 'Pool party', kind: 'activity', weekday: 'Sat' }
		]);
		expect(items.filter((i) => i.key === 'swimsuit')).toEqual([
			{ key: 'swimsuit', icon: '🩱', label: 'Swimsuit', reason: 'for Swim class on Thu' }
		]);
		expect(items.map((i) => i.key)).toEqual(
			expect.arrayContaining(['towel', 'homework', 'present'])
		);
	});
});

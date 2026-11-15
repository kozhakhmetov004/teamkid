import { describe, expect, it } from 'vitest';
import { computeBalance } from './balance';
import { affordability, myShareCents, planImpactPct, suggestSplitPct } from './income';

const half = { payer_share_pct: 50, other_share_pct: 50 };

describe('suggestSplitPct', () => {
	it('is proportional to the ranges, rounded to 5%', () => {
		expect(suggestSplitPct('75_100k', '75_100k')).toBe(50);
		expect(suggestSplitPct('100_150k', '50_75k')).toBe(65); // 125 / 187.5 = 66.7 → 65
		expect(suggestSplitPct('50_75k', '100_150k')).toBe(35);
	});

	it('keeps both parents between 10% and 90%', () => {
		expect(suggestSplitPct('250k_plus', 'under_25k')).toBe(90);
		expect(suggestSplitPct('under_25k', '250k_plus')).toBe(10);
	});

	it('both parents get suggestions that add up to 100', () => {
		expect(suggestSplitPct('150_250k', '25_50k') + suggestSplitPct('25_50k', '150_250k')).toBe(100);
	});
});

describe('myShareCents', () => {
	it('counts my part whoever paid, and skips cancelled or disputed', () => {
		const rows = [
			{ paid_by: 'me', amount_cents: 10000, split: half, status: 'approved' }, // 50
			{ paid_by: 'dad', amount_cents: 4000, split: half, status: 'pending' }, // 20
			{
				paid_by: 'me',
				amount_cents: 3000,
				split: { payer_share_pct: 100, other_share_pct: 0 },
				status: 'approved'
			}, // 30
			{ paid_by: 'dad', amount_cents: 9999, split: half, status: 'cancelled' },
			{ paid_by: 'dad', amount_cents: 9999, split: half, status: 'disputed' }
		];
		expect(myShareCents(rows, 'me')).toBe(5000 + 2000 + 3000);
	});
});

describe('affordability', () => {
	it('compares my share with my monthly income range', () => {
		// $87.5k / 12 ≈ $7,291.67 a month; $729.17 ≈ 10%
		expect(affordability(72917, '75_100k')).toMatchObject({ pctOfIncome: 10, level: 'moderate' });
		expect(affordability(20000, '75_100k').level).toBe('light');
		expect(affordability(200000, '25_50k').level).toBe('heavy');
	});

	it('works without a range (amount only)', () => {
		expect(affordability(12345, null)).toMatchObject({
			share: '$123.45',
			pctOfIncome: null,
			level: null
		});
	});

	it('estimates the impact of one planned cost', () => {
		expect(planImpactPct(15000, '25_50k')).toBe(4.8);
		expect(planImpactPct(15000, undefined)).toBeNull();
	});
});

describe('computeBalance with partial payments', () => {
	const expenses = [{ paid_by: 'mom', amount_cents: 60000, split: half, status: 'approved' }];

	it('a partial payment lowers what the payer owes', () => {
		const b = computeBalance(expenses, 'dad', [{ paid_by: 'dad', credit_cents: 10000 }]);
		expect(b.netCents).toBe(-20000); // owed 300, paid 100
		const mom = computeBalance(expenses, 'mom', [{ paid_by: 'dad', credit_cents: 10000 }]);
		expect(mom.netCents).toBe(20000);
	});

	it('is settled when credits cover everything', () => {
		const b = computeBalance(expenses, 'dad', [{ paid_by: 'dad', credit_cents: 30000 }]);
		expect(b.direction).toBe('settled');
	});
});

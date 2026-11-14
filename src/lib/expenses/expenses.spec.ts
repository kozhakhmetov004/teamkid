import { describe, expect, it } from 'vitest';
import { balanceText, computeBalance } from './balance.js';
import { CATEGORIES, CATEGORY_VALUES } from './categories.js';
import { formatCents, parseDollars } from './money.js';
import { makeSplit, otherShareCents, splitLabel } from './split.js';

describe('money', () => {
	it('parses dollars to integer cents', () => {
		expect(parseDollars('$12.5')).toBe(1250);
		expect(parseDollars('12,50')).toBe(1250);
		expect(parseDollars('1,234.00')).toBe(123400);
		expect(parseDollars('38')).toBe(3800);
		expect(parseDollars('0')).toBeNull();
		expect(parseDollars('-5')).toBeNull();
		expect(parseDollars('12.345')).toBeNull();
		expect(parseDollars('10000.01')).toBeNull();
		expect(parseDollars('abc')).toBeNull();
	});
	it('formats cents', () => {
		expect(formatCents(1250)).toBe('$12.50');
		expect(formatCents(4250)).toBe('$42.50');
	});
});

describe('split', () => {
	it('builds presets and custom splits', () => {
		expect(makeSplit('50')).toEqual({ payer_share_pct: 50, other_share_pct: 50 });
		expect(makeSplit('60')).toEqual({ payer_share_pct: 60, other_share_pct: 40 });
		expect(makeSplit('other')).toEqual({ payer_share_pct: 0, other_share_pct: 100 });
		expect(makeSplit('me')).toEqual({ payer_share_pct: 100, other_share_pct: 0 });
		expect(makeSplit('custom', 66.67)).toEqual({ payer_share_pct: 66.67, other_share_pct: 33.33 });
		expect(makeSplit('custom', 101)).toBeNull();
		expect(makeSplit('custom')).toBeNull();
	});
	it('rounds the other share once, half away from zero', () => {
		expect(otherShareCents(3800, { payer_share_pct: 50, other_share_pct: 50 })).toBe(1900);
		expect(otherShareCents(1001, { payer_share_pct: 50, other_share_pct: 50 })).toBe(501); // 500.5 -> 501
		expect(otherShareCents(10000, { payer_share_pct: 66.67, other_share_pct: 33.33 })).toBe(3333);
		expect(otherShareCents(10000, { payer_share_pct: 100, other_share_pct: 0 })).toBe(0);
	});
	it('labels splits', () => {
		expect(splitLabel({ payer_share_pct: 60, other_share_pct: 40 })).toBe('60 / 40');
		expect(splitLabel({ payer_share_pct: 0, other_share_pct: 100 })).toBe('Other parent 100%');
	});
});

describe('balance', () => {
	const me = 'mom';
	const them = 'dad';
	const half = { payer_share_pct: 50, other_share_pct: 50 };
	it('nets approved items in both directions', () => {
		const b = computeBalance(
			[
				{ paid_by: me, amount_cents: 3800, split: half, status: 'approved' }, // dad owes 1900
				{ paid_by: them, amount_cents: 2400, split: half, status: 'approved' } // I owe 1200
			],
			me
		);
		expect(b).toEqual({ netCents: 700, items: 2, direction: 'they_owe_me' });
		expect(balanceText(b, 'Dad')).toBe('Dad owes you $7.00');
	});
	it('ignores pending, disputed, cancelled and reimbursed items and 100%-mine items', () => {
		const b = computeBalance(
			[
				{ paid_by: me, amount_cents: 10000, split: half, status: 'pending' },
				{ paid_by: me, amount_cents: 10000, split: half, status: 'disputed' },
				{ paid_by: me, amount_cents: 10000, split: half, status: 'reimbursed' },
				{ paid_by: me, amount_cents: 10000, split: half, status: 'cancelled' },
				{
					paid_by: me,
					amount_cents: 10000,
					split: { payer_share_pct: 100, other_share_pct: 0 },
					status: 'approved'
				}
			],
			me
		);
		expect(b).toEqual({ netCents: 0, items: 0, direction: 'settled' });
		expect(balanceText(b, 'Dad')).toBe('All settled ✓');
	});
	it('handles 33.33% splits and many items', () => {
		const third = { payer_share_pct: 66.67, other_share_pct: 33.33 };
		const list = Array.from({ length: 30 }, () => ({
			paid_by: them,
			amount_cents: 1000,
			split: third,
			status: 'approved'
		}));
		const b = computeBalance(list, me);
		expect(b.items).toBe(30);
		expect(b.netCents).toBe(-30 * 333);
		expect(balanceText(b, 'Dad')).toBe('You owe Dad $99.90');
	});
});

describe('categories', () => {
	it('has unique values with labels and icons', () => {
		expect(new Set(CATEGORY_VALUES).size).toBe(CATEGORIES.length);
		for (const c of CATEGORIES) expect(c.label && c.icon).toBeTruthy();
		expect(CATEGORY_VALUES).toContain('entertainment');
	});
});

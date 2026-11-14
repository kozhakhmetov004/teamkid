/**
 * How an expense is shared. Stored in expenses.split as
 *   { "payer_share_pct": 50, "other_share_pct": 50 }
 * (percentages, two decimals allowed, summing to 100).
 */
import { roundHalfAway } from './money.js';

export interface Split {
	payer_share_pct: number;
	other_share_pct: number;
}

export const SPLIT_PRESETS = [
	{ value: '50', label: '50 / 50', payer: 50 },
	{ value: '60', label: '60 / 40 (I pay 60%)', payer: 60 },
	{ value: '70', label: '70 / 30 (I pay 70%)', payer: 70 },
	{ value: 'other', label: 'The other parent pays 100%', payer: 0 },
	{ value: 'me', label: 'I pay 100% (for the record)', payer: 100 },
	{ value: 'custom', label: 'Custom %', payer: null }
] as const;
export type SplitPreset = (typeof SPLIT_PRESETS)[number]['value'];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Build the stored split from a preset (or a custom payer percentage). */
export function makeSplit(preset: SplitPreset, customPayerPct?: number): Split | null {
	const p = SPLIT_PRESETS.find((x) => x.value === preset);
	if (!p) return null;
	const payer = p.payer ?? customPayerPct;
	if (payer === undefined || Number.isNaN(payer) || payer < 0 || payer > 100) return null;
	const payer_share_pct = round2(payer);
	return { payer_share_pct, other_share_pct: round2(100 - payer_share_pct) };
}

export function parseSplit(value: unknown): Split {
	const v = (value ?? {}) as Partial<Split>;
	if (typeof v.payer_share_pct === 'number' && typeof v.other_share_pct === 'number') {
		return { payer_share_pct: v.payer_share_pct, other_share_pct: v.other_share_pct };
	}
	return { payer_share_pct: 50, other_share_pct: 50 };
}

/** What the other parent owes the payer, in cents (rounded once, half away from zero). */
export function otherShareCents(amountCents: number, split: Split): number {
	return roundHalfAway((amountCents * split.other_share_pct) / 100);
}

/** "50 / 50", "60 / 40", "Other parent 100%" */
export function splitLabel(split: Split): string {
	if (split.other_share_pct === 0) return 'Payer 100%';
	if (split.payer_share_pct === 0) return 'Other parent 100%';
	const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
	return `${f(split.payer_share_pct)} / ${f(split.other_share_pct)}`;
}

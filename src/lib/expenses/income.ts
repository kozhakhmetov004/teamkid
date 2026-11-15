/**
 * Private income ranges (annual, before tax) and what they power:
 *  - the private "My money" card (my share of child costs vs my income)
 *  - an income-based split SUGGESTION, only when both parents opted in.
 * A range is stored, never an exact salary. Suggestions are rounded to 5%,
 * so a percentage reveals at most a rough ratio (parents are told this).
 * Pure, no I/O.
 */
import { formatCents } from './money.js';
import { otherShareCents, parseSplit } from './split.js';

export const INCOME_BANDS = [
	{ value: 'under_25k', label: 'Under $25k', midCents: 18_000_00 },
	{ value: '25_50k', label: '$25k–$50k', midCents: 37_500_00 },
	{ value: '50_75k', label: '$50k–$75k', midCents: 62_500_00 },
	{ value: '75_100k', label: '$75k–$100k', midCents: 87_500_00 },
	{ value: '100_150k', label: '$100k–$150k', midCents: 125_000_00 },
	{ value: '150_250k', label: '$150k–$250k', midCents: 200_000_00 },
	{ value: '250k_plus', label: '$250k or more', midCents: 300_000_00 }
] as const;
export type IncomeBand = (typeof INCOME_BANDS)[number]['value'];
export const INCOME_BAND_VALUES = INCOME_BANDS.map((b) => b.value) as [IncomeBand, ...IncomeBand[]];
export const bandInfo = (v: string | null | undefined) =>
	INCOME_BANDS.find((b) => b.value === v) ?? null;

/**
 * My suggested share (%) from both ranges: proportional to the range midpoints,
 * rounded to the nearest 5 and kept between 10 and 90 (nobody pays nothing).
 */
export function suggestSplitPct(myBand: IncomeBand, otherBand: IncomeBand): number {
	const mine = bandInfo(myBand)!.midCents;
	const theirs = bandInfo(otherBand)!.midCents;
	const pct = Math.round(((mine / (mine + theirs)) * 100) / 5) * 5;
	return Math.min(90, Math.max(10, pct));
}

export interface ShareRow {
	paid_by: string;
	amount_cents: number;
	split: unknown;
	status: string;
}

/** What my part of the child costs is (pending + approved + reimbursed), in cents. */
export function myShareCents(rows: ShareRow[], me: string): number {
	let total = 0;
	for (const r of rows) {
		if (!['pending', 'approved', 'reimbursed'].includes(r.status)) continue;
		const other = otherShareCents(r.amount_cents, parseSplit(r.split));
		total += r.paid_by === me ? r.amount_cents - other : other;
	}
	return total;
}

export interface Affordability {
	shareCents: number;
	share: string;
	/** % of my estimated monthly income (range midpoint / 12), or null without a range */
	pctOfIncome: number | null;
	level: 'light' | 'moderate' | 'heavy' | null;
}

export function affordability(shareCents: number, band: string | null | undefined): Affordability {
	const info = bandInfo(band);
	const monthly = info ? info.midCents / 12 : 0;
	const pct = info && monthly > 0 ? Math.round((shareCents / monthly) * 1000) / 10 : null;
	return {
		shareCents,
		share: formatCents(shareCents),
		pctOfIncome: pct,
		level: pct === null ? null : pct < 10 ? 'light' : pct < 20 ? 'moderate' : 'heavy'
	};
}

/** My share of ONE planned cost as % of monthly income ("Can I afford this?"). */
export function planImpactPct(myPartCents: number, band: string | null | undefined): number | null {
	const info = bandInfo(band);
	if (!info) return null;
	return Math.round((myPartCents / (info.midCents / 12)) * 1000) / 10;
}

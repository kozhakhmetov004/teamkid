/** Money is integer cents everywhere. Floats only exist at the input box. */
export const MAX_CENTS = 1_000_000; // $10,000

/** "$12.5" / "12,50" / "1,234.00" -> 1250 / 1250 / 123400. Returns null when invalid. */
export function parseDollars(input: string): number | null {
	let s = input.trim().replace(/^\$/, '').replace(/\s/g, '');
	if (!s) return null;
	// "12,50" (comma decimal) vs "1,234.00" (thousands)
	if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
	else s = s.replace(/,/g, '');
	if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
	const [whole, frac = ''] = s.split('.');
	const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
	if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS) return null;
	return cents;
}

export function formatCents(cents: number, currency = 'USD'): string {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

/** Round half away from zero (for shares). */
export function roundHalfAway(value: number): number {
	return Math.sign(value) * Math.round(Math.abs(value));
}

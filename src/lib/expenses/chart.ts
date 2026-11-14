/** Shapes rows of v_spending_by_category into what <SpendingChart> renders (pure). */
import { categoryInfo } from './categories.js';

export interface SpendingRow {
	month: string | null; // 'YYYY-MM-01'
	category: string | null;
	total_cents: number | string | null;
}

export interface ChartMonth {
	month: string; // 'YYYY-MM'
	label: string; // 'November 2026'
	shortLabel: string; // 'Nov'
	totalCents: number;
	rows: { category: string; label: string; icon: string; totalCents: number }[];
}

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(
		new Date(`${iso}-01T12:00:00Z`)
	);

/** Months newest first, always including the `count` months ending at `currentMonth` ('YYYY-MM'). */
export function buildChartMonths(
	rows: SpendingRow[],
	currentMonth: string,
	count = 3
): ChartMonth[] {
	const [y, m] = currentMonth.split('-').map(Number);
	const out: ChartMonth[] = [];
	for (let i = 0; i < count; i++) {
		const d = new Date(Date.UTC(y, m - 1 - i, 1));
		const key = d.toISOString().slice(0, 7);
		const monthRows = rows
			.filter((r) => (r.month ?? '').slice(0, 7) === key && r.category)
			.map((r) => {
				const info = categoryInfo(r.category!);
				return {
					category: info.value,
					label: info.label,
					icon: info.icon,
					totalCents: Number(r.total_cents ?? 0)
				};
			})
			.sort((a, b) => b.totalCents - a.totalCents);
		out.push({
			month: key,
			label: fmt(key, { month: 'long', year: 'numeric' }),
			shortLabel: fmt(key, { month: 'short' }),
			totalCents: monthRows.reduce((s, r) => s + r.totalCents, 0),
			rows: monthRows
		});
	}
	return out;
}

import type { ExpenseStatus } from '#lib/expenses/categories.js';

/** One expense as the signed-in parent sees it (built on the server). */
export interface ExpenseView {
	id: string;
	title: string;
	category: string;
	categoryLabel: string;
	categoryIcon: string;
	amountCents: number;
	amount: string;
	spentOn: string; // 'YYYY-MM-DD'
	spentOnLabel: string;
	paidBy: string; // "You" or the other parent's name
	paidByMe: boolean;
	payerPct: number;
	splitLabel: string;
	otherShare: string;
	status: ExpenseStatus;
	statusLabel: string;
	statusIcon: string;
	note: string | null;
	statusNote: string | null;
	receiptPath: string | null;
	childId: string | null;
	childName: string | null;
	can: {
		approve: boolean;
		dispute: boolean;
		cancel: boolean;
		reimburse: boolean;
		resubmit: boolean;
	};
}

export interface MonthOption {
	value: string; // 'YYYY-MM'
	label: string; // 'November 2026'
}

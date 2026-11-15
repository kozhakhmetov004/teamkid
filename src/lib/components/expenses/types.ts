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

/** "Ask before spending" request. */
export interface RequestView {
	id: string;
	title: string;
	category: string;
	categoryLabel: string;
	categoryIcon: string;
	estimateCents: number;
	estimate: string;
	payerPct: number;
	splitLabel: string;
	/** what the person reading pays of the estimate, e.g. "$90.00" */
	myPart: string;
	myPartCents: number;
	childId: string | null;
	childName: string | null;
	requestedBy: string;
	mine: boolean;
	status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'used';
	statusLabel: string;
	note: string | null;
	responseNote: string | null;
	whenLabel: string;
	can: { approve: boolean; decline: boolean; cancel: boolean; log: boolean };
}

/** A monthly cost rule. */
export interface RecurringView {
	id: string;
	title: string;
	categoryIcon: string;
	amount: string;
	splitLabel: string;
	myPart: string;
	dayOfMonth: number;
	nextLabel: string | null;
	createdBy: string;
	mine: boolean;
	status: 'pending' | 'active' | 'declined' | 'stopped';
	can: { approve: boolean; decline: boolean; stop: boolean };
}

export interface SettlementView {
	id: string;
	amount: string;
	from: string;
	to: string;
	paidByMe: boolean;
	method: string;
	note: string | null;
	kind: 'full' | 'partial';
	whenLabel: string;
	confirmed: boolean;
	canConfirm: boolean;
}

export interface FamilySplitView {
	agreed: { myPct: number; otherPct: number; basis: 'custom' | 'income'; whenLabel: string } | null;
	proposal: {
		id: string;
		mine: boolean;
		myPct: number;
		otherPct: number;
		basis: 'custom' | 'income';
		by: string;
	} | null;
}

/** PRIVATE to the signed-in parent. Never contains the co-parent's income. */
export interface MyMoneyView {
	band: string | null;
	bandLabel: string | null;
	shareForSplit: boolean;
	monthLabel: string;
	share: string;
	pctOfIncome: number | null;
	level: 'light' | 'moderate' | 'heavy' | null;
	/** income-based split: only when BOTH parents opted in */
	suggestion: { myPct: number } | null;
	otherOptedIn: boolean;
}

export interface MonthOption {
	value: string; // 'YYYY-MM'
	label: string; // 'November 2026'
}

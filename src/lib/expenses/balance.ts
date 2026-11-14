/**
 * "Who owes whom": from APPROVED, not-yet-reimbursed expenses only.
 * Pure, cents only, exact until the single rounding per item in otherShareCents.
 * Wording is neutral: amounts and direction, never judgement.
 */
import { formatCents } from './money.js';
import { otherShareCents, parseSplit } from './split.js';

export interface BalanceInput {
	paid_by: string;
	amount_cents: number;
	split: unknown;
	status: string;
}

export interface Balance {
	/** positive: the other parent owes me; negative: I owe them; 0: settled */
	netCents: number;
	items: number;
	direction: 'they_owe_me' | 'i_owe_them' | 'settled';
}

export function computeBalance(expenses: BalanceInput[], myMemberId: string): Balance {
	let net = 0;
	let items = 0;
	for (const e of expenses) {
		if (e.status !== 'approved') continue;
		const share = otherShareCents(e.amount_cents, parseSplit(e.split));
		if (share === 0) continue;
		items++;
		net += e.paid_by === myMemberId ? share : -share;
	}
	return {
		netCents: net,
		items,
		direction: net > 0 ? 'they_owe_me' : net < 0 ? 'i_owe_them' : 'settled'
	};
}

export function balanceText(balance: Balance, otherName: string): string {
	if (balance.direction === 'settled') return 'All settled ✓';
	const amount = formatCents(Math.abs(balance.netCents));
	return balance.direction === 'they_owe_me'
		? `${otherName} owes you ${amount}`
		: `You owe ${otherName} ${amount}`;
}

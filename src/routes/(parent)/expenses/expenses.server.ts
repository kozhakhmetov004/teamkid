/** Server helpers shared by the expenses page and the dashboard (RLS clients only). */
import type { SupabaseClient } from '@supabase/supabase-js';
import { peopleFor, type ParentRow } from '#lib/custody/people.js';
import { shortDate } from '#lib/custody/today.js';
import type { ExpenseView } from '#lib/components/expenses/types.js';
import { categoryInfo, STATUSES, type ExpenseStatus } from '#lib/expenses/categories.js';
import { formatCents } from '#lib/expenses/money.js';
import { otherShareCents, parseSplit, splitLabel } from '#lib/expenses/split.js';
import type { Database } from '#lib/types/database.js';

type Sb = SupabaseClient<Database>;
export type ExpenseRowDb = Database['public']['Tables']['expenses']['Row'];

export const EXPENSE_COLUMNS =
	'id, title, category, amount_cents, spent_on, paid_by, split, status, note, status_note, receipt_path, child_id, resubmit_of, created_at';

export function toView(
	e: Pick<
		ExpenseRowDb,
		| 'id'
		| 'title'
		| 'category'
		| 'amount_cents'
		| 'spent_on'
		| 'paid_by'
		| 'split'
		| 'status'
		| 'note'
		| 'status_note'
		| 'receipt_path'
		| 'child_id'
	>,
	me: { member_id: string; home: string | null },
	parents: ParentRow[],
	children: { id: string; first_name: string }[]
): ExpenseView {
	const people = peopleFor(parents, me);
	const split = parseSplit(e.split);
	const status = e.status as ExpenseStatus;
	const paidByMe = e.paid_by === me.member_id;
	const cat = categoryInfo(e.category);
	const st = STATUSES[status] ?? { label: status, icon: '•' };
	return {
		id: e.id,
		title: e.title,
		category: e.category,
		categoryLabel: cat.label,
		categoryIcon: cat.icon,
		amountCents: e.amount_cents,
		amount: formatCents(e.amount_cents),
		spentOn: e.spent_on,
		spentOnLabel: shortDate(e.spent_on),
		paidBy: people.nameById(e.paid_by),
		paidByMe,
		payerPct: split.payer_share_pct,
		splitLabel: splitLabel(split),
		otherShare: formatCents(otherShareCents(e.amount_cents, split)),
		status,
		statusLabel: st.label,
		statusIcon: st.icon,
		note: e.note,
		statusNote: e.status_note,
		receiptPath: e.receipt_path,
		childId: e.child_id,
		childName: children.find((c) => c.id === e.child_id)?.first_name ?? null,
		can: {
			approve: !paidByMe && status === 'pending',
			dispute: !paidByMe && status === 'pending',
			cancel: paidByMe && (status === 'pending' || status === 'disputed'),
			reimburse: !paidByMe && status === 'approved' && split.other_share_pct > 0,
			resubmit: paidByMe && status === 'disputed'
		}
	};
}

/** Approved, not-yet-reimbursed expenses (the balance input). */
export async function loadBalanceRows(sb: Sb, familyId: string) {
	const { data } = await sb
		.from('expenses')
		.select('paid_by, amount_cents, split, status')
		.eq('family_id', familyId)
		.eq('status', 'approved');
	return data ?? [];
}

export async function loadSpendingRows(sb: Sb, familyId: string, fromMonth: string) {
	const { data } = await sb
		.from('v_spending_by_category')
		.select('month, category, total_cents')
		.eq('family_id', familyId)
		.gte('month', `${fromMonth}-01`);
	return data ?? [];
}

/** 'YYYY-MM' that is `delta` months from `month`. */
export function shiftMonth(month: string, delta: number): string {
	const [y, m] = month.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/**
 * Expenses: log, filter, approve / dispute / cancel / reimburse, re-submit.
 * All reads and writes use locals.supabase (RLS). Status changes only via
 * respond_to_expense(); receipts are verified server-side before being linked.
 */
import { z } from 'zod';
import { logAudit } from '#lib/server/audit.js';
import { requireParent } from '#lib/server/guards.js';
import { verifyUploadedObject } from '#lib/server/storageVerify.js';
import { formFailure, parseForm } from '#lib/server/validation.js';
import { peopleFor } from '#lib/custody/people.js';
import { DATE_RE } from '#lib/custody/time.js';
import { addDays, localDate, safeTimeZone } from '#lib/custody/today.js';
import { balanceText, computeBalance } from '#lib/expenses/balance.js';
import { CATEGORY_VALUES } from '#lib/expenses/categories.js';
import { buildChartMonths } from '#lib/expenses/chart.js';
import { parseDollars } from '#lib/expenses/money.js';
import { makeSplit, SPLIT_PRESETS, type SplitPreset } from '#lib/expenses/split.js';
import type { MonthOption } from '#lib/components/expenses/types.js';
import {
	EXPENSE_COLUMNS,
	loadBalanceRows,
	loadSpendingRows,
	shiftMonth,
	toView
} from './expenses.server.js';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

const STATUS_FILTERS = [
	'all',
	'needs_ok',
	'pending',
	'approved',
	'reimbursed',
	'disputed',
	'cancelled'
] as const;

export const load: PageServerLoad = async (event) => {
	const { member } = await requireParent(event);
	event.depends('app:expenses');
	const tz = safeTimeZone(event.cookies.get('tz'));
	const today = localDate(new Date(), tz);
	const currentMonth = today.slice(0, 7);
	const q = event.url.searchParams;
	const month = /^\d{4}-\d{2}$/.test(q.get('month') ?? '') ? q.get('month')! : currentMonth;
	const category = (CATEGORY_VALUES as readonly string[]).includes(q.get('category') ?? '')
		? q.get('category')!
		: 'all';
	const status = (STATUS_FILTERS as readonly string[]).includes(q.get('status') ?? '')
		? q.get('status')!
		: 'all';

	const sb = event.locals.supabase;
	const familyId = member.family_id;
	let query = sb
		.from('expenses')
		.select(EXPENSE_COLUMNS)
		.eq('family_id', familyId)
		.gte('spent_on', `${month}-01`)
		.lt('spent_on', `${shiftMonth(month, 1)}-01`)
		.order('spent_on', { ascending: false })
		.order('created_at', { ascending: false });
	if (category !== 'all') query = query.eq('category', category);
	if (status === 'needs_ok') query = query.eq('status', 'pending').neq('paid_by', member.member_id);
	else if (status !== 'all') query = query.eq('status', status);

	const [rows, parents, children, balanceRows, spendingRows] = await Promise.all([
		query,
		sb
			.from('members')
			.select('id, display_name, home')
			.eq('family_id', familyId)
			.eq('role', 'parent'),
		sb.from('children').select('id, first_name').eq('family_id', familyId).order('created_at'),
		loadBalanceRows(sb, familyId),
		loadSpendingRows(sb, familyId, shiftMonth(currentMonth, -2))
	]);
	const people = peopleFor(parents.data ?? [], member);
	const otherName = people.otherName ?? 'your co-parent';
	const balance = computeBalance(balanceRows, member.member_id);

	const months: MonthOption[] = Array.from({ length: 12 }, (_, i) => {
		const value = shiftMonth(currentMonth, -i);
		return {
			value,
			label: new Intl.DateTimeFormat('en-US', {
				month: 'long',
				year: 'numeric',
				timeZone: 'UTC'
			}).format(new Date(`${value}-01T12:00:00Z`))
		};
	});

	return {
		familyId,
		today,
		otherName,
		hasCoParent: people.other !== null,
		children: children.data ?? [],
		expenses: (rows.data ?? []).map((e) =>
			toView(e, member, parents.data ?? [], children.data ?? [])
		),
		months,
		filters: { month, category, status },
		balance: { text: balanceText(balance, otherName), items: balance.items },
		chart: buildChartMonths(spendingRows, currentMonth)
	};
};

// ---------------------------------------------------------------------------
const presetValues = SPLIT_PRESETS.map((p) => p.value) as [SplitPreset, ...SplitPreset[]];
const ExpenseFields = z.object({
	title: z
		.string()
		.trim()
		.min(1, 'Give it a short title')
		.max(80, 'Keep the title under 80 characters'),
	amount: z.string().trim().min(1, 'Enter an amount'),
	spentOn: z.string().regex(DATE_RE, 'Pick a date'),
	category: z.enum(CATEGORY_VALUES),
	childId: z
		.string()
		.optional()
		.transform((v) => (v ? v : null))
		.pipe(z.uuid().nullable()),
	note: z
		.string()
		.trim()
		.max(280, 'Keep the note under 280 characters')
		.optional()
		.transform((v) => (v ? v : null)),
	split: z.enum(presetValues),
	customPayerPct: z.string().optional(),
	receiptPath: z
		.string()
		.optional()
		.transform((v) => (v ? v : null))
});
const Resubmit = z.intersection(ExpenseFields, z.object({ resubmitOf: z.uuid() }));
const Respond = z.object({
	expenseId: z.uuid(),
	action: z.enum(['approve', 'dispute', 'cancel', 'reimburse']),
	note: z.string().trim().max(280).optional()
});

async function insertExpense(
	event: RequestEvent,
	form: string,
	v: z.infer<typeof ExpenseFields>,
	resubmitOf: string | null
) {
	const { member } = await requireParent(event);
	const tz = safeTimeZone(event.cookies.get('tz'));
	const today = localDate(new Date(), tz);
	const sb = event.locals.supabase;

	const amountCents = parseDollars(v.amount);
	if (!amountCents)
		return formFailure(form, 'Check the amount', 400, {
			amount: 'Enter an amount between $0.01 and $10,000'
		});
	if (v.spentOn > today || v.spentOn < addDays(today, -366)) {
		return formFailure(form, 'Check the date', 400, {
			spentOn: 'Not in the future, and within the last year'
		});
	}
	const split = makeSplit(v.split, v.customPayerPct ? Number(v.customPayerPct) : undefined);
	if (!split)
		return formFailure(form, 'Check the split', 400, { split: 'Enter a percentage from 0 to 100' });
	if (v.childId) {
		const { data } = await sb.from('children').select('id').eq('id', v.childId).maybeSingle();
		if (!data) return formFailure(form, 'Unknown child', 400);
	}
	const { data: parents } = await sb
		.from('members')
		.select('id')
		.eq('family_id', member.family_id)
		.eq('role', 'parent');
	if ((parents?.length ?? 0) < 2 && split.other_share_pct > 0) {
		return formFailure(form, 'Invite your co-parent before sharing an expense with them.');
	}
	if (v.receiptPath && !resubmitOf) {
		const verified = await verifyUploadedObject(v.receiptPath, member.family_id);
		if (!verified.ok) return formFailure(form, verified.error, 400);
	} else if (v.receiptPath && !v.receiptPath.startsWith(`${member.family_id}/`)) {
		return formFailure(form, 'That receipt is not in your family folder.', 400);
	}

	const { data, error } = await sb
		.from('expenses')
		.insert({
			family_id: member.family_id,
			child_id: v.childId,
			paid_by: member.member_id,
			amount_cents: amountCents,
			category: v.category,
			title: v.title,
			note: v.note,
			spent_on: v.spentOn,
			receipt_path: v.receiptPath,
			split: { ...split },
			status: split.other_share_pct === 0 ? 'approved' : 'pending',
			resubmit_of: resubmitOf
		})
		.select('id')
		.single();
	if (error || !data)
		return formFailure(form, 'Could not save the expense. Please try again.', 500);
	await logAudit({
		familyId: member.family_id,
		actorMemberId: member.member_id,
		action: 'expense.created',
		entity: 'expenses',
		entityId: data.id,
		meta: resubmitOf ? { resubmit_of: resubmitOf } : {}
	});
	return { form, ok: true, id: data.id };
}

export const actions: Actions = {
	create: async (event) => {
		const parsed = await parseForm(event.request, ExpenseFields, 'expense');
		if (!parsed.ok) return parsed.failure;
		return insertExpense(event, 'expense', parsed.data, null);
	},

	resubmit: async (event) => {
		const parsed = await parseForm(event.request, Resubmit, 'expense');
		if (!parsed.ok) return parsed.failure;
		const result = await insertExpense(event, 'expense', parsed.data, parsed.data.resubmitOf);
		if (!('ok' in result)) return result;
		// Close the disputed one (only the payer can; respond_to_expense checks that).
		const { error } = await event.locals.supabase.rpc('respond_to_expense', {
			p_expense_id: parsed.data.resubmitOf,
			p_action: 'cancel'
		});
		if (error)
			return formFailure(
				'expense',
				'Re-submitted, but the old expense could not be cancelled: ' + error.message,
				409
			);
		return result;
	},

	respond: async (event) => {
		await requireParent(event);
		const parsed = await parseForm(event.request, Respond, 'respond');
		if (!parsed.ok) return parsed.failure;
		const { data, error } = await event.locals.supabase.rpc('respond_to_expense', {
			p_expense_id: parsed.data.expenseId,
			p_action: parsed.data.action,
			p_note: parsed.data.note
		});
		if (error || !data)
			return formFailure('respond', error?.message ?? 'Could not update the expense.', 409);
		// respond_to_expense writes the audit log row itself.
		const messages = {
			approved: 'Approved. The balance is updated.',
			disputed: 'Dispute sent.',
			cancelled: 'Expense cancelled.',
			reimbursed: 'Marked as reimbursed.'
		} as Record<string, string>;
		return { form: 'respond', ok: true, message: messages[data.status] ?? 'Done' };
	}
};

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
import { makeSplit, parseSplit, SPLIT_PRESETS, type SplitPreset } from '#lib/expenses/split.js';
import type { MonthOption } from '#lib/components/expenses/types.js';
import { INCOME_BAND_VALUES } from '#lib/expenses/income.js';
import {
	EXPENSE_COLUMNS,
	generateRecurring,
	loadBalanceRows,
	loadCredits,
	loadSpendingRows,
	myDefaultPct,
	shiftMonth,
	toView
} from './expenses.server.js';
import {
	loadFamilySplit,
	loadMyMoney,
	loadRecurring,
	loadRequests,
	loadSettlements,
	SETTLE_METHODS
} from './money.server.js';
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
	// Monthly costs both parents agreed to are logged before anything is read.
	await generateRecurring(sb, familyId);
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

	const [rows, parents, children, balanceRows, credits, spendingRows] = await Promise.all([
		query,
		sb
			.from('members')
			.select('id, display_name, home')
			.eq('family_id', familyId)
			.eq('role', 'parent'),
		sb.from('children').select('id, first_name').eq('family_id', familyId).order('created_at'),
		loadBalanceRows(sb, familyId),
		loadCredits(sb, familyId),
		loadSpendingRows(sb, familyId, shiftMonth(currentMonth, -2))
	]);
	const people = peopleFor(parents.data ?? [], member);
	const otherName = people.otherName ?? 'your co-parent';
	const balance = computeBalance(balanceRows, member.member_id, credits);
	const kids = children.data ?? [];

	const monthLabelOf = (value: string) =>
		new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
			new Date(`${value}-01T12:00:00Z`)
		);
	const [requests, recurring, settlements, familySplit, myMoney] = await Promise.all([
		loadRequests(sb, member, people.nameById, kids),
		loadRecurring(sb, member, people.nameById, today),
		loadSettlements(sb, member, people.nameById),
		loadFamilySplit(sb, member, people.nameById),
		loadMyMoney(sb, member, people.other?.id ?? null, currentMonth, monthLabelOf(currentMonth))
	]);

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
		balance: {
			text: balanceText(balance, otherName),
			items: balance.items,
			// Only the parent who owes can record a payment (settle_up checks it too).
			iOweCents: balance.direction === 'i_owe_them' ? -balance.netCents : 0
		},
		chart: buildChartMonths(spendingRows, currentMonth),
		requests,
		recurring,
		settlements,
		familySplit,
		myMoney,
		settleMethods: SETTLE_METHODS
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
		.transform((v) => (v ? v : null)),
	/** Logging the real cost of an approved "ask before spending" request. */
	requestId: z
		.string()
		.optional()
		.transform((v) => (v ? v : null))
		.pipe(z.uuid().nullable())
});
const Resubmit = z.intersection(ExpenseFields, z.object({ resubmitOf: z.uuid() }));
const Respond = z.object({
	expenseId: z.uuid(),
	action: z.enum(['approve', 'dispute', 'cancel', 'reimburse']),
	note: z.string().trim().max(280).optional()
});

/** A preset (or the family's agreed split) → the stored payer-relative split. */
async function resolveSplit(
	event: RequestEvent,
	member: { member_id: string; family_id: string },
	preset: SplitPreset,
	customPayerPct: string | undefined
) {
	if (preset === 'family') {
		const { data } = await event.locals.supabase
			.from('family_finance')
			.select('default_shares')
			.eq('family_id', member.family_id)
			.maybeSingle();
		const pct = myDefaultPct(data?.default_shares, member.member_id);
		return pct === null ? null : makeSplit('family', pct);
	}
	return makeSplit(preset, customPayerPct ? Number(customPayerPct) : undefined);
}

const Money = z.string().trim().min(1, 'Enter an amount');
const RequestCreate = z.object({
	title: z.string().trim().min(1, 'Give it a short title').max(80),
	estimate: Money,
	category: z.enum(CATEGORY_VALUES),
	childId: z
		.string()
		.optional()
		.transform((v) => (v ? v : null))
		.pipe(z.uuid().nullable()),
	note: z
		.string()
		.trim()
		.max(280)
		.optional()
		.transform((v) => (v ? v : null)),
	split: z.enum(presetValues),
	customPayerPct: z.string().optional()
});
const RecurringCreate = RequestCreate.omit({ estimate: true }).extend({
	amount: Money,
	dayOfMonth: z.coerce
		.number()
		.int()
		.min(1, 'Pick a day from 1 to 28')
		.max(28, 'Pick a day from 1 to 28')
});
const RespondTo = (actions: [string, ...string[]]) =>
	z.object({ id: z.uuid(), action: z.enum(actions), note: z.string().trim().max(280).optional() });

async function needsCoParent(event: RequestEvent, familyId: string) {
	const { count } = await event.locals.supabase
		.from('members')
		.select('id', { count: 'exact', head: true })
		.eq('family_id', familyId)
		.eq('role', 'parent');
	return (count ?? 0) < 2;
}

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
	let split = await resolveSplit(event, member, v.split, v.customPayerPct);
	if (!split)
		return formFailure(form, 'Check the split', 400, { split: 'Enter a percentage from 0 to 100' });

	// From an approved request: keep the agreed split; approved if within 10% of the estimate.
	let preApproved = false;
	if (v.requestId) {
		const { data: req } = await sb
			.from('expense_requests')
			.select('id, status, requested_by, estimate_cents, split')
			.eq('id', v.requestId)
			.maybeSingle();
		if (!req || req.status !== 'approved' || req.requested_by !== member.member_id) {
			return formFailure(form, 'That request is no longer open. Log it as a normal expense.', 409);
		}
		split = parseSplit(req.split);
		preApproved = amountCents <= Math.ceil(req.estimate_cents * 1.1);
	}
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
			status: split.other_share_pct === 0 || preApproved ? 'approved' : 'pending',
			resubmit_of: resubmitOf,
			request_id: v.requestId
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
	},

	// ---- ask before spending ----------------------------------------------------------
	requestCreate: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, RequestCreate, 'request');
		if (!parsed.ok) return parsed.failure;
		const v = parsed.data;
		const estimateCents = parseDollars(v.estimate);
		if (!estimateCents)
			return formFailure('request', 'Check the amount', 400, {
				estimate: 'Enter an amount between $0.01 and $10,000'
			});
		const split = await resolveSplit(event, member, v.split, v.customPayerPct);
		if (!split)
			return formFailure('request', 'Check the split', 400, {
				split: 'Enter a percentage from 0 to 100'
			});
		if (split.other_share_pct === 0)
			return formFailure(
				'request',
				'You pay all of it, so there’s nothing to ask. Just log it.',
				400
			);
		if (await needsCoParent(event, member.family_id))
			return formFailure('request', 'Invite your co-parent first.', 400);

		const { data, error } = await event.locals.supabase
			.from('expense_requests')
			.insert({
				family_id: member.family_id,
				requested_by: member.member_id,
				child_id: v.childId,
				title: v.title,
				category: v.category,
				estimate_cents: estimateCents,
				split: { ...split },
				note: v.note
			})
			.select('id')
			.single();
		if (error || !data)
			return formFailure('request', 'Could not send the request. Try again.', 500);
		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'expense_request.created',
			entity: 'expense_requests',
			entityId: data.id
		});
		return { form: 'request', ok: true };
	},

	requestRespond: async (event) => {
		await requireParent(event);
		const parsed = await parseForm(
			event.request,
			RespondTo(['approve', 'decline', 'cancel']),
			'requestRespond'
		);
		if (!parsed.ok) return parsed.failure;
		const { data, error } = await event.locals.supabase.rpc('respond_to_expense_request', {
			p_request_id: parsed.data.id,
			p_action: parsed.data.action,
			p_note: parsed.data.note
		});
		if (error || !data)
			return formFailure('requestRespond', error?.message ?? 'Could not update.', 409);
		return { form: 'requestRespond', ok: true, status: data.status };
	},

	// ---- monthly costs --------------------------------------------------------------------
	recurringCreate: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(event.request, RecurringCreate, 'recurring');
		if (!parsed.ok) return parsed.failure;
		const v = parsed.data;
		const amountCents = parseDollars(v.amount);
		if (!amountCents)
			return formFailure('recurring', 'Check the amount', 400, {
				amount: 'Enter an amount between $0.01 and $10,000'
			});
		const split = await resolveSplit(event, member, v.split, v.customPayerPct);
		if (!split)
			return formFailure('recurring', 'Check the split', 400, {
				split: 'Enter a percentage from 0 to 100'
			});
		if (split.other_share_pct > 0 && (await needsCoParent(event, member.family_id)))
			return formFailure('recurring', 'Invite your co-parent before sharing a cost.', 400);

		const today = localDate(new Date(), safeTimeZone(event.cookies.get('tz')));
		const { data, error } = await event.locals.supabase
			.from('recurring_expenses')
			.insert({
				family_id: member.family_id,
				created_by: member.member_id,
				child_id: v.childId,
				title: v.title,
				category: v.category,
				amount_cents: amountCents,
				split: { ...split },
				day_of_month: v.dayOfMonth,
				start_month: `${today.slice(0, 7)}-01`,
				status: split.other_share_pct === 0 ? 'active' : 'pending'
			})
			.select('id')
			.single();
		if (error || !data) return formFailure('recurring', 'Could not save. Try again.', 500);
		await logAudit({
			familyId: member.family_id,
			actorMemberId: member.member_id,
			action: 'recurring.created',
			entity: 'recurring_expenses',
			entityId: data.id
		});
		return { form: 'recurring', ok: true };
	},

	recurringRespond: async (event) => {
		await requireParent(event);
		const parsed = await parseForm(
			event.request,
			RespondTo(['approve', 'decline', 'stop']),
			'recurringRespond'
		);
		if (!parsed.ok) return parsed.failure;
		const { data, error } = await event.locals.supabase.rpc('respond_to_recurring', {
			p_recurring_id: parsed.data.id,
			p_action: parsed.data.action
		});
		if (error || !data)
			return formFailure('recurringRespond', error?.message ?? 'Could not update.', 409);
		return { form: 'recurringRespond', ok: true, status: data.status };
	},

	// ---- settle up --------------------------------------------------------------------------
	settle: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(
			event.request,
			z.object({
				amount: Money,
				method: z.enum(SETTLE_METHODS),
				note: z
					.string()
					.trim()
					.max(140)
					.optional()
					.transform((v) => (v ? v : undefined))
			}),
			'settle'
		);
		if (!parsed.ok) return parsed.failure;
		const amountCents = parseDollars(parsed.data.amount);
		if (!amountCents)
			return formFailure('settle', 'Check the amount', 400, { amount: 'Enter an amount' });
		const { data, error } = await event.locals.supabase.rpc('settle_up', {
			p_family_id: member.family_id,
			p_amount_cents: amountCents,
			p_method: parsed.data.method,
			p_note: parsed.data.note
		});
		if (error || !data) return formFailure('settle', error?.message ?? 'Could not record it.', 409);
		return { form: 'settle', ok: true, kind: data.kind };
	},

	confirmSettlement: async (event) => {
		await requireParent(event);
		const parsed = await parseForm(event.request, z.object({ id: z.uuid() }), 'confirm');
		if (!parsed.ok) return parsed.failure;
		const { error } = await event.locals.supabase.rpc('confirm_settlement', {
			p_settlement_id: parsed.data.id
		});
		if (error) return formFailure('confirm', error.message, 409);
		return { form: 'confirm', ok: true };
	},

	// ---- family split -----------------------------------------------------------------------
	splitPropose: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(
			event.request,
			z.object({
				myPct: z.coerce.number().int().min(0).max(100),
				basis: z.enum(['custom', 'income'])
			}),
			'split'
		);
		if (!parsed.ok) return parsed.failure;
		const { error } = await event.locals.supabase.rpc('propose_family_split', {
			p_family_id: member.family_id,
			p_my_pct: parsed.data.myPct,
			p_basis: parsed.data.basis
		});
		if (error) return formFailure('split', error.message, 409);
		return { form: 'split', ok: true };
	},

	splitRespond: async (event) => {
		await requireParent(event);
		const parsed = await parseForm(
			event.request,
			RespondTo(['accept', 'decline', 'cancel']),
			'splitRespond'
		);
		if (!parsed.ok) return parsed.failure;
		const { data, error } = await event.locals.supabase.rpc('respond_to_split_proposal', {
			p_proposal_id: parsed.data.id,
			p_action: parsed.data.action
		});
		if (error || !data)
			return formFailure('splitRespond', error?.message ?? 'Could not update.', 409);
		return { form: 'splitRespond', ok: true, status: data.status };
	},

	// ---- PRIVATE income range (own row only; never audited with the value) ---------------------
	incomeSave: async (event) => {
		const { member } = await requireParent(event);
		const parsed = await parseForm(
			event.request,
			z.object({
				band: z.enum(INCOME_BAND_VALUES),
				shareForSplit: z
					.string()
					.optional()
					.transform((v) => v === 'on' || v === 'true')
			}),
			'income'
		);
		if (!parsed.ok) return parsed.failure;
		const { error } = await event.locals.supabase.from('parent_income').upsert(
			{
				member_id: member.member_id,
				family_id: member.family_id,
				band: parsed.data.band,
				share_for_split: parsed.data.shareForSplit,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'member_id' }
		);
		if (error) return formFailure('income', 'Could not save. Try again.', 500);
		return { form: 'income', ok: true };
	},

	incomeDelete: async (event) => {
		const { member } = await requireParent(event);
		const { error } = await event.locals.supabase
			.from('parent_income')
			.delete()
			.eq('member_id', member.member_id);
		if (error) return formFailure('income', 'Could not remove it. Try again.', 500);
		return { form: 'income', ok: true, removed: true };
	}
};

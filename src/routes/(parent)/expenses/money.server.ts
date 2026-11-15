/**
 * Expenses v2 loaders + view models: requests, monthly costs, settlements,
 * family split and the PRIVATE "My money" card.
 *
 * Privacy: parent_income is read with the parent's own session (RLS: own row
 * only). The single exception is incomeSuggestion(), which uses the service
 * role to read BOTH rows, and only returns a percentage when both parents
 * turned share_for_split on. The co-parent's range never leaves this file.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '#lib/server/supabaseAdmin.js';
import { shortDate } from '#lib/custody/today.js';
import { categoryInfo } from '#lib/expenses/categories.js';
import {
	affordability,
	bandInfo,
	myShareCents,
	suggestSplitPct,
	type IncomeBand
} from '#lib/expenses/income.js';
import { formatCents } from '#lib/expenses/money.js';
import { otherShareCents, parseSplit, splitLabel } from '#lib/expenses/split.js';
import type {
	FamilySplitView,
	MyMoneyView,
	RecurringView,
	RequestView,
	SettlementView
} from '#lib/components/expenses/types.js';
import type { Database } from '#lib/types/database.js';
import { myDefaultPct, shiftMonth } from './expenses.server.js';

type Sb = SupabaseClient<Database>;
type Me = { member_id: string; family_id: string };
type NameOf = (memberId: string) => string;
type Child = { id: string; first_name: string };

const REQUEST_LABEL: Record<RequestView['status'], string> = {
	pending: 'Waiting for an answer',
	approved: 'Approved, log it when you’ve paid',
	declined: 'Declined',
	cancelled: 'Cancelled',
	used: 'Logged as an expense'
};

const METHOD_LABEL: Record<string, string> = {
	zelle: 'Zelle',
	venmo: 'Venmo',
	paypal: 'PayPal',
	cash: 'Cash',
	check: 'Check',
	bank: 'Bank transfer',
	other: 'Other'
};
export const SETTLE_METHODS = Object.keys(METHOD_LABEL) as [string, ...string[]];

const isoDay = (ts: string) => ts.slice(0, 10);

/** My part of an amount under a payer-relative split. */
function myPartCents(amount: number, split: unknown, iAmPayer: boolean): number {
	const other = otherShareCents(amount, parseSplit(split));
	return iAmPayer ? amount - other : other;
}

// ---- requests ---------------------------------------------------------------------------

export async function loadRequests(
	sb: Sb,
	me: Me,
	nameOf: NameOf,
	children: Child[]
): Promise<RequestView[]> {
	const since = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
	const { data } = await sb
		.from('expense_requests')
		.select(
			'id, title, category, estimate_cents, split, note, status, response_note, requested_by, child_id, created_at'
		)
		.eq('family_id', me.family_id)
		.or(`status.in.(pending,approved),created_at.gte.${since}`)
		.order('created_at', { ascending: false })
		.limit(30);
	return (data ?? []).map((r) => {
		const mine = r.requested_by === me.member_id;
		const status = r.status as RequestView['status'];
		const split = parseSplit(r.split);
		const cat = categoryInfo(r.category);
		const part = myPartCents(r.estimate_cents, r.split, mine);
		return {
			id: r.id,
			title: r.title,
			category: r.category,
			categoryLabel: cat.label,
			categoryIcon: cat.icon,
			estimateCents: r.estimate_cents,
			estimate: formatCents(r.estimate_cents),
			payerPct: split.payer_share_pct,
			splitLabel: splitLabel(split),
			myPart: formatCents(part),
			myPartCents: part,
			childId: r.child_id,
			childName: children.find((c) => c.id === r.child_id)?.first_name ?? null,
			requestedBy: nameOf(r.requested_by),
			mine,
			status,
			statusLabel: REQUEST_LABEL[status] ?? status,
			note: r.note,
			responseNote: r.response_note,
			whenLabel: shortDate(isoDay(r.created_at)),
			can: {
				approve: !mine && status === 'pending',
				decline: !mine && status === 'pending',
				cancel: mine && (status === 'pending' || status === 'approved'),
				log: mine && status === 'approved'
			}
		};
	});
}

// ---- monthly costs ------------------------------------------------------------------------

function nextDue(day: number, startMonth: string, today: string): string {
	let month = today.slice(0, 7);
	if (`${month}-01` < startMonth) month = startMonth.slice(0, 7);
	let date = `${month}-${String(day).padStart(2, '0')}`;
	if (date <= today) date = `${shiftMonth(month, 1)}-${String(day).padStart(2, '0')}`;
	return date;
}

export async function loadRecurring(
	sb: Sb,
	me: Me,
	nameOf: NameOf,
	today: string
): Promise<RecurringView[]> {
	const { data } = await sb
		.from('recurring_expenses')
		.select(
			'id, title, category, amount_cents, split, day_of_month, start_month, status, created_by'
		)
		.eq('family_id', me.family_id)
		.in('status', ['pending', 'active'])
		.order('created_at');
	return (data ?? []).map((r) => {
		const mine = r.created_by === me.member_id;
		const status = r.status as RecurringView['status'];
		return {
			id: r.id,
			title: r.title,
			categoryIcon: categoryInfo(r.category).icon,
			amount: formatCents(r.amount_cents),
			splitLabel: splitLabel(parseSplit(r.split)),
			myPart: formatCents(myPartCents(r.amount_cents, r.split, mine)),
			dayOfMonth: r.day_of_month,
			nextLabel:
				status === 'active' ? shortDate(nextDue(r.day_of_month, r.start_month, today)) : null,
			createdBy: nameOf(r.created_by),
			mine,
			status,
			can: {
				approve: !mine && status === 'pending',
				decline: !mine && status === 'pending',
				stop: status === 'active' || (status === 'pending' && mine)
			}
		};
	});
}

// ---- settlements -------------------------------------------------------------------------

export async function loadSettlements(sb: Sb, me: Me, nameOf: NameOf): Promise<SettlementView[]> {
	const { data } = await sb
		.from('settlements')
		.select('id, paid_by, paid_to, amount_cents, kind, method, note, confirmed_at, created_at')
		.eq('family_id', me.family_id)
		.order('created_at', { ascending: false })
		.limit(6);
	return (data ?? []).map((s) => ({
		id: s.id,
		amount: formatCents(s.amount_cents),
		from: nameOf(s.paid_by),
		to: nameOf(s.paid_to),
		paidByMe: s.paid_by === me.member_id,
		method: METHOD_LABEL[s.method] ?? s.method,
		note: s.note,
		kind: s.kind as SettlementView['kind'],
		whenLabel: shortDate(isoDay(s.created_at)),
		confirmed: !!s.confirmed_at,
		canConfirm: s.paid_to === me.member_id && !s.confirmed_at
	}));
}

// ---- family split ------------------------------------------------------------------------

export async function loadFamilySplit(sb: Sb, me: Me, nameOf: NameOf): Promise<FamilySplitView> {
	const [finance, proposal] = await Promise.all([
		sb
			.from('family_finance')
			.select('default_shares, basis, agreed_at')
			.eq('family_id', me.family_id)
			.maybeSingle(),
		sb
			.from('split_proposals')
			.select('id, proposed_by, shares, basis')
			.eq('family_id', me.family_id)
			.eq('status', 'pending')
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle()
	]);
	const agreedPct = myDefaultPct(finance.data?.default_shares, me.member_id);
	const proposedPct = myDefaultPct(proposal.data?.shares, me.member_id);
	return {
		agreed:
			finance.data && agreedPct !== null
				? {
						myPct: agreedPct,
						otherPct: 100 - agreedPct,
						basis: finance.data.basis as 'custom' | 'income',
						whenLabel: shortDate(isoDay(finance.data.agreed_at))
					}
				: null,
		proposal:
			proposal.data && proposedPct !== null
				? {
						id: proposal.data.id,
						mine: proposal.data.proposed_by === me.member_id,
						myPct: proposedPct,
						otherPct: 100 - proposedPct,
						basis: proposal.data.basis as 'custom' | 'income',
						by: nameOf(proposal.data.proposed_by)
					}
				: null
	};
}

// ---- private: my money --------------------------------------------------------------------

/**
 * Income-based suggestion (service role). Returns ONLY my percentage, and only
 * when both parents opted in. `otherOptedIn` reveals the opt-in, not the range.
 */
export async function incomeSuggestion(
	me: Me,
	otherMemberId: string | null
): Promise<{ myPct: number | null; otherOptedIn: boolean }> {
	if (!otherMemberId) return { myPct: null, otherOptedIn: false };
	const { data } = await supabaseAdmin()
		.from('parent_income')
		.select('member_id, band, share_for_split')
		.eq('family_id', me.family_id)
		.in('member_id', [me.member_id, otherMemberId]);
	const mine = data?.find((r) => r.member_id === me.member_id);
	const theirs = data?.find((r) => r.member_id === otherMemberId);
	// The co-parent's opt-in is only revealed to a parent who opted in too.
	if (!mine?.share_for_split) return { myPct: null, otherOptedIn: false };
	const otherOptedIn = !!theirs?.share_for_split;
	if (!otherOptedIn || !theirs) return { myPct: null, otherOptedIn };
	return {
		myPct: suggestSplitPct(mine.band as IncomeBand, theirs.band as IncomeBand),
		otherOptedIn
	};
}

export async function loadMyMoney(
	sb: Sb,
	me: Me,
	otherMemberId: string | null,
	currentMonth: string,
	monthLabel: string
): Promise<MyMoneyView> {
	const [own, monthRows, suggestion] = await Promise.all([
		sb
			.from('parent_income')
			.select('band, share_for_split')
			.eq('member_id', me.member_id)
			.maybeSingle(),
		sb
			.from('expenses')
			.select('paid_by, amount_cents, split, status')
			.eq('family_id', me.family_id)
			.gte('spent_on', `${currentMonth}-01`)
			.lt('spent_on', `${shiftMonth(currentMonth, 1)}-01`),
		incomeSuggestion(me, otherMemberId)
	]);
	const band = own.data?.band ?? null;
	const a = affordability(myShareCents(monthRows.data ?? [], me.member_id), band);
	return {
		band,
		bandLabel: bandInfo(band)?.label ?? null,
		shareForSplit: !!own.data?.share_for_split,
		monthLabel,
		share: a.share,
		pctOfIncome: a.pctOfIncome,
		level: a.level,
		suggestion: suggestion.myPct !== null ? { myPct: suggestion.myPct } : null,
		otherOptedIn: suggestion.otherOptedIn
	};
}

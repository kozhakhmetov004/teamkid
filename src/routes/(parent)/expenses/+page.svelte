<script lang="ts">
	import Notice from '#lib/components/layout/Notice.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import { invalidate } from '$app/navigation';
	import SpendingChart from '#lib/components/analytics/SpendingChart.svelte';
	import ExpenseForm from '#lib/components/expenses/ExpenseForm.svelte';
	import ExpenseList from '#lib/components/expenses/ExpenseList.svelte';
	import FamilySplitCard from '#lib/components/expenses/FamilySplitCard.svelte';
	import MyMoneyCard from '#lib/components/expenses/MyMoneyCard.svelte';
	import RecurringCard from '#lib/components/expenses/RecurringCard.svelte';
	import RequestsCard from '#lib/components/expenses/RequestsCard.svelte';
	import SettleCard from '#lib/components/expenses/SettleCard.svelte';
	import { subscribeToExpenses } from '#lib/components/expenses/subscribeToExpenses.js';
	import type { ExpenseView, RequestView } from '#lib/components/expenses/types.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let formOpen = $state(false);
	let resubmitOf = $state<ExpenseView | null>(null);
	let fromRequest = $state<RequestView | null>(null);

	const familyPct = $derived(data.familySplit.agreed?.myPct ?? null);

	function log() {
		resubmitOf = null;
		fromRequest = null;
		formOpen = true;
	}
	function resubmit(e: ExpenseView) {
		resubmitOf = e;
		fromRequest = null;
		formOpen = true;
	}
	function logRequest(r: RequestView) {
		resubmitOf = null;
		fromRequest = r;
		formOpen = true;
	}

	// "Needs your answer": everything waiting on ME, with a link to where to answer.
	const todo = $derived(
		[
			{
				n: data.requests.filter((r) => r.can.approve).length,
				label: 'purchase request',
				href: '#requests'
			},
			{
				n: data.recurring.filter((r) => r.can.approve).length,
				label: 'monthly cost',
				href: '#monthly'
			},
			{
				n: data.familySplit.proposal && !data.familySplit.proposal.mine ? 1 : 0,
				label: 'split proposal',
				href: '#family-split'
			},
			{
				n: data.settlements.filter((s) => s.canConfirm).length,
				label: 'payment to confirm',
				href: '#balance'
			},
			{
				n: data.expenses.filter((e) => e.can.approve).length,
				label: 'expense to approve',
				href: '#all-expenses'
			}
		].filter((t) => t.n > 0)
	);

	$effect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const off = subscribeToExpenses(data.familyId, () => {
			clearTimeout(timer);
			timer = setTimeout(() => void invalidate('app:expenses'), 300);
		});
		return () => {
			clearTimeout(timer);
			off();
		};
	});
</script>

<svelte:head><title>Expenses · TeamKid</title></svelte:head>

<div class="space-y-6">
	<PageHeader
		title="Expenses"
		icon="💳"
		description="Shared costs for your child. Nothing is edited or deleted; every change is recorded."
	>
		{#snippet actions()}
			<Button size="lg" class="h-11 px-5 text-base" onclick={log}>+ Log an expense</Button>
		{/snippet}
	</PageHeader>

	{#if !data.hasCoParent}
		<Notice
			icon="🤝"
			title="Invite your co-parent to share expenses"
			text="You can log costs for your own record now; sharing and approval need both parents."
			href="/family"
			label="Invite"
		/>
	{/if}

	{#if todo.length}
		<nav
			aria-label="Needs your answer"
			class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm dark:bg-amber-950/50 dark:text-amber-100"
		>
			<span class="flex items-center gap-2 font-semibold">
				<span aria-hidden="true" class="text-lg">⚠️</span> Needs your answer
			</span>
			{#each todo as t (t.label)}
				<a
					href={t.href}
					class="rounded-full bg-amber-200/80 px-3 py-1 font-medium text-amber-950 hover:bg-amber-300 focus-visible:ring-3 focus-visible:ring-amber-500/50 focus-visible:outline-none dark:bg-amber-800 dark:text-amber-50"
				>
					{t.n}
					{t.label}{t.n === 1 ? '' : 's'} →
				</a>
			{/each}
		</nav>
	{/if}

	<div class="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
		<SpendingChart months={data.chart} compact />
		<SettleCard
			text={data.balance.text}
			items={data.balance.items}
			iOweCents={data.balance.iOweCents}
			otherName={data.otherName}
			settlements={data.settlements}
			methods={data.settleMethods}
		/>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<RequestsCard
			requests={data.requests}
			otherName={data.otherName}
			children={data.children}
			{familyPct}
			band={data.myMoney.band}
			canShare={data.hasCoParent}
			onLog={logRequest}
		/>
		<RecurringCard
			rules={data.recurring}
			otherName={data.otherName}
			children={data.children}
			{familyPct}
		/>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<FamilySplitCard
			split={data.familySplit}
			otherName={data.otherName}
			suggestion={data.myMoney.suggestion?.myPct ?? null}
			canShare={data.hasCoParent}
		/>
		<MyMoneyCard money={data.myMoney} otherName={data.otherName} />
	</div>

	<Card.Root id="all-expenses">
		<Card.Header><Card.Title>All expenses</Card.Title></Card.Header>
		<Card.Content class="space-y-4">
			<ExpenseList
				expenses={data.expenses}
				months={data.months}
				filters={data.filters}
				onResubmit={resubmit}
			/>
		</Card.Content>
	</Card.Root>
</div>

<ExpenseForm
	bind:open={formOpen}
	familyId={data.familyId}
	otherName={data.otherName}
	today={data.today}
	children={data.children}
	{resubmitOf}
	{fromRequest}
	{familyPct}
/>

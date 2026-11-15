<script lang="ts">
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
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold">Expenses</h1>
			<p class="text-muted-foreground">
				Shared costs for your child. Nothing is edited or deleted; every change is recorded.
			</p>
		</div>
		<Button onclick={log}>Log an expense</Button>
	</div>

	{#if !data.hasCoParent}
		<Card.Root>
			<Card.Header>
				<Card.Title>Invite your co-parent to share expenses</Card.Title>
				<Card.Description
					>You can log costs for your own record now; sharing and approval need both parents.</Card.Description
				>
			</Card.Header>
			<Card.Footer><Button href="/family" variant="outline">Invite on Family</Button></Card.Footer>
		</Card.Root>
	{/if}

	{#if todo.length}
		<nav
			aria-label="Needs your answer"
			class="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-3 text-sm"
		>
			<span class="font-semibold">Needs your answer:</span>
			{#each todo as t (t.label)}
				<a href={t.href} class="rounded-full border bg-background px-3 py-1 hover:bg-accent">
					{t.n}
					{t.label}{t.n === 1 ? '' : 's'}
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

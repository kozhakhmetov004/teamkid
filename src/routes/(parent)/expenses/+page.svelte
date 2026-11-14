<script lang="ts">
	import { invalidate } from '$app/navigation';
	import SpendingChart from '#lib/components/analytics/SpendingChart.svelte';
	import BalanceCard from '#lib/components/expenses/BalanceCard.svelte';
	import ExpenseForm from '#lib/components/expenses/ExpenseForm.svelte';
	import ExpenseList from '#lib/components/expenses/ExpenseList.svelte';
	import { subscribeToExpenses } from '#lib/components/expenses/subscribeToExpenses.js';
	import type { ExpenseView } from '#lib/components/expenses/types.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let formOpen = $state(false);
	let resubmitOf = $state<ExpenseView | null>(null);

	function log() {
		resubmitOf = null;
		formOpen = true;
	}
	function resubmit(e: ExpenseView) {
		resubmitOf = e;
		formOpen = true;
	}

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

	<div class="grid gap-4 md:grid-cols-[1.4fr_1fr]">
		<SpendingChart months={data.chart} compact />
		<BalanceCard text={data.balance.text} items={data.balance.items} compact />
	</div>

	<Card.Root>
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
/>

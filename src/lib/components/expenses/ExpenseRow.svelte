<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import ExpenseActions from './ExpenseActions.svelte';
	import ReceiptViewer from './ReceiptViewer.svelte';
	import type { ExpenseView } from './types.js';

	let { expense, onResubmit }: { expense: ExpenseView; onResubmit: (e: ExpenseView) => void } =
		$props();
	const statusVariant = $derived(
		expense.status === 'approved' || expense.status === 'reimbursed'
			? 'default'
			: expense.status === 'disputed'
				? 'destructive'
				: 'outline'
	);
</script>

<li class="flex flex-col gap-3 py-4 md:flex-row md:items-start md:justify-between">
	<div class="min-w-0 space-y-1">
		<div class="flex flex-wrap items-center gap-2">
			<span class="font-medium">{expense.title}</span>
			<Badge variant="secondary"
				><span aria-hidden="true">{expense.categoryIcon}</span> {expense.categoryLabel}</Badge
			>
			<Badge variant={statusVariant}
				><span aria-hidden="true">{expense.statusIcon}</span> {expense.statusLabel}</Badge
			>
			{#if expense.receiptPath}<ReceiptViewer
					path={expense.receiptPath}
					label="🧾 Receipt"
					variant="ghost"
				/>{/if}
		</div>
		<p class="text-sm text-muted-foreground">
			{expense.spentOnLabel} · paid by {expense.paidBy} · split {expense.splitLabel}
			{#if expense.childName}· for {expense.childName}{/if}
		</p>
		<p class="text-sm">
			{#if expense.paidByMe}
				{expense.otherShare === '$0.00'
					? 'Nothing owed to you'
					: `Owed to you: ${expense.otherShare}`}
			{:else}
				{expense.otherShare === '$0.00'
					? 'Nothing owed by you'
					: `Your share: ${expense.otherShare}`}
			{/if}
		</p>
		{#if expense.note}<p class="text-sm text-muted-foreground">“{expense.note}”</p>{/if}
		{#if expense.statusNote}<p class="text-sm text-destructive">
				Dispute: “{expense.statusNote}”
			</p>{/if}
	</div>
	<div class="flex shrink-0 flex-col items-start gap-2 md:items-end">
		<span class="text-lg font-semibold tabular-nums">{expense.amount}</span>
		<ExpenseActions {expense} {onResubmit} />
	</div>
</li>

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
			<Badge
				variant={statusVariant}
				class={expense.status === 'pending'
					? 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100'
					: ''}><span aria-hidden="true">{expense.statusIcon}</span> {expense.statusLabel}</Badge
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
		{#if expense.note}<p class="text-sm text-muted-foreground">“{expense.note}”</p>{/if}
		{#if expense.statusNote}<p class="text-sm text-destructive">
				Dispute: “{expense.statusNote}”
			</p>{/if}
	</div>
	<div class="flex shrink-0 flex-col items-start gap-2 md:items-end">
		<!-- Total first, then what is owed (same size, side by side). -->
		<p class="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-lg tabular-nums">
			<span
				><span class="sr-only">Total </span><span class="font-semibold">{expense.amount}</span
				></span
			>
			<span class="text-muted-foreground">
				{#if expense.otherShare === '$0.00'}
					{expense.paidByMe ? 'Nothing owed to you' : 'Nothing owed by you'}
				{:else}
					{expense.paidByMe ? 'Owed to you' : 'Your share'}
					<span class="font-semibold text-foreground">{expense.otherShare}</span>
				{/if}
			</span>
		</p>
		<ExpenseActions {expense} {onResubmit} />
	</div>
</li>

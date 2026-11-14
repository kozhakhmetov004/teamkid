<script lang="ts">
	import { goto } from '$app/navigation';
	import { CATEGORIES } from '#lib/expenses/categories.js';
	import ExpenseRow from './ExpenseRow.svelte';
	import type { ExpenseView, MonthOption } from './types.js';

	let {
		expenses,
		months,
		filters,
		onResubmit
	}: {
		expenses: ExpenseView[];
		months: MonthOption[];
		filters: { month: string; category: string; status: string };
		onResubmit: (e: ExpenseView) => void;
	} = $props();

	const STATUS_FILTERS = [
		['all', 'All'],
		['needs_ok', 'Needs your OK'],
		['pending', 'Pending'],
		['approved', 'Approved'],
		['reimbursed', 'Reimbursed'],
		['disputed', 'Disputed'],
		['cancelled', 'Cancelled']
	] as const;

	function apply(form: HTMLFormElement) {
		const params = new URLSearchParams(new FormData(form) as unknown as Record<string, string>);
		void goto(`/expenses?${params}`);
	}
	const selectClass =
		'h-9 rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';
</script>

<form method="GET" class="flex flex-wrap items-end gap-2" onchange={(e) => apply(e.currentTarget)}>
	<label class="text-sm">
		<span class="mb-1 block text-xs text-muted-foreground">Month</span>
		<select name="month" class={selectClass} value={filters.month}>
			{#each months as m (m.value)}<option value={m.value}>{m.label}</option>{/each}
		</select>
	</label>
	<label class="text-sm">
		<span class="mb-1 block text-xs text-muted-foreground">Category</span>
		<select name="category" class={selectClass} value={filters.category}>
			<option value="all">All</option>
			{#each CATEGORIES as c (c.value)}<option value={c.value}>{c.icon} {c.label}</option>{/each}
		</select>
	</label>
	<label class="text-sm">
		<span class="mb-1 block text-xs text-muted-foreground">Status</span>
		<select name="status" class={selectClass} value={filters.status}>
			{#each STATUS_FILTERS as [value, label] (value)}<option {value}>{label}</option>{/each}
		</select>
	</label>
	<noscript
		><button type="submit" class="h-9 rounded-lg border px-3 text-sm">Apply</button></noscript
	>
</form>

{#if expenses.length === 0}
	<p class="py-10 text-center text-sm text-muted-foreground">No expenses match these filters.</p>
{:else}
	<ul class="divide-y">
		{#each expenses as expense (expense.id)}
			<ExpenseRow {expense} {onResubmit} />
		{/each}
	</ul>
{/if}

<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { ChartMonth } from '#lib/expenses/chart.js';
	import { formatCents } from '#lib/expenses/money.js';

	/**
	 * Shared spending chart: identical for both parents, never split by who
	 * paid. Plain HTML bars; a visually hidden table carries the same numbers.
	 */
	let { months, compact = false }: { months: ChartMonth[]; compact?: boolean } = $props();

	let mode = $state<'month' | 'three'>('month');
	const current = $derived(months[0]);
	const maxCat = $derived(Math.max(1, ...(current?.rows.map((r) => r.totalCents) ?? [1])));
	const maxMonth = $derived(Math.max(1, ...months.map((m) => m.totalCents)));
</script>

<Card.Root class={compact ? 'h-full' : ''}>
	<Card.Header>
		<div class="flex flex-wrap items-start justify-between gap-2">
			<div>
				<Card.Title>Spending</Card.Title>
				<Card.Description>
					{mode === 'month' ? current?.label : 'Last 3 months'} · the same numbers for both parents
				</Card.Description>
			</div>
			<div class="flex rounded-lg border p-0.5" role="group" aria-label="Range">
				<Button
					size="sm"
					variant={mode === 'month' ? 'default' : 'ghost'}
					onclick={() => (mode = 'month')}>This month</Button
				>
				<Button
					size="sm"
					variant={mode === 'three' ? 'default' : 'ghost'}
					onclick={() => (mode = 'three')}>3 months</Button
				>
			</div>
		</div>
	</Card.Header>
	<Card.Content>
		{#if mode === 'month'}
			{#if !current || current.rows.length === 0}
				<p class="text-sm text-muted-foreground">
					No expenses logged this month. Add one on <a href="/expenses" class="underline"
						>Expenses</a
					>.
				</p>
			{:else}
				<!-- HTML bars: they fill the card's width; text stays at normal size. -->
				<ul
					class="space-y-2.5"
					role="img"
					aria-label="Spending by category in {current.label}: {current.rows
						.map((r) => `${r.label} ${formatCents(r.totalCents)}`)
						.join(', ')}. Total {formatCents(current.totalCents)}."
				>
					{#each current.rows as r (r.category)}
						<li
							class="grid grid-cols-[minmax(6rem,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm"
						>
							<span class="truncate">{r.icon} {r.label}</span>
							<span class="h-3 overflow-hidden rounded-full bg-muted">
								<span
									class="block h-full rounded-full bg-primary"
									style="width: {Math.max(3, (r.totalCents / maxCat) * 100)}%"
								></span>
							</span>
							<span class="font-semibold tabular-nums">{formatCents(r.totalCents)}</span>
						</li>
					{/each}
				</ul>
				<p class="mt-3 border-t pt-3 text-right text-sm font-semibold tabular-nums">
					Total {formatCents(current.totalCents)}
				</p>
			{/if}
		{:else}
			<div
				class="grid grid-cols-3 items-end gap-4"
				role="img"
				aria-label="Monthly totals: {months
					.map((m) => `${m.shortLabel} ${formatCents(m.totalCents)}`)
					.join(', ')}"
			>
				{#each [...months].reverse() as m (m.month)}
					<div class="flex flex-col items-center gap-1.5 text-sm">
						<span class="font-semibold tabular-nums">{formatCents(m.totalCents)}</span>
						<span class="flex h-28 w-full max-w-16 items-end">
							<span
								class="block w-full rounded-t-lg bg-primary"
								style="height: {Math.max(3, (m.totalCents / maxMonth) * 100)}%"
							></span>
						</span>
						<span class="text-muted-foreground">{m.shortLabel}</span>
					</div>
				{/each}
			</div>
		{/if}

		<table class="sr-only">
			<caption>Spending by month and category</caption>
			<thead><tr><th>Month</th><th>Category</th><th>Total</th></tr></thead>
			<tbody>
				{#each months as m (m.month)}
					{#each m.rows as r (m.month + r.category)}
						<tr><td>{m.label}</td><td>{r.label}</td><td>{formatCents(r.totalCents)}</td></tr>
					{/each}
				{/each}
			</tbody>
		</table>
	</Card.Content>
</Card.Root>

<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { ChartMonth } from '#lib/expenses/chart.js';
	import { formatCents } from '#lib/expenses/money.js';

	/**
	 * Shared spending chart: identical for both parents, never split by who
	 * paid. Plain SVG; a visually hidden table carries the same numbers.
	 */
	let { months, compact = false }: { months: ChartMonth[]; compact?: boolean } = $props();

	let mode = $state<'month' | 'three'>('month');
	const current = $derived(months[0]);
	const maxCat = $derived(Math.max(1, ...(current?.rows.map((r) => r.totalCents) ?? [1])));
	const maxMonth = $derived(Math.max(1, ...months.map((m) => m.totalCents)));
	const W = 320;
	const ROW = 30;
	/** Bars start after the category label; amounts get a fixed right column (never cut off). */
	const BAR_X = 112;
	const AMOUNT_W = 72;
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
				<svg
					viewBox="0 0 {W} {current.rows.length * ROW}"
					class="w-full"
					role="img"
					aria-label="Spending by category in {current.label}: {current.rows
						.map((r) => `${r.label} ${formatCents(r.totalCents)}`)
						.join(', ')}. Total {formatCents(current.totalCents)}."
				>
					{#each current.rows as r, i (r.category)}
						{@const w = Math.max(4, (r.totalCents / maxCat) * (W - BAR_X - AMOUNT_W - 8))}
						<text x="0" y={i * ROW + 19} class="fill-foreground text-[12px]"
							>{r.icon} {r.label}</text
						>
						<rect x={BAR_X} y={i * ROW + 6} width={w} height="18" rx="6" class="fill-primary" />
						<text
							x={W}
							y={i * ROW + 19}
							text-anchor="end"
							class="fill-foreground text-[12px] font-semibold tabular-nums"
							>{formatCents(r.totalCents)}</text
						>
					{/each}
				</svg>
				<p class="mt-2 text-right text-sm font-semibold tabular-nums">
					Total {formatCents(current.totalCents)}
				</p>
			{/if}
		{:else}
			<svg
				viewBox="0 0 {W} 124"
				class="w-full"
				role="img"
				aria-label="Monthly totals: {months
					.map((m) => `${m.shortLabel} ${formatCents(m.totalCents)}`)
					.join(', ')}"
			>
				{#each [...months].reverse() as m, i (m.month)}
					{@const h = Math.max(3, (m.totalCents / maxMonth) * 70)}
					{@const x = 30 + i * 100}
					<rect {x} y={94 - h} width="60" height={h} rx="6" class="fill-primary" />
					<text x={x + 30} y="112" text-anchor="middle" class="fill-foreground text-[12px]"
						>{m.shortLabel}</text
					>
					<text
						x={x + 30}
						y={88 - h}
						text-anchor="middle"
						class="fill-foreground text-[11px] font-semibold tabular-nums"
						>{formatCents(m.totalCents)}</text
					>
				{/each}
			</svg>
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

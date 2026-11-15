<script lang="ts">
	import SwapRequestCard from '#lib/components/calendar/SwapRequestCard.svelte';
	import type { SwapView, SwapWindow } from '#lib/components/calendar/types.js';
	import DashCard from './DashCard.svelte';

	/** Pending swaps with Accept / Decline / Counter (requests you sent show "Waiting for …"). */
	let {
		swaps,
		otherName,
		window: range
	}: { swaps: SwapView[]; otherName: string | null; window: SwapWindow } = $props();

	const SHOWN = 2;
	let all = $state(false);
	const visible = $derived(all ? swaps : swaps.slice(0, SHOWN));
	const toAnswer = $derived(swaps.filter((s) => !s.fromMe).length);
</script>

<DashCard
	title="Swap requests"
	icon="⇄"
	badge={toAnswer ? `${toAnswer} to answer` : undefined}
	empty={swaps.length === 0 ? 'Nothing waiting.' : undefined}
	action={{ href: '/calendar', label: 'Planner' }}
>
	<div class="divide-y">
		{#each visible as swap (swap.id)}
			<SwapRequestCard {swap} otherName={otherName ?? 'your co-parent'} window={range} />
		{/each}
	</div>
	{#if swaps.length > SHOWN}
		<button
			type="button"
			aria-expanded={all}
			onclick={() => (all = !all)}
			class="mt-3 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
		>
			{all ? 'Show less' : `Show all (${swaps.length})`}
		</button>
	{/if}
</DashCard>

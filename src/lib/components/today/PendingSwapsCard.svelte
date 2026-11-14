<script lang="ts">
	import SwapRequestCard from '#lib/components/calendar/SwapRequestCard.svelte';
	import type { SwapView, SwapWindow } from '#lib/components/calendar/types.js';
	import * as Card from '#lib/components/ui/card/index.js';

	/** Pending swaps with Accept / Decline / Counter (requests you sent show "Waiting for …"). */
	let {
		swaps,
		otherName,
		window: range
	}: { swaps: SwapView[]; otherName: string | null; window: SwapWindow } = $props();
</script>

{#if swaps.length}
	<Card.Root>
		<Card.Header>
			<Card.Title>Swap requests</Card.Title>
		</Card.Header>
		<Card.Content class="divide-y">
			{#each swaps as swap (swap.id)}
				<SwapRequestCard {swap} otherName={otherName ?? 'your co-parent'} window={range} />
			{/each}
		</Card.Content>
	</Card.Root>
{/if}

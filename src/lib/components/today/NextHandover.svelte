<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';

	export interface HandoverInfo {
		day: string;
		date: string;
		time: string;
		place: string | null;
		/** "You" or the other parent's name */
		from: string;
		to: string;
		youDropOff: boolean;
	}

	let {
		handover,
		childName,
		onRequestSwap
	}: {
		handover: HandoverInfo | null;
		childName: string;
		/** Omitted when swaps aren't possible yet (no co-parent / no home set). */
		onRequestSwap?: () => void;
	} = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Next handover</Card.Title>
	</Card.Header>
	<Card.Content class="space-y-3 text-sm">
		{#if handover}
			<p class="text-lg font-semibold">
				<span class="capitalize">{handover.day}</span>, {handover.time}
			</p>
			<p class="text-muted-foreground">
				{handover.date}{handover.place ? ` · ${handover.place}` : ''}
			</p>
			<p>
				{childName} goes from <strong>{handover.from}</strong> to <strong>{handover.to}</strong>.
				{handover.youDropOff ? 'You drop off.' : `${handover.from} drops off.`}
			</p>
		{:else}
			<p class="text-muted-foreground">No handover in the next two weeks.</p>
		{/if}
		{#if onRequestSwap}
			<Button variant="outline" onclick={onRequestSwap}>Request a swap</Button>
		{:else}
			<p class="text-xs text-muted-foreground">Swaps work once your co-parent has joined.</p>
		{/if}
	</Card.Content>
</Card.Root>

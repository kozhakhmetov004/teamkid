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
		swapsEnabled = false
	}: { handover: HandoverInfo | null; childName: string; swapsEnabled?: boolean } = $props();
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
		{#if swapsEnabled}
			<Button href="/calendar?swap=1" variant="outline">Request a swap</Button>
		{:else}
			<Button variant="outline" disabled title="Swap requests are coming next">
				Request a swap (soon)
			</Button>
		{/if}
	</Card.Content>
</Card.Root>

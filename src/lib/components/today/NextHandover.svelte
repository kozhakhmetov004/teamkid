<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import DashCard from './DashCard.svelte';

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

<DashCard
	title="Next handover"
	icon="🔁"
	empty={handover ? undefined : 'None in the next two weeks.'}
>
	{#if handover}
		<p class="text-xl leading-tight font-bold">
			<span class="capitalize">{handover.day}</span>, {handover.time}
		</p>
		<p class="mt-1 text-sm text-muted-foreground">
			{handover.date}{handover.place ? ` · ${handover.place}` : ''}
		</p>
		<p
			class="mt-3 flex flex-wrap items-center gap-2 text-sm"
			aria-label="{childName} goes from {handover.from} to {handover.to}"
		>
			<span class="rounded-full bg-muted px-2.5 py-1 font-medium">{handover.from}</span>
			<span aria-hidden="true" class="text-muted-foreground">→</span>
			<span class="rounded-full bg-accent px-2.5 py-1 font-medium">{handover.to}</span>
			<span class="text-muted-foreground"
				>· {handover.youDropOff ? 'You drop off' : `${handover.from} drops off`}</span
			>
		</p>
		{#if onRequestSwap}
			<Button variant="outline" size="sm" class="mt-4" onclick={onRequestSwap}
				>Request a swap</Button
			>
		{:else}
			<p class="mt-3 text-xs text-muted-foreground">Swaps work once your co-parent has joined.</p>
		{/if}
	{/if}
</DashCard>

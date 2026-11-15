<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import SwapRequestDialog from './SwapRequestDialog.svelte';
	import { swapSubmit } from './swapSubmit.js';
	import type { SwapView, SwapWindow } from './types.js';

	/** One pending swap. The requester only sees "Waiting for …"; the other parent answers. */
	let {
		swap,
		otherName,
		window: range
	}: { swap: SwapView; otherName: string; window: SwapWindow } = $props();

	let pending = $state(false);
	let counterOpen = $state(false);
	const handler = swapSubmit({ setPending: (p) => (pending = p) });
</script>

<div class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
	<div class="text-sm">
		{#if swap.fromMe}You asked{:else}<strong>{swap.requester}</strong> asks{/if}: give {swap.fromMe
			? otherName
			: 'you'} <strong>{swap.original}</strong>{#if swap.proposed}, take
			<strong>{swap.proposed}</strong>{/if}
		{#if swap.note}<span class="block text-muted-foreground">“{swap.note}”</span>{/if}
	</div>

	{#if swap.fromMe}
		<Badge
			class="border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
			>⏳ Waiting for {otherName}</Badge
		>
	{:else}
		<div class="flex flex-wrap gap-2">
			<form method="POST" action="/calendar/swap?/respond" use:enhance={handler}>
				<input type="hidden" name="swapId" value={swap.id} />
				<input type="hidden" name="action" value="accept" />
				<Button type="submit" size="sm" disabled={pending}>Accept</Button>
			</form>
			<form method="POST" action="/calendar/swap?/respond" use:enhance={handler}>
				<input type="hidden" name="swapId" value={swap.id} />
				<input type="hidden" name="action" value="decline" />
				<Button type="submit" size="sm" variant="outline" disabled={pending}>Decline</Button>
			</form>
			<Button size="sm" variant="ghost" disabled={pending} onclick={() => (counterOpen = true)}>
				Counter
			</Button>
		</div>
		<SwapRequestDialog
			bind:open={counterOpen}
			mode="counter"
			swapId={swap.id}
			originalDate={swap.proposedDate ?? ''}
			proposedDate={swap.originalDate}
			otherName={swap.requester}
			window={range}
		/>
	{/if}
</div>

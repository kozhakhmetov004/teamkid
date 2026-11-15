<script lang="ts">
	/**
	 * An activity that came back to the planner after a declined swap request.
	 * Pick a new day/time and add it again (same ?/add flow, incl. the swap
	 * question on the other parent's day), or dismiss it.
	 */
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';

	let {
		idea
	}: {
		idea: {
			id: string;
			title: string;
			place: string | null;
			date: string;
			from: string;
			to: string;
		};
	} = $props();
	const uid = $props.id();

	const initial = untrack(() => ({ date: idea.date, from: idea.from, to: idea.to }));
	let date = $state(initial.date);
	let from = $state(initial.from);
	let to = $state(initial.to);
	let busy = $state(false);
	let message = $state<string | null>(null);
	let swapWith = $state<string | null>(null);
</script>

<li class="space-y-2 rounded-lg border bg-card p-3 text-sm">
	<p class="font-medium">{idea.title}</p>
	<p class="text-xs text-muted-foreground">
		The swap wasn't accepted, so this is back in your ideas. Pick another day?
	</p>
	<form
		method="POST"
		action="?/add"
		class="space-y-2"
		use:enhance={() => {
			busy = true;
			message = null;
			return async ({ result, update }) => {
				busy = false;
				if (result.type === 'success' && result.data?.needsSwap) {
					swapWith = String(result.data.otherName ?? 'your co-parent');
				} else if (result.type === 'success') {
					if (result.data?.form !== 'idea') {
						toast.success(String(result.data?.message ?? 'Added to your calendar'));
					}
					await update();
				} else if (result.type === 'failure') {
					message = String(result.data?.message ?? 'Could not add it.');
				}
			};
		}}
	>
		<input type="hidden" name="ideaId" value={idea.id} />
		<input type="hidden" name="kidVisible" value="yes" />
		<input type="hidden" name="title" value={idea.title} />
		<input type="hidden" name="place" value={idea.place ?? ''} />
		<div class="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
			<div class="space-y-1">
				<Label for="{uid}-d" class="text-xs">Day</Label>
				<Input
					id="{uid}-d"
					name="date"
					type="date"
					bind:value={date}
					oninput={() => (swapWith = null)}
					required
				/>
			</div>
			<div class="space-y-1">
				<Label for="{uid}-f" class="text-xs">Start</Label>
				<Input id="{uid}-f" name="from" type="time" step="900" bind:value={from} required />
			</div>
			<div class="space-y-1">
				<Label for="{uid}-t" class="text-xs">End</Label>
				<Input id="{uid}-t" name="to" type="time" step="900" bind:value={to} required />
			</div>
		</div>
		{#if message}<p role="alert" class="text-xs text-destructive">{message}</p>{/if}
		{#if swapWith}
			<p role="alert" class="font-medium">This is {swapWith}'s day. Ask to swap?</p>
			<div class="flex flex-wrap gap-2">
				<Button type="submit" name="swap" value="1" size="sm" disabled={busy}
					>Ask {swapWith} to swap</Button
				>
				<Button type="button" size="sm" variant="outline" onclick={() => (swapWith = null)}
					>Pick another day</Button
				>
			</div>
		{:else}
			<div class="flex flex-wrap gap-2">
				<Button type="submit" size="sm" disabled={busy}
					>{busy ? 'Adding…' : 'Add to calendar'}</Button
				>
				<Button type="submit" size="sm" variant="ghost" formaction="?/dismissIdea" disabled={busy}
					>Dismiss</Button
				>
			</div>
		{/if}
	</form>
</li>

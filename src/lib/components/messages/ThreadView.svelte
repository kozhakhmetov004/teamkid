<script lang="ts">
	import { tick } from 'svelte';
	import MessageBubble from './MessageBubble.svelte';
	import type { BubbleMessage } from './types.js';

	let { messages }: { messages: BubbleMessage[] } = $props();
	let listEl: HTMLOListElement | undefined = $state();

	// Keep the newest message in view when messages arrive.
	$effect(() => {
		void messages.length;
		void tick().then(() => listEl?.lastElementChild?.scrollIntoView({ block: 'end' }));
	});
</script>

<p class="rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">
	Messages can't be edited or deleted. They're kept as a record.
</p>

{#if messages.length === 0}
	<p class="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
{:else}
	<ol bind:this={listEl} class="space-y-3" aria-label="Messages">
		{#each messages as message (message.id)}
			<MessageBubble {message} />
		{/each}
	</ol>
{/if}

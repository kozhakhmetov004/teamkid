<script lang="ts">
	import ReadReceipt from './ReadReceipt.svelte';
	import ShieldButton from './ShieldButton.svelte';
	import type { BubbleMessage } from './types.js';

	let { message }: { message: BubbleMessage } = $props();
</script>

<li class="flex {message.mine ? 'justify-end' : 'justify-start'}">
	<div class="max-w-[85%] space-y-1 sm:max-w-[70%]">
		<div
			class="rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap shadow-sm {message.mine
				? 'rounded-br-sm bg-primary text-primary-foreground'
				: 'rounded-bl-sm border bg-card'}"
		>
			{message.body}
		</div>
		<p
			class="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground {message.mine
				? 'justify-end'
				: ''}"
		>
			<span>{message.mine ? 'You' : message.from} · {message.sentLabel}</span>
			{#if message.aiRewritten}
				<span class="rounded-full border px-2 py-0.5">AI-assisted</span>
			{/if}
			{#if message.mine}<ReadReceipt readLabel={message.readLabel} />{:else}<ShieldButton
					messageId={message.id}
				/>{/if}
		</p>
	</div>
</li>

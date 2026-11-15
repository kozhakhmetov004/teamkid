<script lang="ts">
	/** A compact one-line setup/hint strip (e.g. "Invite your co-parent"). */
	import { Button } from '#lib/components/ui/button/index.js';

	let {
		icon,
		title,
		text,
		href,
		label
	}: { icon: string; title: string; text?: string; href?: string; label?: string } = $props();
</script>

<div
	class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-pebble/20 px-4 py-3 text-sm shadow-sm"
>
	<span aria-hidden="true" class="text-lg">{icon}</span>
	<p class="min-w-0 flex-1">
		<span class="font-semibold">{title}</span>
		{#if text}<span class="text-muted-foreground"> · {text}</span>{/if}
	</p>
	{#if href && label}<Button {href} size="sm" variant="outline">{label}</Button>{/if}
</div>

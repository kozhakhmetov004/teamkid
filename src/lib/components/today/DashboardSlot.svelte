<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '#lib/components/ui/card/index.js';

	/**
	 * A fixed place on Today where another workstream drops its component:
	 *   <DashboardSlot name="insights" title="…" owner="Member 2"><InsightCard … /></DashboardSlot>
	 * Without children it renders a clearly labelled placeholder.
	 */
	let {
		name,
		title,
		owner,
		children
	}: { name: string; title: string; owner: string; children?: Snippet } = $props();
</script>

<section data-slot={name} aria-label={title} class="min-w-0">
	{#if children}
		{@render children()}
	{:else}
		<Card.Root class="h-full border-dashed">
			<Card.Header>
				<Card.Title>{title}</Card.Title>
				<Card.Description>Coming soon · built by {owner}</Card.Description>
			</Card.Header>
		</Card.Root>
	{/if}
</section>

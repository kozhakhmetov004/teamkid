<script lang="ts">
	/**
	 * Dashboard card shell on the shared Card: same radius, padding and header
	 * row as every other card (the dashboard gives all card headers one fixed
	 * height + divider). Empty → one compact line. Height follows the content.
	 *
	 *   <DashCard title="Messages" icon="💬" empty={none ? 'No messages yet.' : undefined}>…</DashCard>
	 */
	import type { Snippet } from 'svelte';
	import * as Card from '#lib/components/ui/card/index.js';

	let {
		title,
		icon,
		badge,
		action,
		empty,
		class: klass = '',
		children
	}: {
		title: string;
		icon: string;
		/** Small pill next to the title, e.g. "2 unread". */
		badge?: string;
		/** Link in the header (or at the end of the empty line). */
		action?: { href: string; label: string };
		/** When set, the card collapses into one line with this text. */
		empty?: string;
		class?: string;
		children?: Snippet;
	} = $props();
	const id = $props.id();

	const link =
		'shrink-0 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';
</script>

{#snippet chip()}
	<span
		class="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-sm"
		aria-hidden="true">{icon}</span
	>
{/snippet}

{#if empty}
	<Card.Root aria-label={title} class="flex-row items-center gap-3 px-4 py-3 {klass}">
		{@render chip()}
		<span class="shrink-0 text-base font-semibold">{title}</span>
		<span class="min-w-0 flex-1 truncate text-muted-foreground">{empty}</span>
		{#if action}<a href={action.href} class={link}>{action.label}</a>{/if}
	</Card.Root>
{:else}
	<Card.Root aria-labelledby="{id}-title" class={klass}>
		<Card.Header class="flex items-center gap-2">
			{@render chip()}
			<Card.Title id="{id}-title">{title}</Card.Title>
			{#if badge}
				<span
					class="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
					>{badge}</span
				>
			{/if}
			{#if action}<a href={action.href} class="ml-auto {link}">{action.label}</a>{/if}
		</Card.Header>
		<Card.Content>
			{@render children?.()}
		</Card.Content>
	</Card.Root>
{/if}

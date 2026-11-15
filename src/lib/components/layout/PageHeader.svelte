<script lang="ts">
	/**
	 * One page header for every parent page: icon chip, title, short
	 * description, and actions on the right (wrap under on small screens).
	 *
	 *   <PageHeader title="Expenses" icon="💳" description="…">{#snippet actions()}…{/snippet}</PageHeader>
	 */
	import type { Snippet } from 'svelte';

	let {
		title,
		icon,
		description,
		back,
		actions
	}: {
		title: string;
		icon: string;
		description?: string;
		/** Optional "← Family" style link above the title. */
		back?: { href: string; label: string };
		actions?: Snippet;
	} = $props();
</script>

<header class="flex flex-wrap items-end justify-between gap-4">
	<div class="min-w-0 space-y-1">
		{#if back}
			<a
				href={back.href}
				class="inline-block rounded-md text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				>← {back.label}</a
			>
		{/if}
		<div class="flex items-center gap-3">
			<span
				class="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-xl shadow-sm"
				aria-hidden="true">{icon}</span
			>
			<h1 class="truncate text-2xl font-bold sm:text-3xl">{title}</h1>
		</div>
		{#if description}<p class="text-muted-foreground">{description}</p>{/if}
	</div>
	{#if actions}
		<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
	{/if}
</header>

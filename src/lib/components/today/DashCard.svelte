<script lang="ts">
	/**
	 * Dashboard card shell: one spacing scale, header (icon chip + title + badge
	 * + action) and a compact one-line state when there's nothing to show.
	 * Height always follows the content (no fixed heights).
	 *
	 *   <DashCard title="Messages" icon="💬" empty={none ? 'No messages yet.' : undefined}>…</DashCard>
	 */
	import type { Snippet } from 'svelte';

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

{#if empty}
	<section
		aria-label={title}
		class="flex min-w-0 items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm shadow-xs {klass}"
	>
		<span
			class="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-base"
			aria-hidden="true">{icon}</span
		>
		<span class="shrink-0 font-semibold">{title}</span>
		<span class="min-w-0 flex-1 truncate text-muted-foreground">{empty}</span>
		{#if action}<a href={action.href} class={link}>{action.label}</a>{/if}
	</section>
{:else}
	<section
		aria-labelledby="{id}-title"
		class="min-w-0 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 {klass}"
	>
		<header class="mb-3 flex items-center gap-3">
			<span
				class="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-base"
				aria-hidden="true">{icon}</span
			>
			<h2 id="{id}-title" class="text-base font-semibold">{title}</h2>
			{#if badge}
				<span
					class="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
					>{badge}</span
				>
			{/if}
			{#if action}<a href={action.href} class="ml-auto {link}">{action.label}</a>{/if}
		</header>
		{@render children?.()}
	</section>
{/if}

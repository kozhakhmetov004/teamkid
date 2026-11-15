<script lang="ts">
	import DashCard from './DashCard.svelte';

	export interface LatestThread {
		threadId: string;
		topic: string;
		from: string;
		snippet: string;
		when: string;
		unread: boolean;
	}

	let { count, threads }: { count: number; threads: LatestThread[] } = $props();
</script>

<DashCard
	title="Messages"
	icon="💬"
	badge={count > 0 ? `${count} unread` : undefined}
	empty={threads.length === 0 ? 'No messages yet.' : undefined}
	action={{ href: '/messages', label: threads.length ? 'Show all' : 'Open' }}
>
	<ul class="space-y-1 text-sm">
		{#each threads as t (t.threadId)}
			<li>
				<a
					href="/messages/{t.threadId}"
					class="-mx-2 flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				>
					<span
						class="mt-1.5 size-2 shrink-0 rounded-full {t.unread ? 'bg-primary' : 'bg-transparent'}"
						aria-hidden="true"
					></span>
					<span class="min-w-0 flex-1">
						<span class="flex items-baseline justify-between gap-2">
							<span class="truncate {t.unread ? 'font-semibold' : 'font-medium'}">{t.topic}</span>
							<span class="shrink-0 text-xs text-muted-foreground">{t.when}</span>
						</span>
						<span class="block truncate text-muted-foreground">{t.from}: {t.snippet}</span>
					</span>
					{#if t.unread}<span class="sr-only">(unread)</span>{/if}
				</a>
			</li>
		{/each}
	</ul>
</DashCard>

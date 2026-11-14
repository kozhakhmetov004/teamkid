<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import type { ThreadRow } from './types.js';

	let { threads }: { threads: ThreadRow[] } = $props();
</script>

{#if threads.length === 0}
	<p class="text-sm text-muted-foreground">No conversations yet. Start a topic below.</p>
{:else}
	<ul class="divide-y rounded-xl border bg-card">
		{#each threads as t (t.id)}
			<li>
				<a
					href="/messages/{t.id}"
					class="flex items-start gap-3 px-4 py-3 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				>
					<span class="min-w-0 flex-1">
						<span class="flex items-center justify-between gap-2">
							<span class="font-medium">{t.topic}</span>
							{#if t.when}<span class="shrink-0 text-xs text-muted-foreground">{t.when}</span>{/if}
						</span>
						<span class="block truncate text-sm text-muted-foreground">
							{t.snippet ? `${t.from}: ${t.snippet}` : 'No messages yet'}
						</span>
					</span>
					{#if t.unread > 0}<Badge>{t.unread} unread</Badge>{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}

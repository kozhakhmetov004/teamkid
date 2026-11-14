<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Card from '#lib/components/ui/card/index.js';

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

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			Messages
			{#if count > 0}<Badge>{count} unread</Badge>{/if}
		</Card.Title>
	</Card.Header>
	<Card.Content>
		{#if threads.length === 0}
			<p class="text-sm text-muted-foreground">No messages yet.</p>
		{:else}
			<ul class="divide-y text-sm">
				{#each threads as t (t.threadId)}
					<li>
						<a
							href="/messages/{t.threadId}"
							class="-mx-2 block rounded-lg px-2 py-2 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
						>
							<span class="flex items-center justify-between gap-2">
								<span class="font-medium">{t.topic}</span>
								<span class="text-xs text-muted-foreground">{t.when}</span>
							</span>
							<span class="flex items-start gap-2">
								<span class="min-w-0 flex-1 truncate text-muted-foreground"
									>{t.from}: {t.snippet}</span
								>
								{#if t.unread}<Badge variant="secondary">unread</Badge>{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>

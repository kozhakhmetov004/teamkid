<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Card from '#lib/components/ui/card/index.js';

	export interface PendingSwap {
		id: string;
		fromMe: boolean;
		/** "You" or the requesting parent's name */
		requester: string;
		original: string;
		proposed: string | null;
		note: string | null;
	}

	/** Read-only in feat/today; Accept / Decline / Counter arrive with feat/swaps. */
	let { swaps, otherName }: { swaps: PendingSwap[]; otherName: string | null } = $props();
</script>

{#if swaps.length}
	<Card.Root>
		<Card.Header>
			<Card.Title>Swap requests</Card.Title>
		</Card.Header>
		<Card.Content>
			<ul class="divide-y text-sm">
				{#each swaps as swap (swap.id)}
					<li class="flex flex-wrap items-center justify-between gap-2 py-2">
						<span>
							{#if swap.fromMe}You asked{:else}<strong>{swap.requester}</strong> asks{/if}:
							{swap.original} → {swap.proposed ?? 'no date yet'}
							{#if swap.note}<span class="block text-muted-foreground">“{swap.note}”</span>{/if}
						</span>
						{#if swap.fromMe}
							<Badge variant="outline">Waiting for {otherName ?? 'your co-parent'}</Badge>
						{:else}
							<Badge>Needs your answer</Badge>
						{/if}
					</li>
				{/each}
			</ul>
		</Card.Content>
	</Card.Root>
{/if}

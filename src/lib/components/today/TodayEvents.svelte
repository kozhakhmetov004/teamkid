<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Card from '#lib/components/ui/card/index.js';

	export interface TodayEvent {
		id: string;
		time: string;
		title: string;
		place: string | null;
		kind: string;
	}

	let { events }: { events: TodayEvent[] } = $props();

	const kindLabel: Record<string, string> = {
		school: 'School',
		activity: 'Activity',
		medical: 'Medical',
		handover: 'Handover',
		other: 'Other'
	};
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Today</Card.Title>
	</Card.Header>
	<Card.Content>
		{#if events.length === 0}
			<p class="text-sm text-muted-foreground">A quiet day.</p>
		{:else}
			<ul class="divide-y">
				{#each events as event (event.id)}
					<li class="flex items-start gap-3 py-2 text-sm">
						<span class="w-16 shrink-0 font-medium tabular-nums">{event.time}</span>
						<span class="min-w-0 flex-1">
							<span class="block font-medium">{event.title}</span>
							{#if event.place}<span class="block text-muted-foreground">{event.place}</span>{/if}
						</span>
						<Badge variant="outline">{kindLabel[event.kind] ?? event.kind}</Badge>
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>

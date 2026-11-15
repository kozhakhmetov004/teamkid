<script lang="ts">
	import DashCard from './DashCard.svelte';

	export interface TodayEvent {
		id: string;
		time: string;
		title: string;
		place: string | null;
		kind: string;
	}

	let { events }: { events: TodayEvent[] } = $props();

	const SHOWN = 3;
	let all = $state(false);
	const visible = $derived(all ? events : events.slice(0, SHOWN));

	const kindLabel: Record<string, string> = {
		school: 'School',
		activity: 'Activity',
		medical: 'Medical',
		handover: 'Handover',
		other: 'Other'
	};
</script>

<DashCard
	title="Today"
	icon="📅"
	empty={events.length === 0 ? 'A quiet day.' : undefined}
	action={{ href: '/calendar', label: 'Calendar' }}
>
	<ul class="space-y-2">
		{#each visible as event (event.id)}
			<li class="flex items-start gap-3 rounded-xl bg-muted/60 px-3 py-2 text-sm">
				<span class="w-16 shrink-0 pt-px font-semibold tabular-nums">{event.time}</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate font-medium">{event.title}</span>
					{#if event.place}<span class="block truncate text-muted-foreground">{event.place}</span
						>{/if}
				</span>
				<span class="shrink-0 rounded-full border bg-card px-2 py-0.5 text-xs text-muted-foreground"
					>{kindLabel[event.kind] ?? event.kind}</span
				>
			</li>
		{/each}
	</ul>
	{#if events.length > SHOWN}
		<button
			type="button"
			aria-expanded={all}
			onclick={() => (all = !all)}
			class="mt-3 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
		>
			{all ? 'Show less' : `Show all (${events.length})`}
		</button>
	{/if}
</DashCard>

<script lang="ts">
	/**
	 * Hero card: where the child sleeps tonight (today's week-strip day), the
	 * custody line, today's events and the daily briefing (rule-based, or AI
	 * when source="ai"). Replaces the separate briefing + "Today" cards.
	 */
	export interface TodayEvent {
		id: string;
		time: string;
		title: string;
		place: string | null;
		kind: string;
	}

	let {
		childName,
		mine,
		withName,
		custodyLine,
		events,
		briefing,
		source = 'rules'
	}: {
		childName: string;
		/** true = with you tonight, false = with the other parent, null = not set */
		mine: boolean | null;
		withName: string | null;
		custodyLine: string | null;
		events: TodayEvent[];
		briefing: string;
		source?: 'rules' | 'ai';
	} = $props();

	const SHOWN = 3;
	let all = $state(false);
	const visible = $derived(all ? events : events.slice(0, SHOWN));

	const headline = $derived(
		mine === true
			? `${childName} is with you`
			: mine === false
				? `${childName} is with ${withName ?? 'your co-parent'}`
				: 'Tonight isn’t set yet'
	);
	const kindLabel: Record<string, string> = {
		school: 'School',
		activity: 'Activity',
		medical: 'Medical',
		handover: 'Handover',
		other: 'Other'
	};
	const lightFocus =
		'rounded-md focus-visible:ring-3 focus-visible:ring-primary-foreground/60 focus-visible:outline-none';
</script>

<section
	aria-label="Tonight and today"
	class="flex min-w-0 flex-col gap-5 rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.42_0.08_185)] p-5 text-primary-foreground shadow-sm sm:p-6"
>
	<div class="flex items-start gap-4">
		<span
			class="grid size-12 shrink-0 place-items-center rounded-2xl bg-pebble text-2xl text-pebble-foreground"
			aria-hidden="true">{mine === null ? '🐢' : '🌙'}</span
		>
		<div class="min-w-0 space-y-1">
			<p class="text-xs font-medium tracking-wide uppercase opacity-90">Tonight</p>
			<p class="text-2xl leading-tight font-bold sm:text-3xl">{headline}</p>
			{#if custodyLine}<p class="text-sm opacity-90">{custodyLine}</p>{/if}
			{#if mine === null}
				<a
					href="/calendar"
					class="inline-block text-sm font-medium underline underline-offset-4 {lightFocus}"
					>Set up the custody schedule</a
				>
			{/if}
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<!-- Today's events (light panel so the list reads like a normal card) -->
		<div class="rounded-xl bg-card p-4 text-card-foreground">
			<div class="mb-2 flex items-center justify-between gap-2">
				<h2 class="text-sm font-semibold">Today</h2>
				<a
					href="/calendar"
					class="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
					>Planner</a
				>
			</div>
			{#if events.length === 0}
				<p class="text-sm text-muted-foreground">A quiet day, nothing planned.</p>
			{:else}
				<ul class="space-y-1.5">
					{#each visible as event (event.id)}
						<li class="flex items-start gap-3 text-sm">
							<span class="w-16 shrink-0 font-semibold tabular-nums">{event.time}</span>
							<span class="min-w-0 flex-1">
								<span class="block truncate font-medium">{event.title}</span>
								<span class="block truncate text-xs text-muted-foreground"
									>{kindLabel[event.kind] ?? event.kind}{event.place
										? ` · ${event.place}`
										: ''}</span
								>
							</span>
						</li>
					{/each}
				</ul>
				{#if events.length > SHOWN}
					<button
						type="button"
						aria-expanded={all}
						onclick={() => (all = !all)}
						class="mt-2 rounded-md text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
					>
						{all ? 'Show less' : `Show all (${events.length})`}
					</button>
				{/if}
			{/if}
		</div>

		<div class="rounded-xl bg-black/10 p-4">
			<p class="mb-1 text-xs font-medium opacity-90">
				Today's briefing{#if source === 'ai'}<span> · AI summary</span>{/if}
			</p>
			<p class="text-sm leading-relaxed">{briefing}</p>
		</div>
	</div>
</section>

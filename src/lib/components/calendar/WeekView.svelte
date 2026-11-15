<script lang="ts">
	import DayCell from './DayCell.svelte';
	import { kindLabel, type CalDay, type CalEvent } from './types.js';

	/** 7 columns on desktop; an agenda list on phones. */
	let {
		days,
		canSwap,
		onSwap,
		onEditEvent
	}: {
		days: CalDay[];
		canSwap: boolean;
		onSwap: (day: CalDay) => void;
		onEditEvent: (event: CalEvent) => void;
	} = $props();
</script>

<div class="hidden grid-cols-7 gap-2 md:grid">
	{#each days as day (day.date)}
		<DayCell {day} {canSwap} {onSwap} {onEditEvent} />
	{/each}
</div>

<ol class="space-y-2 md:hidden" aria-label="Agenda">
	{#each days as day (day.date)}
		<li
			class="rounded-xl border p-3 {day.mine === true
				? 'border-primary/40 bg-primary/10'
				: day.mine === false
					? 'border-pebble bg-pebble/25'
					: 'border-dashed bg-muted/60'} {day.isToday ? 'ring-2 ring-primary' : ''}"
		>
			<div class="flex items-center justify-between gap-2">
				<p class="font-semibold">
					{day.isToday ? 'Today' : day.weekday}
					{day.dayOfMonth}
				</p>
				<p class="text-sm font-medium">
					{day.mine === null ? 'No custody set' : day.mine ? 'With you' : `With ${day.label}`}
				</p>
			</div>
			{#if day.birthday}
				<p
					class="mt-1 rounded bg-amber-100 px-2 py-1 text-sm font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
				>
					<span aria-hidden="true">🎂</span>
					{day.birthday}
				</p>
			{/if}
			{#if day.pendingSwap}<p class="mt-1 text-xs">⇄ Swap pending</p>{/if}
			{#if day.events.length}
				<ul class="mt-2 space-y-1">
					{#each day.events as ev (ev.id)}
						<li>
							<button
								type="button"
								class="w-full rounded-md bg-background/80 px-2 py-2 text-left text-sm"
								onclick={() => onEditEvent(ev)}
							>
								<span class="font-medium tabular-nums">{ev.time}</span>
								{ev.title}
								<span class="block text-xs text-muted-foreground"
									>{kindLabel(ev.kind)}{ev.place ? ` · ${ev.place}` : ''}{ev.kidVisible
										? ''
										: ' · 🤫 Hidden from child'}</span
								>
								{#if ev.pendingSwap}
									<span class="mt-0.5 inline-block rounded bg-pebble/40 px-1 text-xs font-medium"
										>⇄ Pending swap</span
									>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			{#if canSwap && day.mine !== null && !day.isPast}
				<button
					type="button"
					class="mt-2 min-h-10 w-full rounded-md border border-dashed px-2 text-sm"
					onclick={() => onSwap(day)}
				>
					{day.mine ? 'Request a swap for this night' : 'Ask for this night'}
				</button>
			{/if}
		</li>
	{/each}
</ol>

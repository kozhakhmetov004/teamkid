<script lang="ts">
	import { kindLabel, type CalDay, type CalEvent } from './types.js';

	/**
	 * One day: custody night (tint + text label), events, and actions.
	 * `compact` is used by the month grid.
	 */
	let {
		day,
		compact = false,
		canSwap = false,
		onSwap,
		onEditEvent
	}: {
		day: CalDay;
		compact?: boolean;
		canSwap?: boolean;
		onSwap?: (day: CalDay) => void;
		onEditEvent?: (event: CalEvent) => void;
	} = $props();

	const tone = $derived(
		day.mine === true
			? 'border-primary/40 bg-primary/10'
			: day.mine === false
				? 'border-pebble bg-pebble/25'
				: 'border-dashed bg-muted/60'
	);
	/** Birthday: warm ring on top of the custody tint (plus 🎂 + words, never colour alone). */
	const bday = $derived(day.birthday ? 'ring-2 ring-amber-400 dark:ring-amber-300' : '');
	const nightLabel = $derived(
		day.mine === null ? 'No custody set' : day.mine ? 'With you' : `With ${day.label}`
	);
</script>

{#if compact}
	<a
		href="/calendar?view=week&date={day.date}"
		class="flex h-full min-h-20 flex-col gap-1 rounded-lg border p-1.5 text-left transition hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none {tone} {day.inMonth
			? ''
			: 'opacity-50'} {day.isToday ? 'ring-2 ring-primary' : bday}"
		aria-label="{day.weekday} {day.dayOfMonth}: {nightLabel}{day.birthday
			? `, ${day.birthday}`
			: ''}{day.events.length
			? `, ${day.events.length} event${day.events.length === 1 ? '' : 's'}`
			: ''}{day.pendingSwap ? ', swap pending' : ''}"
	>
		<span class="flex items-center justify-between text-xs">
			<span class="font-semibold">{day.dayOfMonth}</span>
			{#if day.pendingSwap}<span title="Swap pending">⇄</span>{/if}
		</span>
		<span class="truncate text-[11px] font-medium">{day.label}</span>
		{#if day.birthday}
			<span
				class="truncate rounded bg-amber-100 px-1 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
				><span aria-hidden="true">🎂</span>
				<span class="hidden sm:inline">{day.birthday}</span></span
			>
		{/if}
		{#each day.events.slice(0, 2) as ev (ev.id)}
			<span class="hidden truncate text-[11px] text-muted-foreground sm:block">{ev.title}</span>
		{/each}
		{#if day.events.length > 2}<span class="hidden text-[11px] text-muted-foreground sm:block"
				>+{day.events.length - 2} more</span
			>{/if}
		{#if day.events.length}<span class="text-[11px] text-muted-foreground sm:hidden"
				>{day.events.length} event{day.events.length === 1 ? '' : 's'}</span
			>{/if}
	</a>
{:else}
	<section
		class="flex h-full flex-col gap-2 rounded-xl border p-2 {tone} {day.isToday
			? 'ring-2 ring-primary'
			: bday}"
		aria-label="{day.weekday} {day.dayOfMonth}"
	>
		<header class="flex items-start justify-between gap-1">
			<div>
				<p class="text-xs text-muted-foreground">{day.isToday ? 'Today' : day.weekday}</p>
				<p class="text-lg leading-none font-semibold">{day.dayOfMonth}</p>
			</div>
			<p class="text-right text-xs font-medium">{nightLabel}</p>
		</header>

		{#if day.birthday}
			<p
				class="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
			>
				<span aria-hidden="true">🎂</span>
				{day.birthday}
			</p>
		{/if}
		{#if day.pendingSwap}
			<p class="rounded bg-background/70 px-1.5 py-0.5 text-xs">⇄ Swap pending</p>
		{/if}

		<ul class="flex-1 space-y-1">
			{#each day.events as ev (ev.id)}
				<li>
					<button
						type="button"
						class="w-full rounded-md bg-background/80 px-2 py-1 text-left text-xs hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
						onclick={() => onEditEvent?.(ev)}
						aria-label="Edit {ev.title} at {ev.time}"
					>
						<span class="font-medium tabular-nums">{ev.time}</span>
						{ev.title}
						<span class="block text-muted-foreground"
							>{kindLabel(ev.kind)}{ev.place ? ` · ${ev.place}` : ''}</span
						>
					</button>
				</li>
			{/each}
		</ul>

		{#if canSwap && day.mine !== null && !day.isPast}
			<button
				type="button"
				class="rounded-md border border-dashed px-2 py-1 text-xs hover:bg-background/80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				onclick={() => onSwap?.(day)}
			>
				{day.mine ? 'Request a swap for this night' : `Ask for this night`}
			</button>
		{/if}
	</section>
{/if}

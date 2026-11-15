<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';

	export interface WeekStripDay {
		date: string;
		weekday: string;
		dayOfMonth: number;
		/** "You", the other parent's name, or "Not set" */
		label: string;
		/** true = with you, false = with the other parent, null = unknown */
		mine: boolean | null;
		eventCount: number;
		isToday: boolean;
	}

	let { days }: { days: WeekStripDay[] } = $props();

	const tone = (mine: boolean | null) =>
		mine === true
			? 'border-transparent bg-[oklch(0.9_0.055_172)] dark:bg-primary/25'
			: mine === false
				? 'border-transparent bg-[oklch(0.92_0.07_82)] dark:bg-pebble/30'
				: 'border-dashed border-border bg-card';
</script>

<Card.Root aria-labelledby="week-strip-title" class="min-w-0">
	<Card.Header class="flex items-center gap-2">
		<span
			class="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-sm"
			aria-hidden="true">🗓️</span
		>
		<Card.Title id="week-strip-title">This week</Card.Title>
		<span class="ml-auto text-xs text-muted-foreground">Where the night is spent</span>
	</Card.Header>
	<Card.Content>
		<ol class="grid grid-cols-7 gap-1.5 sm:gap-2">
			{#each days as day (day.date)}
				<li>
					<a
						href="/calendar?date={day.date}"
						class="flex h-full min-h-20 flex-col items-center justify-between gap-1 rounded-xl border p-1.5 text-center transition hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:p-2 {tone(
							day.mine
						)} {day.isToday ? 'ring-2 ring-primary' : ''}"
						aria-label="{day.isToday ? 'Today, ' : ''}{day.weekday} {day.dayOfMonth}: {day.mine ===
						null
							? 'no custody set'
							: `night with ${day.label}`}{day.eventCount
							? `, ${day.eventCount} event${day.eventCount === 1 ? '' : 's'}`
							: ''}"
					>
						<span class="text-xs text-muted-foreground">{day.isToday ? 'Today' : day.weekday}</span>
						<span class="text-lg leading-none font-semibold">{day.dayOfMonth}</span>
						<span class="w-full truncate text-[11px] font-medium sm:text-xs">{day.label}</span>
						<span class="flex h-2 gap-1" aria-hidden="true">
							{#each Array(Math.min(day.eventCount, 3)) as _, i (i)}
								<span class="size-2 rounded-full bg-primary ring-2 ring-card"></span>
							{/each}
						</span>
					</a>
				</li>
			{/each}
		</ol>
	</Card.Content>
</Card.Root>

<script lang="ts">
	import DayCell from './DayCell.svelte';
	import type { CalDay } from './types.js';

	let { days }: { days: CalDay[] } = $props();
	const weekdays = $derived(days.slice(0, 7).map((d) => d.weekday));
</script>

<div class="grid grid-cols-7 gap-1 sm:gap-2">
	{#each weekdays as wd (wd)}
		<p class="text-center text-xs font-medium text-muted-foreground">{wd}</p>
	{/each}
	{#each days as day (day.date)}
		<DayCell {day} compact />
	{/each}
</div>

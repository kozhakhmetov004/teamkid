<script lang="ts">
	import SourceQuote from './SourceQuote.svelte';

	/** Holidays found in the plan. P1 stores them with the schedule; it doesn't put them on the calendar. */
	let {
		holidays
	}: { holidays: { name: string; rule: string; quote: { text: string; page: number } | null }[] } =
		$props();
</script>

{#if holidays.length === 0}
	<p class="text-sm text-muted-foreground">No holiday rules found in the plan.</p>
{:else}
	<ul class="space-y-3">
		{#each holidays as h, i (i)}
			<li class="space-y-1">
				<p class="text-sm"><span class="font-medium">{h.name}:</span> {h.rule}</p>
				<SourceQuote quote={h.quote} />
			</li>
		{/each}
	</ul>
	<p class="mt-3 text-xs text-muted-foreground">
		Saved with your schedule for reference. Holidays aren't added to the calendar automatically yet.
	</p>
{/if}

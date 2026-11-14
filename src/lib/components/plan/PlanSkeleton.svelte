<script lang="ts">
	let { seconds }: { seconds: number } = $props();
</script>

<div class="space-y-3" aria-busy="true">
	<p class="text-sm text-muted-foreground" aria-live="polite">
		Finding places nearby and fitting them into your weekend… <span class="tabular-nums"
			>({seconds} s)</span
		>
	</p>
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each [0, 1, 2] as i (i)}
			<div class="h-64 animate-pulse rounded-xl border bg-muted/60"></div>
		{/each}
	</div>
	<div class="h-24 animate-pulse rounded-xl border border-dashed bg-muted/40"></div>
</div>

<script lang="ts">
	let { otherName }: { otherName: string } = $props();
</script>

<ul class="flex flex-wrap gap-4 text-sm" aria-label="Legend">
	<li class="flex items-center gap-1.5">
		<span class="size-3.5 rounded bg-[oklch(0.9_0.055_172)] dark:bg-primary/25" aria-hidden="true"
		></span>
		Night with you
	</li>
	<li class="flex items-center gap-1.5">
		<span class="size-3.5 rounded bg-[oklch(0.92_0.07_82)] dark:bg-pebble/30" aria-hidden="true"
		></span>
		Night with {otherName}
	</li>
	<li class="flex items-center gap-1.5">
		<span class="size-3.5 rounded border border-dashed border-border bg-card" aria-hidden="true"
		></span>
		No custody set
	</li>
</ul>

<script lang="ts">
	let { otherName }: { otherName: string } = $props();
</script>

<ul class="flex flex-wrap gap-3 text-xs" aria-label="Legend">
	<li class="flex items-center gap-1.5">
		<span class="size-3 rounded border border-primary/40 bg-primary/15" aria-hidden="true"></span>
		Night with you
	</li>
	<li class="flex items-center gap-1.5">
		<span class="size-3 rounded border border-pebble bg-pebble/40" aria-hidden="true"></span>
		Night with {otherName}
	</li>
	<li class="flex items-center gap-1.5">
		<span class="size-3 rounded border border-dashed bg-muted" aria-hidden="true"></span>
		No custody set
	</li>
</ul>

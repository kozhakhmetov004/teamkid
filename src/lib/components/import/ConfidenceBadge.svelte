<script lang="ts">
	/**
	 * How sure the AI is about one field. Colour is never the only signal:
	 * every level has its own text (and symbol).
	 */
	let { value, found = true }: { value: number; found?: boolean } = $props();

	const level = $derived(
		!found ? 'missing' : value >= 0.8 ? 'clear' : value >= 0.5 ? 'check' : 'unsure'
	);
	const LABEL = {
		clear: '✓ Clear in the plan',
		check: '? Please check',
		unsure: '! Unsure, check carefully',
		missing: '– Not found in the plan'
	} as const;
	const CLASS = {
		clear: 'border-primary/30 bg-primary/10 text-primary',
		check: 'border-pebble bg-pebble/30 text-pebble-foreground',
		unsure: 'border-destructive/30 bg-destructive/10 text-destructive',
		missing: 'border-border bg-muted text-muted-foreground'
	} as const;
</script>

<span
	class="inline-flex h-5 shrink-0 items-center rounded-4xl border px-2 text-xs font-medium whitespace-nowrap {CLASS[
		level
	]}"
>
	{LABEL[level]}
</span>

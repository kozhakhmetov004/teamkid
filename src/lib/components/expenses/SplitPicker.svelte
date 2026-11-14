<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { SPLIT_PRESETS, type SplitPreset } from '#lib/expenses/split.js';

	/** Posts `split` (preset) and `customPayerPct`. */
	let {
		otherName,
		preset = $bindable<SplitPreset>('50'),
		customPct = $bindable('')
	}: { otherName: string; preset?: SplitPreset; customPct?: string } = $props();

	const selectClass =
		'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';
</script>

<div class="space-y-1">
	<Label for="split">How is it shared?</Label>
	<select id="split" name="split" class={selectClass} bind:value={preset}>
		{#each SPLIT_PRESETS as p (p.value)}
			<option value={p.value}>{p.label.replace('The other parent', otherName)}</option>
		{/each}
	</select>
</div>
{#if preset === 'custom'}
	<div class="space-y-1">
		<Label for="custom-pct">Your share (%)</Label>
		<Input
			id="custom-pct"
			name="customPayerPct"
			type="number"
			inputmode="decimal"
			min="0"
			max="100"
			step="0.01"
			required
			bind:value={customPct}
		/>
		<p class="text-xs text-muted-foreground">{otherName} pays the rest.</p>
	</div>
{/if}

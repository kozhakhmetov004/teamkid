<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { SPLIT_PRESETS, type SplitPreset } from '#lib/expenses/split.js';

	/**
	 * Posts `split` (preset) and `customPayerPct`. "Family split" appears only
	 * when both parents agreed on one (`familyPct` = my share of it).
	 */
	let {
		otherName,
		preset = $bindable<SplitPreset>('50'),
		customPct = $bindable(''),
		familyPct = null,
		hideMeOnly = false
	}: {
		otherName: string;
		preset?: SplitPreset;
		customPct?: string;
		familyPct?: number | null;
		/** hide "I pay 100%" (e.g. when asking the other parent to share) */
		hideMeOnly?: boolean;
	} = $props();

	const options = $derived(
		SPLIT_PRESETS.filter(
			(p) => (p.value !== 'family' || familyPct !== null) && (!hideMeOnly || p.value !== 'me')
		)
	);

	const label = (p: (typeof SPLIT_PRESETS)[number]) =>
		p.value === 'family'
			? `Family split (you ${familyPct}% · ${otherName} ${100 - (familyPct ?? 0)}%)`
			: p.label.replace('The other parent', otherName);

	const selectClass =
		'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';
</script>

<div class="space-y-1">
	<Label for="split">How is it shared?</Label>
	<select id="split" name="split" class={selectClass} bind:value={preset}>
		{#each options as p (p.value)}
			<option value={p.value}>{label(p)}</option>
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

<script lang="ts">
	/**
	 * PRIVATE: only the signed-in parent ever sees this card or their range.
	 * Shows my share of this month's child costs vs my income range, and lets
	 * me opt in to the income-based split suggestion (with an honest warning).
	 */
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { INCOME_BANDS } from '#lib/expenses/income.js';
	import { selectClass, withToast } from './submit.js';
	import type { MyMoneyView } from './types.js';

	let { money, otherName }: { money: MyMoneyView; otherName: string } = $props();

	let editing = $state(false);
	let busy = $state(false);
	let share = $state(false);
	let band = $state('');

	function edit() {
		band = money.band ?? '';
		share = money.shareForSplit;
		editing = true;
	}

	const LEVEL_TEXT = {
		light: 'A light month.',
		moderate: 'A moderate month.',
		heavy: 'A heavy month. Asking before big costs can help.'
	} as const;
</script>

<Card.Root class="border-dashed" id="my-money">
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<span aria-hidden="true">🔒</span> My money
		</Card.Title>
		<Card.Description
			>Private. Only you see this card. {otherName} never sees your income.</Card.Description
		>
	</Card.Header>
	<Card.Content class="space-y-4 text-sm">
		<div>
			<p>
				Your share of child costs in {money.monthLabel}:
				<strong class="text-lg">{money.share}</strong>
			</p>
			{#if money.pctOfIncome !== null && money.level}
				<p class="text-muted-foreground">
					About <strong class="text-foreground">{money.pctOfIncome}%</strong> of your monthly
					income. {LEVEL_TEXT[money.level]}
				</p>
			{:else}
				<p class="text-muted-foreground">
					Add your income range to see what this means for your budget.
				</p>
			{/if}
		</div>

		{#if editing}
			<form
				method="POST"
				action="?/incomeSave"
				class="space-y-3 rounded-lg border p-3"
				use:enhance={withToast('Saved privately', {
					busy: (b) => (busy = b),
					onSuccess: () => (editing = false)
				})}
			>
				<div class="space-y-1">
					<Label for="mm-band">Your yearly income (before tax)</Label>
					<select id="mm-band" name="band" class={selectClass} required bind:value={band}>
						<option value="" disabled>Choose a range</option>
						{#each INCOME_BANDS as b (b.value)}<option value={b.value}>{b.label}</option>{/each}
					</select>
					<p class="text-xs text-muted-foreground">A range, never an exact salary.</p>
				</div>
				<label class="flex items-start gap-2">
					<input type="checkbox" name="shareForSplit" class="mt-1" bind:checked={share} />
					<span>
						Use my range to suggest a fair family split
						<span class="block text-xs text-muted-foreground">
							Only works if {otherName} turns it on too. Your range stays hidden, but a suggested split
							like 65/35 shows the rough ratio of your incomes.
						</span>
					</span>
				</label>
				<div class="flex flex-wrap gap-2">
					<Button type="submit" size="sm" disabled={busy || !band}>Save</Button>
					<Button type="button" size="sm" variant="ghost" onclick={() => (editing = false)}
						>Cancel</Button
					>
				</div>
			</form>
		{:else}
			<div class="flex flex-wrap items-center gap-2">
				{#if money.bandLabel}
					<span class="text-muted-foreground">Your range: {money.bandLabel}</span>
				{/if}
				<Button size="sm" variant="outline" onclick={edit}>
					{money.band ? 'Change' : 'Add my income range'}
				</Button>
				{#if money.band}
					<form method="POST" action="?/incomeDelete" use:enhance={withToast('Removed')}>
						<Button type="submit" size="sm" variant="ghost">Remove</Button>
					</form>
				{/if}
			</div>
			{#if money.band}
				<p class="text-xs text-muted-foreground">
					Fair-split suggestion: {money.shareForSplit
						? money.otherOptedIn
							? 'on for both of you'
							: `on for you, waiting for ${otherName}`
						: 'off'}.
				</p>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>

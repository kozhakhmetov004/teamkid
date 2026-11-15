<script lang="ts">
	/**
	 * The family's default split. One parent proposes, the other accepts; then
	 * "Family split" is preselected for new expenses. The income-based
	 * suggestion only exists when BOTH parents opted in (see MyMoneyCard).
	 */
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import AnswerButtons from './AnswerButtons.svelte';
	import { withToast } from './submit.js';
	import type { FamilySplitView } from './types.js';

	let {
		split,
		otherName,
		suggestion = null,
		canShare = true
	}: {
		split: FamilySplitView;
		otherName: string;
		/** my % from both income ranges (both opted in), or null */
		suggestion?: number | null;
		canShare?: boolean;
	} = $props();

	let editing = $state(false);
	let myPct = $state(50);
	let busy = $state(false);
</script>

<Card.Root id="family-split">
	<Card.Header>
		<Card.Title>Family split</Card.Title>
		<Card.Description>The usual way you share costs. Both of you agree to it.</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4 text-sm">
		{#if split.agreed}
			<p class="text-lg">
				You <strong>{split.agreed.myPct}%</strong> · {otherName}
				<strong>{split.agreed.otherPct}%</strong>
			</p>
			<p class="text-muted-foreground">
				Agreed {split.agreed.whenLabel}{split.agreed.basis === 'income'
					? ', based on both incomes'
					: ''}. New expenses use it unless you pick another split.
			</p>
		{:else}
			<p class="text-muted-foreground">No family split yet. Each expense picks its own.</p>
		{/if}

		{#if split.proposal}
			<div class="space-y-2 rounded-lg border p-3">
				<p>
					{split.proposal.mine ? 'You proposed' : `${split.proposal.by} proposed`}: you
					<strong>{split.proposal.myPct}%</strong> · {otherName}
					<strong>{split.proposal.otherPct}%</strong>
					{#if split.proposal.basis === 'income'}<span class="text-muted-foreground">
							(from both incomes)</span
						>{/if}
				</p>
				{#if split.proposal.mine}
					<p class="text-muted-foreground">Waiting for {otherName}.</p>
					<AnswerButtons
						formAction="?/splitRespond"
						id={split.proposal.id}
						options={[{ action: 'cancel', label: 'Withdraw', variant: 'ghost', done: 'Withdrawn' }]}
					/>
				{:else}
					<AnswerButtons
						formAction="?/splitRespond"
						id={split.proposal.id}
						options={[
							{ action: 'accept', label: 'Accept', done: 'Family split agreed' },
							{ action: 'decline', label: 'Decline', variant: 'outline', done: 'Declined' }
						]}
					/>
				{/if}
			</div>
		{:else if canShare}
			{#if suggestion !== null}
				<div class="space-y-2 rounded-lg bg-secondary p-3">
					<p>
						Based on both income ranges, a fair split is about: you <strong>{suggestion}%</strong>
						· {otherName} <strong>{100 - suggestion}%</strong>.
					</p>
					<form
						method="POST"
						action="?/splitPropose"
						use:enhance={withToast(`Proposed to ${otherName}`, { busy: (b) => (busy = b) })}
					>
						<input type="hidden" name="myPct" value={suggestion} />
						<input type="hidden" name="basis" value="income" />
						<Button type="submit" size="sm" disabled={busy}>Propose this split</Button>
					</form>
				</div>
			{/if}
			{#if editing}
				<form
					method="POST"
					action="?/splitPropose"
					class="flex flex-wrap items-end gap-3"
					use:enhance={withToast(`Proposed to ${otherName}`, {
						busy: (b) => (busy = b),
						onSuccess: () => (editing = false)
					})}
				>
					<div class="space-y-1">
						<Label for="fs-pct">Your share (%)</Label>
						<Input
							id="fs-pct"
							name="myPct"
							type="number"
							min="0"
							max="100"
							step="1"
							class="w-28"
							bind:value={myPct}
						/>
					</div>
					<p class="pb-2 text-muted-foreground">{otherName}: {100 - (Number(myPct) || 0)}%</p>
					<input type="hidden" name="basis" value="custom" />
					<Button type="submit" size="sm" disabled={busy}>Propose</Button>
					<Button type="button" size="sm" variant="ghost" onclick={() => (editing = false)}
						>Cancel</Button
					>
				</form>
			{:else}
				<Button size="sm" variant="outline" onclick={() => (editing = true)}>
					{split.agreed ? 'Propose a change' : 'Propose a split'}
				</Button>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>

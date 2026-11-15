<script lang="ts">
	/**
	 * Monthly costs (daycare, tuition, insurance…). Set up once; the other
	 * parent approves the rule once; then each month's expense is logged
	 * automatically as approved. Either parent can stop future months.
	 */
	import { enhance } from '$app/forms';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { CATEGORIES } from '#lib/expenses/categories.js';
	import type { SplitPreset } from '#lib/expenses/split.js';
	import AnswerButtons from './AnswerButtons.svelte';
	import SplitPicker from './SplitPicker.svelte';
	import { selectClass, withToast } from './submit.js';
	import type { RecurringView } from './types.js';

	let {
		rules,
		otherName,
		children = [],
		familyPct = null
	}: {
		rules: RecurringView[];
		otherName: string;
		children?: { id: string; first_name: string }[];
		familyPct?: number | null;
	} = $props();

	let open = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let preset = $state<SplitPreset>('50');
	let customPct = $state('');

	function add() {
		error = null;
		preset = familyPct !== null ? 'family' : '50';
		customPct = '';
		open = true;
	}

	const waiting = $derived(rules.filter((r) => r.can.approve).length);
</script>

<Card.Root id="monthly">
	<Card.Header>
		<div class="flex flex-wrap items-start justify-between gap-2">
			<div>
				<Card.Title class="flex items-center gap-2">
					Monthly costs
					{#if waiting}<Badge>{waiting} to approve</Badge>{/if}
				</Card.Title>
				<Card.Description>Set it up once. Each month is logged for you.</Card.Description>
			</div>
			<Button size="sm" variant="outline" onclick={add}>Add a monthly cost</Button>
		</div>
	</Card.Header>
	<Card.Content>
		{#if rules.length === 0}
			<p class="text-sm text-muted-foreground">
				Daycare, tuition, a phone plan? Add it once instead of logging it every month.
			</p>
		{:else}
			<ul class="divide-y">
				{#each rules as r (r.id)}
					<li class="flex flex-wrap items-center justify-between gap-3 py-3">
						<div class="min-w-0">
							<p class="font-medium">
								<span aria-hidden="true">{r.categoryIcon}</span>
								{r.title} · {r.amount}/month
							</p>
							<p class="text-sm text-muted-foreground">
								{r.splitLabel} · your part {r.myPart} · day {r.dayOfMonth}
								{#if r.status === 'active' && r.nextLabel}· next {r.nextLabel}{/if}
								{#if r.status === 'pending'}
									· {r.mine ? `waiting for ${otherName}` : `${r.createdBy} added this`}{/if}
							</p>
						</div>
						<AnswerButtons
							formAction="?/recurringRespond"
							id={r.id}
							options={[
								...(r.can.approve
									? [{ action: 'approve', label: 'Approve', done: 'Monthly cost approved' }]
									: []),
								...(r.can.decline
									? [
											{
												action: 'decline',
												label: 'Decline',
												variant: 'outline' as const,
												done: 'Declined'
											}
										]
									: []),
								...(r.can.stop
									? [
											{
												action: 'stop',
												label: r.status === 'pending' ? 'Withdraw' : 'Stop future months',
												variant: 'ghost' as const,
												done: 'Stopped. Past months stay as they are.'
											}
										]
									: [])
							]}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add a monthly cost</Dialog.Title>
			<Dialog.Description>
				{otherName} approves it once. After that, each month is logged automatically.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/recurringCreate"
			class="grid gap-3 sm:grid-cols-2"
			use:enhance={withToast('Monthly cost added', {
				busy: (b) => (busy = b),
				onSuccess: () => (open = false),
				onError: (m) => (error = m)
			})}
		>
			<div class="space-y-1 sm:col-span-2">
				<Label for="rc-title">What is it?</Label>
				<Input
					id="rc-title"
					name="title"
					required
					maxlength={80}
					placeholder="e.g. After-school club"
				/>
			</div>
			<div class="space-y-1">
				<Label for="rc-amount">Amount per month ($)</Label>
				<Input id="rc-amount" name="amount" inputmode="decimal" required placeholder="120.00" />
			</div>
			<div class="space-y-1">
				<Label for="rc-day">Day of the month (1–28)</Label>
				<Input id="rc-day" name="dayOfMonth" type="number" min="1" max="28" required value="1" />
			</div>
			<div class="space-y-1">
				<Label for="rc-category">Category</Label>
				<select id="rc-category" name="category" class={selectClass} value="childcare">
					{#each CATEGORIES as c (c.value)}<option value={c.value}>{c.icon} {c.label}</option
						>{/each}
				</select>
			</div>
			<div class="space-y-1">
				<Label for="rc-child">Child</Label>
				<select id="rc-child" name="childId" class={selectClass} value={children[0]?.id ?? ''}>
					<option value="">Whole family</option>
					{#each children as c (c.id)}<option value={c.id}>{c.first_name}</option>{/each}
				</select>
			</div>
			<div class="space-y-3 sm:col-span-2">
				<SplitPicker {otherName} {familyPct} bind:preset bind:customPct />
			</div>
			{#if error}<p role="alert" class="text-sm text-destructive sm:col-span-2">{error}</p>{/if}
			<Dialog.Footer class="sm:col-span-2">
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

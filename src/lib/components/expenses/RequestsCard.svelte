<script lang="ts">
	/**
	 * "Ask before spending": agree on a cost BEFORE paying it. The other parent
	 * approves or declines (with a note); an approved request becomes an
	 * expense that is already approved (within 10% of the estimate).
	 */
	import { enhance } from '$app/forms';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { CATEGORIES } from '#lib/expenses/categories.js';
	import { planImpactPct } from '#lib/expenses/income.js';
	import { formatCents, parseDollars } from '#lib/expenses/money.js';
	import { makeSplit, otherShareCents, type SplitPreset } from '#lib/expenses/split.js';
	import AnswerButtons from './AnswerButtons.svelte';
	import SplitPicker from './SplitPicker.svelte';
	import { selectClass, withToast } from './submit.js';
	import type { RequestView } from './types.js';

	let {
		requests,
		otherName,
		children = [],
		familyPct = null,
		band = null,
		canShare = true,
		onLog
	}: {
		requests: RequestView[];
		otherName: string;
		children?: { id: string; first_name: string }[];
		familyPct?: number | null;
		/** MY private income range (only used to show me the impact) */
		band?: string | null;
		canShare?: boolean;
		onLog: (r: RequestView) => void;
	} = $props();

	let open = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let estimate = $state('');
	let preset = $state<SplitPreset>('50');
	let customPct = $state('');

	// Live "your part" while typing (same maths as the server).
	const myPart = $derived.by(() => {
		const cents = parseDollars(estimate);
		const split =
			preset === 'family'
				? familyPct === null
					? null
					: makeSplit('family', familyPct)
				: makeSplit(preset, customPct ? Number(customPct) : undefined);
		if (!cents || !split) return null;
		return cents - otherShareCents(cents, split);
	});
	const impact = $derived(myPart === null ? null : planImpactPct(myPart, band));

	function ask() {
		error = null;
		estimate = '';
		preset = familyPct !== null ? 'family' : '50';
		customPct = '';
		open = true;
	}

	const waiting = $derived(requests.filter((r) => r.status === 'pending' && !r.mine).length);
</script>

<Card.Root id="requests">
	<Card.Header>
		<div class="flex flex-wrap items-start justify-between gap-2">
			<div>
				<Card.Title class="flex items-center gap-2">
					Ask before spending
					{#if waiting}<Badge>{waiting} to answer</Badge>{/if}
				</Card.Title>
				<Card.Description>
					Agree on bigger costs first, like a camp or new glasses. No surprises later.
				</Card.Description>
			</div>
			<Button size="sm" onclick={ask} disabled={!canShare}>Ask {otherName}</Button>
		</div>
	</Card.Header>
	<Card.Content>
		{#if requests.length === 0}
			<p class="text-sm text-muted-foreground">
				No requests yet. Ask {otherName} before a big purchase, and once they say yes it's already approved
				when you log it.
			</p>
		{:else}
			<ul class="divide-y">
				{#each requests as r (r.id)}
					<li class="space-y-2 py-3">
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<p class="font-medium">
								<span aria-hidden="true">{r.categoryIcon}</span>
								{r.title}
								<span class="text-sm font-normal text-muted-foreground"
									>· about {r.estimate} · {r.splitLabel}{r.childName
										? ` · ${r.childName}`
										: ''}</span
								>
							</p>
							<span class="text-xs text-muted-foreground"
								>{r.mine ? 'You asked' : `${r.requestedBy} asked`} · {r.whenLabel}</span
							>
						</div>
						<p class="text-sm">
							<span
								class="rounded-full border px-2 py-0.5 text-xs {r.status === 'approved'
									? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
									: r.status === 'declined'
										? 'border-destructive text-destructive'
										: ''}">{r.statusLabel}</span
							>
							<span class="ms-2 text-muted-foreground">Your part: {r.myPart}</span>
						</p>
						{#if r.note}<p class="text-sm text-muted-foreground">“{r.note}”</p>{/if}
						{#if r.responseNote}
							<p class="text-sm">
								<span class="text-muted-foreground">{r.mine ? otherName : 'You'} said:</span>
								“{r.responseNote}”
							</p>
						{/if}
						{#if r.can.approve || r.can.cancel || r.can.log}
							<div class="flex flex-wrap gap-2">
								{#if r.can.log}
									<Button size="sm" onclick={() => onLog(r)}>Log what it cost</Button>
								{/if}
								{#if r.can.approve}
									<AnswerButtons
										formAction="?/requestRespond"
										id={r.id}
										options={[
											{ action: 'approve', label: 'Yes, go ahead', done: 'Approved' },
											{
												action: 'decline',
												label: 'Not this time',
												variant: 'outline',
												note: true,
												done: 'Answer sent'
											}
										]}
									/>
								{/if}
								{#if r.can.cancel}
									<AnswerButtons
										formAction="?/requestRespond"
										id={r.id}
										options={[
											{
												action: 'cancel',
												label: 'Cancel',
												variant: 'ghost',
												done: 'Request cancelled'
											}
										]}
									/>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Ask {otherName} before spending</Dialog.Title>
			<Dialog.Description>
				{otherName} can say yes or explain why not. Nothing is spent yet.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/requestCreate"
			class="grid gap-3 sm:grid-cols-2"
			use:enhance={withToast(`Sent to ${otherName}`, {
				busy: (b) => (busy = b),
				onSuccess: () => (open = false),
				onError: (m) => (error = m)
			})}
		>
			<div class="space-y-1 sm:col-span-2">
				<Label for="rq-title">What is it for?</Label>
				<Input
					id="rq-title"
					name="title"
					required
					maxlength={80}
					placeholder="e.g. Soccer season"
				/>
			</div>
			<div class="space-y-1">
				<Label for="rq-estimate">About how much ($)</Label>
				<Input
					id="rq-estimate"
					name="estimate"
					inputmode="decimal"
					required
					placeholder="180.00"
					bind:value={estimate}
				/>
			</div>
			<div class="space-y-1">
				<Label for="rq-category">Category</Label>
				<select id="rq-category" name="category" class={selectClass} value="activities">
					{#each CATEGORIES as c (c.value)}<option value={c.value}>{c.icon} {c.label}</option
						>{/each}
				</select>
			</div>
			<div class="space-y-1 sm:col-span-2">
				<Label for="rq-child">Child</Label>
				<select id="rq-child" name="childId" class={selectClass} value={children[0]?.id ?? ''}>
					<option value="">Whole family</option>
					{#each children as c (c.id)}<option value={c.id}>{c.first_name}</option>{/each}
				</select>
			</div>
			<div class="space-y-3 sm:col-span-2">
				<SplitPicker {otherName} {familyPct} hideMeOnly bind:preset bind:customPct />
			</div>
			<div class="space-y-1 sm:col-span-2">
				<Label for="rq-note">Why (optional)</Label>
				<Input
					id="rq-note"
					name="note"
					maxlength={280}
					placeholder="She asked to join her friends"
				/>
			</div>
			{#if myPart !== null}
				<p class="rounded-lg bg-secondary p-3 text-sm sm:col-span-2">
					Your part would be <strong>{formatCents(myPart)}</strong>{#if impact !== null}, about
						<strong>{impact}%</strong> of your monthly income{/if}.
					<span class="block text-xs text-muted-foreground">Only you see this line.</span>
				</p>
			{/if}
			{#if error}<p role="alert" class="text-sm text-destructive sm:col-span-2">{error}</p>{/if}
			<Dialog.Footer class="sm:col-span-2">
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { CATEGORIES } from '#lib/expenses/categories.js';
	import type { SplitPreset } from '#lib/expenses/split.js';
	import ReceiptUpload from './ReceiptUpload.svelte';
	import SplitPicker from './SplitPicker.svelte';
	import type { ExpenseView } from './types.js';

	/** Log an expense, or re-submit a disputed one with new amount/split. */
	let {
		open = $bindable(false),
		familyId,
		otherName,
		today,
		children = [],
		resubmitOf = null
	}: {
		open?: boolean;
		familyId: string;
		otherName: string;
		today: string;
		children?: { id: string; first_name: string }[];
		resubmitOf?: ExpenseView | null;
	} = $props();

	let pending = $state(false);
	let uploading = $state(false);
	let error = $state<string | null>(null);
	let fieldErrors = $state<Record<string, string>>({});
	let preset = $state<SplitPreset>('50');
	let customPct = $state('');
	let receiptPath = $state('');

	$effect(() => {
		if (open) {
			error = null;
			fieldErrors = {};
			receiptPath = resubmitOf?.receiptPath ?? '';
			if (resubmitOf) {
				const p = resubmitOf.payerPct;
				preset =
					p === 50
						? '50'
						: p === 60
							? '60'
							: p === 70
								? '70'
								: p === 0
									? 'other'
									: p === 100
										? 'me'
										: 'custom';
				customPct = String(p);
			} else {
				preset = '50';
				customPct = '';
			}
		}
	});

	const selectClass =
		'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{resubmitOf ? 'Re-submit expense' : 'Log an expense'}</Dialog.Title>
			<Dialog.Description>
				{resubmitOf
					? 'This creates a new expense linked to the disputed one, which is cancelled.'
					: `${otherName} will see it and can approve it. Nothing is edited or deleted later.`}
			</Dialog.Description>
		</Dialog.Header>

		{#key open}
			<form
				method="POST"
				action={resubmitOf ? '?/resubmit' : '?/create'}
				class="grid gap-3 sm:grid-cols-2"
				use:enhance={() => {
					pending = true;
					error = null;
					return async ({ result, update }) => {
						pending = false;
						if (result.type === 'success') {
							toast.success(resubmitOf ? 'Expense re-submitted' : 'Expense logged');
							open = false;
							await update();
						} else if (result.type === 'failure') {
							error = String(result.data?.message ?? 'Please check the form.');
							fieldErrors = (result.data?.errors as Record<string, string>) ?? {};
						} else {
							await update();
						}
					};
				}}
			>
				{#if resubmitOf}<input type="hidden" name="resubmitOf" value={resubmitOf.id} />{/if}
				<div class="space-y-1 sm:col-span-2">
					<Label for="ex-title">What was it?</Label>
					<Input
						id="ex-title"
						name="title"
						required
						maxlength={80}
						placeholder="e.g. Zoo tickets"
						value={resubmitOf?.title ?? ''}
					/>
					{#if fieldErrors.title}<p class="text-xs text-destructive">{fieldErrors.title}</p>{/if}
				</div>
				<div class="space-y-1">
					<Label for="ex-amount">Amount ($)</Label>
					<Input
						id="ex-amount"
						name="amount"
						inputmode="decimal"
						required
						placeholder="38.00"
						value={resubmitOf ? (resubmitOf.amountCents / 100).toFixed(2) : ''}
					/>
					{#if fieldErrors.amount}<p class="text-xs text-destructive">{fieldErrors.amount}</p>{/if}
				</div>
				<div class="space-y-1">
					<Label for="ex-date">Date</Label>
					<Input
						id="ex-date"
						name="spentOn"
						type="date"
						required
						max={today}
						value={resubmitOf?.spentOn ?? today}
					/>
					{#if fieldErrors.spentOn}<p class="text-xs text-destructive">
							{fieldErrors.spentOn}
						</p>{/if}
				</div>
				<div class="space-y-1">
					<Label for="ex-category">Category</Label>
					<select
						id="ex-category"
						name="category"
						class={selectClass}
						value={resubmitOf?.category ?? 'activities'}
					>
						{#each CATEGORIES as c (c.value)}<option value={c.value}>{c.icon} {c.label}</option
							>{/each}
					</select>
				</div>
				<div class="space-y-1">
					<Label for="ex-child">Child</Label>
					<select
						id="ex-child"
						name="childId"
						class={selectClass}
						value={resubmitOf?.childId ?? children[0]?.id ?? ''}
					>
						<option value="">Whole family</option>
						{#each children as c (c.id)}<option value={c.id}>{c.first_name}</option>{/each}
					</select>
				</div>
				<div class="space-y-3 sm:col-span-2">
					<SplitPicker {otherName} bind:preset bind:customPct />
					{#if fieldErrors.split}<p class="text-xs text-destructive">{fieldErrors.split}</p>{/if}
				</div>
				<div class="space-y-1 sm:col-span-2">
					<Label for="ex-note">Note (optional)</Label>
					<Input id="ex-note" name="note" maxlength={280} value={resubmitOf?.note ?? ''} />
				</div>
				<div class="sm:col-span-2">
					{#if resubmitOf?.receiptPath}
						<p class="text-xs text-muted-foreground">The original receipt stays attached.</p>
						<input type="hidden" name="receiptPath" value={resubmitOf.receiptPath} />
					{:else}
						<ReceiptUpload {familyId} bind:path={receiptPath} bind:busy={uploading} />
					{/if}
				</div>
				{#if error}<p role="alert" class="text-sm text-destructive sm:col-span-2">{error}</p>{/if}
				<Dialog.Footer class="sm:col-span-2">
					<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
					<Button type="submit" disabled={pending || uploading}>
						{pending
							? 'Saving…'
							: uploading
								? 'Uploading receipt…'
								: resubmitOf
									? 'Re-submit'
									: 'Log expense'}
					</Button>
				</Dialog.Footer>
			</form>
		{/key}
	</Dialog.Content>
</Dialog.Root>

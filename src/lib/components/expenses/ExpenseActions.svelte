<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { checkTone } from '#lib/components/messages/toneCheck.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import type { ExpenseView } from './types.js';

	/**
	 * Approve / Dispute / Cancel / Mark as reimbursed / Re-submit.
	 * All status changes post to ?/respond, which calls respond_to_expense().
	 * The dispute note gets the same tone check as messages (never blocking).
	 */
	let { expense, onResubmit }: { expense: ExpenseView; onResubmit: (e: ExpenseView) => void } =
		$props();

	let pending = $state(false);
	let disputeOpen = $state(false);
	let note = $state('');
	let checking = $state(false);
	let calmer = $state<string | null>(null);
	let noteChecked = false;
	let disputeForm: HTMLFormElement | undefined = $state();

	const respond = () => {
		pending = true;
		return async ({ result }: { result: { type: string; data?: Record<string, unknown> } }) => {
			pending = false;
			if (result.type === 'success') {
				toast.success(String(result.data?.message ?? 'Done'));
				disputeOpen = false;
				note = '';
				await Promise.all([invalidate('app:expenses'), invalidate('app:today')]);
			} else if (result.type === 'failure') {
				toast.error(String(result.data?.message ?? 'Something went wrong.'));
			}
		};
	};
</script>

<div class="flex flex-wrap gap-2">
	{#if expense.can.approve}
		<form method="POST" action="?/respond" use:enhance={respond}>
			<input type="hidden" name="expenseId" value={expense.id} />
			<input type="hidden" name="action" value="approve" />
			<Button type="submit" size="sm" disabled={pending}>Approve</Button>
		</form>
	{/if}
	{#if expense.can.dispute}
		<Button size="sm" variant="outline" disabled={pending} onclick={() => (disputeOpen = true)}
			>Dispute</Button
		>
	{/if}
	{#if expense.can.reimburse}
		<form method="POST" action="?/respond" use:enhance={respond}>
			<input type="hidden" name="expenseId" value={expense.id} />
			<input type="hidden" name="action" value="reimburse" />
			<Button type="submit" size="sm" disabled={pending}>Mark as reimbursed</Button>
		</form>
	{/if}
	{#if expense.can.resubmit}
		<Button size="sm" variant="outline" disabled={pending} onclick={() => onResubmit(expense)}
			>Re-submit</Button
		>
	{/if}
	{#if expense.can.cancel}
		<form
			method="POST"
			action="?/respond"
			use:enhance={({ cancel }) => {
				if (!confirm('Cancel this expense? It stays in the record as cancelled.')) return cancel();
				return respond();
			}}
		>
			<input type="hidden" name="expenseId" value={expense.id} />
			<input type="hidden" name="action" value="cancel" />
			<Button type="submit" size="sm" variant="ghost" disabled={pending}>Cancel</Button>
		</form>
	{/if}
</div>

<Dialog.Root bind:open={disputeOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Dispute “{expense.title}”</Dialog.Title>
			<Dialog.Description
				>Say briefly what doesn't look right. {expense.paidBy} can cancel or re-submit it.</Dialog.Description
			>
		</Dialog.Header>
		<form
			bind:this={disputeForm}
			method="POST"
			action="?/respond"
			class="space-y-3"
			use:enhance={(input) => {
				const text = note.trim();
				if (text && !noteChecked) {
					input.cancel();
					checking = true;
					void checkTone(text).then((r) => {
						checking = false;
						if (r.status === 'ok' && r.changed) calmer = r.rewritten;
						else {
							noteChecked = true;
							disputeForm?.requestSubmit();
						}
					});
					return;
				}
				noteChecked = false;
				return respond();
			}}
		>
			<input type="hidden" name="expenseId" value={expense.id} />
			<input type="hidden" name="action" value="dispute" />
			<div class="space-y-1">
				<Label for="dispute-note">Reason (5–280 characters)</Label>
				<textarea
					id="dispute-note"
					name="note"
					bind:value={note}
					required
					minlength="5"
					maxlength="280"
					rows="3"
					class="w-full rounded-lg border border-input bg-background p-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				></textarea>
			</div>
			{#if calmer}
				<div
					class="space-y-2 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground"
					role="status"
				>
					<p class="font-medium">A calmer version:</p>
					<p class="whitespace-pre-wrap">{calmer}</p>
					<div class="flex gap-2">
						<Button
							type="button"
							size="sm"
							onclick={() => {
								note = calmer ?? note;
								calmer = null;
								noteChecked = true;
								disputeForm?.requestSubmit();
							}}>Use calmer note</Button
						>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onclick={() => {
								calmer = null;
								noteChecked = true;
								disputeForm?.requestSubmit();
							}}>Keep mine</Button
						>
					</div>
				</div>
			{/if}
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (disputeOpen = false)}>Back</Button>
				<Button type="submit" disabled={pending || checking || !!calmer}>
					{checking ? 'Checking tone…' : pending ? 'Sending…' : 'Send dispute'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

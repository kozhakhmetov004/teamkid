<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { checkTone } from '#lib/components/messages/toneCheck.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { swapSubmit } from './swapSubmit.js';
	import type { SwapWindow } from './types.js';

	/**
	 * Request (or counter) a swap: "Give <other> the night of X, take the night
	 * of Y instead". The optional note gets the same tone check as messages;
	 * AI problems never block sending.
	 */
	let {
		open = $bindable(false),
		mode = 'create',
		swapId = null,
		originalDate = '',
		proposedDate = '',
		otherName,
		window: range
	}: {
		open?: boolean;
		mode?: 'create' | 'counter';
		swapId?: string | null;
		originalDate?: string;
		proposedDate?: string;
		otherName: string;
		window: SwapWindow;
	} = $props();

	let formEl: HTMLFormElement | undefined = $state();
	let original = $state('');
	let proposed = $state('');
	let note = $state('');
	let error = $state<string | null>(null);
	let pending = $state(false);
	let checking = $state(false);
	let calmerNote = $state<string | null>(null);
	let noteChecked = false;

	$effect(() => {
		if (open) {
			original = originalDate;
			proposed = proposedDate;
			note = '';
			error = null;
			calmerNote = null;
			noteChecked = false;
		}
	});

	async function submitNow() {
		noteChecked = true;
		await tick();
		formEl?.requestSubmit();
	}

	const handler = swapSubmit({
		setPending: (p) => (pending = p),
		onSuccess: () => (open = false),
		onFailure: (message) => (error = message)
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title
				>{mode === 'counter' ? 'Suggest different nights' : 'Request a swap'}</Dialog.Title
			>
			<Dialog.Description>
				{otherName} gets a request to accept or decline. The calendar changes only after they accept.
			</Dialog.Description>
		</Dialog.Header>

		<form
			bind:this={formEl}
			method="POST"
			action="/calendar/swap?/{mode === 'counter' ? 'counter' : 'create'}"
			class="space-y-4"
			use:enhance={(input) => {
				error = null;
				const text = note.trim();
				if (text && !noteChecked) {
					input.cancel();
					checking = true;
					void checkTone(text).then((result) => {
						checking = false;
						if (result.status === 'ok' && result.changed) calmerNote = result.rewritten;
						else void submitNow();
					});
					return;
				}
				noteChecked = false;
				return handler(input);
			}}
		>
			{#if mode === 'counter' && swapId}<input type="hidden" name="swapId" value={swapId} />{/if}
			<div class="space-y-2">
				<Label for="swap-original">You give {otherName} the night of</Label>
				<Input
					id="swap-original"
					name="originalDate"
					type="date"
					required
					min={range.min}
					max={range.max}
					bind:value={original}
				/>
			</div>
			<div class="space-y-2">
				<Label for="swap-proposed">And take this night instead (optional)</Label>
				<Input
					id="swap-proposed"
					name="proposedDate"
					type="date"
					min={range.min}
					max={range.max}
					bind:value={proposed}
				/>
			</div>
			<div class="space-y-2">
				<Label for="swap-note">Note (optional)</Label>
				<textarea
					id="swap-note"
					name="note"
					bind:value={note}
					maxlength="280"
					rows="2"
					placeholder="e.g. Work trip on Saturday"
					class="w-full rounded-lg border border-input bg-background p-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				></textarea>
			</div>

			{#if calmerNote}
				<div
					class="space-y-2 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground"
					role="status"
				>
					<p class="font-medium">A calmer note:</p>
					<p class="whitespace-pre-wrap">{calmerNote}</p>
					<div class="flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							onclick={() => {
								note = calmerNote ?? note;
								calmerNote = null;
								void submitNow();
							}}>Use calmer note</Button
						>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onclick={() => {
								calmerNote = null;
								void submitNow();
							}}>Keep mine</Button
						>
					</div>
				</div>
			{/if}

			{#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={pending || checking || !!calmerNote}>
					{checking ? 'Checking note…' : pending ? 'Sending…' : 'Send request'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { EVENT_KINDS, type CalEvent } from './types.js';

	/** Add or edit a (non-custody) event. Custody nights change only through swaps. */
	let {
		open = $bindable(false),
		event = null,
		defaultDate,
		children = []
	}: {
		open?: boolean;
		event?: CalEvent | null;
		defaultDate: string;
		children?: { id: string; first_name: string }[];
	} = $props();

	let pending = $state(false);
	// "Show to Lily": on by default; off hides it from the child (surprises).
	let kidVisible = $state(true);
	const kidName = $derived(children[0]?.first_name ?? 'your child');
	let error = $state<string | null>(null);
	let fieldErrors = $state<Record<string, string>>({});
	let confirmDelete = $state(false);
	let deleting = $state(false);
	/** Someone else's event: shown read-only (the server and RLS refuse changes too). */
	const readOnly = $derived(!!event && event.canEdit === false);

	$effect(() => {
		if (open) {
			kidVisible = event?.kidVisible ?? true;
			error = null;
			fieldErrors = {};
			confirmDelete = false;
		}
	});

	const selectClass =
		'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{readOnly ? event?.title : event ? 'Edit event' : 'Add event'}</Dialog.Title>
			<Dialog.Description>
				{#if readOnly}
					Added by {event?.addedBy ?? 'your co-parent'}. Only they can change or delete it.
				{:else}
					Both parents see calendar events.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#key open}
			<form
				method="POST"
				action={event ? '?/updateEvent' : '?/createEvent'}
				class="grid gap-3 sm:grid-cols-2"
				use:enhance={() => {
					pending = true;
					return async ({ result, update }) => {
						pending = false;
						deleting = false;
						if (result.type === 'success') {
							toast.success(
								result.data?.deleted ? 'Event deleted' : event ? 'Event updated' : 'Event added'
							);
							open = false;
							await update({ reset: false });
						} else if (result.type === 'failure') {
							error = String(result.data?.message ?? 'Please check the form.');
							fieldErrors = (result.data?.errors as Record<string, string>) ?? {};
						} else {
							await update();
						}
					};
				}}
			>
				{#if event}<input type="hidden" name="id" value={event.id} />{/if}
				<fieldset disabled={readOnly} class="contents">
					<div class="space-y-1 sm:col-span-2">
						<Label for="ev-title">Title</Label>
						<Input id="ev-title" name="title" required maxlength={200} value={event?.title ?? ''} />
						{#if fieldErrors.title}<p class="text-xs text-destructive">{fieldErrors.title}</p>{/if}
					</div>
					<div class="space-y-1">
						<Label for="ev-date">Date</Label>
						<Input
							id="ev-date"
							name="date"
							type="date"
							required
							value={event?.date ?? defaultDate}
						/>
					</div>
					<div class="space-y-1">
						<Label for="ev-kind">Type</Label>
						<select id="ev-kind" name="kind" class={selectClass} value={event?.kind ?? 'activity'}>
							{#each EVENT_KINDS as k (k.value)}<option value={k.value}>{k.label}</option>{/each}
						</select>
					</div>
					<div class="space-y-1">
						<Label for="ev-start">Starts</Label>
						<Input
							id="ev-start"
							name="start"
							type="time"
							required
							value={event?.start ?? '09:00'}
						/>
					</div>
					<div class="space-y-1">
						<Label for="ev-end">Ends</Label>
						<Input id="ev-end" name="end" type="time" required value={event?.end ?? '10:00'} />
						{#if fieldErrors.end}<p class="text-xs text-destructive">{fieldErrors.end}</p>{/if}
					</div>
					<div class="space-y-1">
						<Label for="ev-place">Place</Label>
						<Input id="ev-place" name="place" maxlength={200} value={event?.place ?? ''} />
					</div>
					<div class="space-y-1">
						<Label for="ev-child">Child</Label>
						<select
							id="ev-child"
							name="childId"
							class={selectClass}
							value={event?.childId ?? children[0]?.id ?? ''}
						>
							<option value="">Whole family</option>
							{#each children as c (c.id)}<option value={c.id}>{c.first_name}</option>{/each}
						</select>
					</div>
					<div class="space-y-1 sm:col-span-2">
						<Label for="ev-notes">Notes</Label>
						<textarea
							id="ev-notes"
							name="notes"
							rows="2"
							maxlength="2000"
							class="w-full rounded-lg border border-input bg-background p-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
							>{event?.notes ?? ''}</textarea
						>
					</div>
					<label
						class="flex items-start gap-3 rounded-lg border p-3 text-sm sm:col-span-2 {kidVisible
							? ''
							: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'}"
					>
						<input
							type="checkbox"
							name="kidVisible"
							value="yes"
							bind:checked={kidVisible}
							class="mt-0.5 size-4 accent-primary"
						/>
						<span>
							{#if kidVisible}
								<span class="font-medium"
									><span aria-hidden="true">👀</span> {kidName} can see this</span
								>
								<span class="block text-muted-foreground"
									>Shown in {kidName}'s calendar. Untick to keep it a surprise.</span
								>
							{:else}
								<span class="font-medium"
									><span aria-hidden="true">🤫</span> Surprise: hidden from {kidName}</span
								>
								<span class="block text-muted-foreground"
									>{kidName} won't see this event. Only you and your co-parent will.</span
								>
							{/if}
						</span>
					</label>
				</fieldset>
				{#if error}<p role="alert" class="text-sm text-destructive sm:col-span-2">{error}</p>{/if}
				{#if confirmDelete}
					<div
						role="alertdialog"
						aria-labelledby="ev-del-q"
						class="space-y-3 rounded-lg bg-destructive/10 p-3 text-sm sm:col-span-2"
					>
						<p id="ev-del-q" class="font-medium">
							Are you sure you want to delete “{event?.title}”? This can't be undone.
						</p>
						<div class="flex flex-wrap justify-end gap-2">
							<Button type="button" variant="outline" onclick={() => (confirmDelete = false)}
								>Cancel</Button
							>
							<Button
								type="submit"
								variant="destructive"
								formaction="?/deleteEvent"
								formnovalidate
								disabled={deleting}
								onclick={() => (deleting = true)}>{deleting ? 'Deleting…' : 'Yes, delete'}</Button
							>
						</div>
					</div>
				{:else}
					<Dialog.Footer class="sm:col-span-2 sm:justify-between">
						{#if event && !readOnly}
							<Button
								type="button"
								variant="outline"
								class="text-destructive"
								onclick={() => (confirmDelete = true)}>Delete</Button
							>
						{:else}
							<span></span>
						{/if}
						<div class="flex gap-2">
							<Button type="button" variant="outline" onclick={() => (open = false)}
								>{readOnly ? 'Close' : 'Cancel'}</Button
							>
							{#if !readOnly}
								<Button type="submit" disabled={pending}
									>{pending ? 'Saving…' : event ? 'Save' : 'Add event'}</Button
								>
							{/if}
						</div>
					</Dialog.Footer>
				{/if}
			</form>
		{/key}
	</Dialog.Content>
</Dialog.Root>

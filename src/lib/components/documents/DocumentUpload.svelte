<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { uploadToDocuments, validateUpload } from '#lib/storage/upload.js';
	import { DOCUMENT_KINDS } from './types.js';

	/** Pick a file → direct upload to Storage → ?/register stores the row. */
	let { familyId }: { familyId: string } = $props();

	let file = $state<File | null>(null);
	let title = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);
	let formEl: HTMLFormElement | undefined = $state();
	let path = $state('');
	const selectClass =
		'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';

	function pick(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
		error = f ? validateUpload(f) : null;
		file = error ? null : f;
		if (file && !title) title = file.name.replace(/\.[^.]+$/, '').slice(0, 80);
	}
</script>

<form
	bind:this={formEl}
	method="POST"
	action="?/register"
	class="grid gap-4"
	use:enhance={async ({ cancel }) => {
		if (!path) {
			cancel();
			if (!file) {
				error = 'Choose a file first.';
				return;
			}
			busy = true;
			error = null;
			try {
				path = await uploadToDocuments(file, familyId, 'docs');
				// Re-submit now that the hidden path is set.
				queueMicrotask(() => formEl?.requestSubmit());
			} catch (err) {
				busy = false;
				error = err instanceof Error ? err.message : 'Upload failed.';
			}
			return;
		}
		return async ({ result, update }) => {
			busy = false;
			if (result.type === 'success') {
				toast.success('Document added');
				file = null;
				title = '';
				path = '';
				await update();
			} else if (result.type === 'failure') {
				path = '';
				error = String(result.data?.message ?? 'Could not add the document.');
			} else {
				await update();
			}
		};
	}}
>
	<input type="hidden" name="path" value={path} />
	<div class="space-y-1">
		<Label for="doc-file">File (PDF, PNG or JPEG, up to 10 MB)</Label>
		<input
			id="doc-file"
			type="file"
			accept="application/pdf,image/png,image/jpeg"
			onchange={pick}
			required
			class="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
		/>
	</div>
	<div class="space-y-1">
		<Label for="doc-title">Title</Label>
		<Input id="doc-title" name="title" required maxlength={80} bind:value={title} />
	</div>
	<div class="space-y-1">
		<Label for="doc-kind">Type</Label>
		<select id="doc-kind" name="kind" class={selectClass}>
			{#each DOCUMENT_KINDS.filter((k) => k.value !== 'receipt') as k (k.value)}<option
					value={k.value}>{k.icon} {k.label}</option
				>{/each}
		</select>
	</div>
	<div>
		<Button type="submit" class="w-full sm:w-auto" disabled={busy || !file}
			>{busy ? 'Uploading…' : 'Add document'}</Button
		>
	</div>
	{#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
</form>

<script lang="ts">
	import { Label } from '#lib/components/ui/label/index.js';
	import { uploadToDocuments, validateUpload } from '#lib/storage/upload.js';

	/**
	 * Picks a receipt (PDF/PNG/JPEG ≤ 10 MB) and uploads it straight to Storage.
	 * Posts the resulting path as a hidden `receiptPath` field.
	 */
	let {
		familyId,
		path = $bindable<string>(''),
		busy = $bindable(false)
	}: { familyId: string; path?: string; busy?: boolean } = $props();

	let error = $state<string | null>(null);
	let fileName = $state('');

	async function onChange(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		error = null;
		path = '';
		fileName = '';
		if (!file) return;
		const problem = validateUpload(file);
		if (problem) {
			error = problem;
			(e.currentTarget as HTMLInputElement).value = '';
			return;
		}
		busy = true;
		try {
			path = await uploadToDocuments(file, familyId, 'receipts');
			fileName = file.name;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload failed.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="space-y-1">
	<Label for="receipt">Receipt (optional)</Label>
	<input
		id="receipt"
		type="file"
		accept="application/pdf,image/png,image/jpeg"
		onchange={onChange}
		class="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
	/>
	<input type="hidden" name="receiptPath" value={path} />
	{#if busy}<p class="text-xs text-muted-foreground">Uploading…</p>{/if}
	{#if path && !busy}<p class="text-xs text-primary">✓ {fileName} uploaded</p>{/if}
	{#if error}<p class="text-xs text-destructive" role="alert">{error}</p>{/if}
</div>

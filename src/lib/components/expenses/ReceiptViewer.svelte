<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';

	/**
	 * Opens a stored file through a 60-second signed URL (never a public URL).
	 * Images show in a dialog; PDFs open in a new tab. Also used by the vault.
	 */
	let {
		path,
		label = 'Open',
		size = 'sm',
		variant = 'outline'
	}: {
		path: string;
		label?: string;
		size?: 'sm' | 'default';
		variant?: 'outline' | 'ghost' | 'default';
	} = $props();

	let open = $state(false);
	let imageUrl = $state<string | null>(null);
	let loading = $state(false);

	async function view() {
		loading = true;
		// Open the tab first (synchronously) so pop-up blockers allow it.
		const tab = path.toLowerCase().endsWith('.pdf') ? window.open('', '_blank') : null;
		try {
			const res = await fetch(`/documents/signed?path=${encodeURIComponent(path)}`);
			if (!res.ok) throw new Error();
			const { url, kind } = (await res.json()) as { url: string; kind: 'pdf' | 'image' };
			if (kind === 'pdf') {
				if (tab) tab.location.href = url;
				else window.open(url, '_blank', 'noopener');
			} else {
				tab?.close();
				imageUrl = url;
				open = true;
			}
		} catch {
			tab?.close();
			toast.error("Couldn't open the file. Please try again.");
		} finally {
			loading = false;
		}
	}
</script>

<Button type="button" {size} {variant} onclick={view} disabled={loading}>
	{loading ? 'Opening…' : label}
</Button>

<Dialog.Root bind:open onOpenChange={(o) => !o && (imageUrl = null)}>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Receipt</Dialog.Title>
			<Dialog.Description>This link works for one minute.</Dialog.Description>
		</Dialog.Header>
		{#if imageUrl}
			<img
				src={imageUrl}
				alt="Uploaded receipt"
				class="max-h-[70vh] w-full rounded-lg object-contain"
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<script lang="ts">
	import ReceiptViewer from '#lib/components/expenses/ReceiptViewer.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { DOCUMENT_KINDS, type DocumentView } from './types.js';

	let { documents }: { documents: DocumentView[] } = $props();
	let search = $state('');
	let kind = $state('all');

	const filtered = $derived(
		documents.filter(
			(d) =>
				(kind === 'all' || d.kind === kind) &&
				(search.trim() === '' || d.title.toLowerCase().includes(search.trim().toLowerCase()))
		)
	);
	const groups = $derived(
		DOCUMENT_KINDS.map((k) => ({ ...k, docs: filtered.filter((d) => d.kind === k.value) })).filter(
			(g) => g.docs.length > 0
		)
	);
	const selectClass =
		'h-9 rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';
</script>

<div class="flex flex-wrap gap-2">
	<Input
		type="search"
		placeholder="Search titles…"
		bind:value={search}
		class="max-w-xs"
		aria-label="Search documents"
	/>
	<select class={selectClass} bind:value={kind} aria-label="Filter by type">
		<option value="all">All types</option>
		{#each DOCUMENT_KINDS as k (k.value)}<option value={k.value}>{k.icon} {k.label}</option>{/each}
	</select>
</div>

{#if groups.length === 0}
	<p class="py-8 text-center text-sm text-muted-foreground">
		{documents.length === 0
			? 'No documents yet. Add the parenting plan, school letters or insurance cards.'
			: 'Nothing matches.'}
	</p>
{:else}
	{#each groups as g (g.value)}
		<section class="space-y-2">
			<h3 class="text-sm font-semibold text-muted-foreground">
				<span aria-hidden="true">{g.icon}</span>
				{g.label}
			</h3>
			<ul class="divide-y rounded-xl border bg-card">
				{#each g.docs as d (d.id)}
					<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
						<div class="min-w-0">
							<p class="flex flex-wrap items-center gap-2 font-medium">
								<span aria-hidden="true">{d.fileType === 'pdf' ? '📄' : '🖼️'}</span>
								<span class="truncate">{d.title}</span>
								{#if d.readByAi}<Badge variant="secondary">Read by AI ✓</Badge>{/if}
							</p>
							<p class="text-xs text-muted-foreground">Added by {d.uploadedBy} · {d.uploadedOn}</p>
						</div>
						<ReceiptViewer path={d.storagePath} label="Open" />
					</li>
				{/each}
			</ul>
		</section>
	{/each}
{/if}
<p class="text-xs text-muted-foreground">
	Documents are kept as a record and can't be renamed or deleted.
</p>

<script lang="ts">
	import DocumentList from '#lib/components/documents/DocumentList.svelte';
	import DocumentUpload from '#lib/components/documents/DocumentUpload.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Documents · TeamKid</title></svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold">Documents</h1>
			<p class="text-muted-foreground">
				The parenting plan, school letters and cards, in one place both parents can reach.
			</p>
		</div>
		<Button href="/plan/import" variant="outline">Import a parenting plan</Button>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Add a document</Card.Title>
			<Card.Description
				>Files go straight to private storage; only parents of this family can open them.</Card.Description
			>
		</Card.Header>
		<Card.Content><DocumentUpload familyId={data.familyId} /></Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header><Card.Title>Your vault</Card.Title></Card.Header>
		<Card.Content class="space-y-4"><DocumentList documents={data.documents} /></Card.Content>
	</Card.Root>
</div>

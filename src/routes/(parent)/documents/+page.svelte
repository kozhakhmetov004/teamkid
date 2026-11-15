<script lang="ts">
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import DocumentList from '#lib/components/documents/DocumentList.svelte';
	import DocumentUpload from '#lib/components/documents/DocumentUpload.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Documents · TeamKid</title></svelte:head>

<div class="space-y-6">
	<PageHeader
		title="Documents"
		icon="📁"
		description="The parenting plan, school letters and cards, in one place both parents can reach."
	>
		{#snippet actions()}
			<Button href="/plan/import" variant="outline">Import a parenting plan</Button>
		{/snippet}
	</PageHeader>

	<!-- Upload beside the vault on wide screens (equal widths; both cards share the row height). -->
	<div class="grid gap-6 lg:grid-cols-2">
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
</div>

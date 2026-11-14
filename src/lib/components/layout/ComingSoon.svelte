<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';

	let { title, owner, startFrom }: { title: string; owner: string; startFrom: string } = $props();
</script>

<svelte:head><title>{title} · TeamKid</title></svelte:head>

<h1 class="mb-4 text-2xl font-bold">{title}</h1>
<Card.Root>
	<Card.Header>
		<Card.Title>Coming soon</Card.Title>
		<Card.Description>This part of TeamKid is being built right now.</Card.Description>
	</Card.Header>
	<Card.Content class="text-sm text-muted-foreground">
		<p><strong>Owner:</strong> {owner}</p>
		<p><strong>Start from:</strong> <code>{startFrom}</code></p>
	</Card.Content>
</Card.Root>

<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { PageProps } from './$types';

	// Only reached without JavaScript: forms on Today/Calendar post here.
	let { form }: PageProps = $props();
</script>

<svelte:head><title>Swap request · TeamKid</title></svelte:head>

<Card.Root class="mx-auto max-w-lg">
	<Card.Header>
		<Card.Title>Swap request</Card.Title>
		<Card.Description>
			{#if form && 'ok' in form && form.ok}
				{form.message}
			{:else if form && 'message' in form}
				<span role="alert" class="text-destructive">{form.message}</span>
			{:else}
				Request, accept or decline swaps from Today or the Calendar.
			{/if}
		</Card.Description>
	</Card.Header>
	<Card.Footer class="gap-2">
		<Button href="/dashboard">Back to Today</Button>
		<Button href="/calendar" variant="outline">Open calendar</Button>
	</Card.Footer>
</Card.Root>

<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
</script>

<svelte:head><title>Something went wrong · TeamKid</title></svelte:head>

<div class="mx-auto max-w-5xl px-4 py-10">
	<Card.Root>
		<Card.Header>
			<Card.Title>{page.status === 404 ? 'Page not found' : 'Something went wrong'}</Card.Title>
			<Card.Description
				>{page.error?.message ?? 'Please try again.'} (error {page.status})</Card.Description
			>
		</Card.Header>
		<Card.Footer class="gap-2">
			<Button href="/dashboard">Back to dashboard</Button>
			<Button variant="outline" onclick={() => location.reload()}>Try again</Button>
		</Card.Footer>
	</Card.Root>
</div>

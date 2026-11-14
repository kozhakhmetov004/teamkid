<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
</script>

<svelte:head><title>Something went wrong · TeamKid</title></svelte:head>

<main
	class="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
>
	<p class="text-sm font-medium text-muted-foreground">Error {page.status}</p>
	<h1 class="text-2xl font-semibold">
		{page.status === 404 ? "We couldn't find that page" : 'Something went wrong'}
	</h1>
	<p class="text-muted-foreground">{page.error?.message ?? 'Please try again.'}</p>
	<Button href="/">Back to start</Button>
</main>

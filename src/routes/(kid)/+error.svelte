<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>Oops · TeamKid</title></svelte:head>

<main
	class="flex min-h-dvh flex-col items-center justify-center gap-6 bg-kid-background px-4 text-center"
>
	<div
		class="flex size-28 items-center justify-center rounded-full bg-pebble text-6xl"
		aria-hidden="true"
	>
		🐢
	</div>
	<h1 class="text-3xl font-bold">Oops! Pebble got a little lost.</h1>
	<p class="text-lg text-muted-foreground">Let's go back home. (error {page.status})</p>
	<a
		href="/pebble"
		class="flex h-16 items-center rounded-2xl bg-primary px-8 text-2xl font-bold text-primary-foreground"
	>
		Back to Pebble
	</a>
</main>

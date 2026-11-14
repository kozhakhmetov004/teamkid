<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Placeholder tiles: the kids' space workstream turns these into real pages.
	const tiles = [
		{ emoji: '😊', label: 'How do I feel?', soon: 'Mood check-in' },
		{ emoji: '⭐', label: 'My wishes', soon: 'Wish cards' },
		{ emoji: '🐚', label: 'Tuck in', soon: 'Calm breathing' },
		{ emoji: '🏠', label: 'Where am I tonight?', soon: 'Picture calendar' }
	];
</script>

<svelte:head><title>Pebble · TeamKid</title></svelte:head>

<section class="flex flex-col items-center gap-4 pt-4 text-center">
	<div
		class="flex size-40 items-center justify-center rounded-full bg-pebble text-8xl shadow-lg motion-safe:animate-bounce"
		style="animation-duration: 3s"
		role="img"
		aria-label="{data.petName} the turtle"
	>
		🐢
	</div>
	<h1 class="text-4xl font-bold">Hi {data.firstName}, I'm {data.petName}!</h1>
	<p class="text-xl text-muted-foreground">Happy {data.today}! What should we do today?</p>
	{#if data.tonight}
		<p class="rounded-2xl bg-kid-surface px-5 py-3 text-lg shadow-sm">
			🌙 Tonight: <strong>{data.tonight}</strong>
		</p>
	{/if}
</section>

<section class="grid grid-cols-2 gap-4" aria-label="Things to do">
	{#each tiles as tile (tile.label)}
		<button
			type="button"
			disabled
			class="flex min-h-36 flex-col items-center justify-center gap-2 rounded-3xl bg-kid-surface p-4 text-center shadow-sm disabled:cursor-not-allowed"
			aria-label="{tile.label} (coming soon)"
		>
			<span class="text-5xl" aria-hidden="true">{tile.emoji}</span>
			<span class="text-lg leading-tight font-semibold">{tile.label}</span>
			<span class="text-sm text-muted-foreground">Coming soon</span>
		</button>
	{/each}
</section>

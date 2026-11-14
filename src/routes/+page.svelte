<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { homePathFor } from '#lib/types/domain.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>TeamKid · Two homes. One team. One kid.</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-10 px-4 py-12">
	<header class="space-y-3 text-center">
		<p class="text-5xl" aria-hidden="true">🐢</p>
		<h1 class="text-3xl font-bold tracking-tight">TeamKid</h1>
		<p class="text-lg text-muted-foreground">Two homes. One team. One kid.</p>
	</header>

	{#if data.signedIn}
		<div class="flex flex-col gap-3">
			<Button size="lg" href={homePathFor(data.member)}>Continue</Button>
			<form method="POST" action="/logout" class="text-center">
				<Button variant="link" type="submit">Sign out</Button>
			</form>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			<a
				href="/login"
				class="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-6 text-center shadow-sm transition hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
			>
				<span class="text-3xl" aria-hidden="true">👪</span>
				<span class="text-lg font-semibold">Parent login</span>
				<span class="text-sm text-muted-foreground">Email link or password</span>
			</a>
			<a
				href="/kid-login"
				class="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-pebble p-6 text-center text-pebble-foreground shadow-sm transition hover:brightness-105 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
			>
				<span class="text-3xl" aria-hidden="true">🐢</span>
				<span class="text-lg font-semibold">Kid login</span>
				<span class="text-sm">Family code + PIN</span>
			</a>
		</div>
	{/if}
</main>

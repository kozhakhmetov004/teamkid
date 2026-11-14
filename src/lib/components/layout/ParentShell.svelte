<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import Nav from './Nav.svelte';

	let {
		familyName,
		displayName,
		children
	}: { familyName: string; displayName: string; children: Snippet } = $props();
</script>

<div class="min-h-dvh bg-background">
	<header class="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
		<div class="mx-auto flex max-w-5xl flex-col gap-2 px-4 pt-3 pb-2">
			<div class="flex items-center justify-between gap-3">
				<a href="/dashboard" class="flex min-w-0 items-center gap-2">
					<span class="text-2xl" aria-hidden="true">🐢</span>
					<span class="truncate font-semibold">{familyName}</span>
				</a>
				<div class="flex items-center gap-2">
					<span class="hidden text-sm text-muted-foreground sm:inline">{displayName}</span>
					<form method="POST" action="/logout">
						<Button type="submit" variant="outline" size="sm">Sign out</Button>
					</form>
				</div>
			</div>
			<Nav />
		</div>
	</header>
	<main class="mx-auto max-w-5xl px-4 py-6">
		{@render children()}
	</main>
</div>

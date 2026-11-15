<script lang="ts">
	/**
	 * Parent app shell: a left sidebar on large screens (family, nav, you +
	 * sign out), a compact top bar with a scrolling nav on phones/tablets.
	 */
	import type { Snippet } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import Nav from './Nav.svelte';

	let {
		familyName,
		displayName,
		children
	}: { familyName: string; displayName: string; children: Snippet } = $props();
</script>

<div class="min-h-dvh bg-secondary/70 lg:flex">
	<aside
		class="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 bg-card px-3 py-5 shadow-sm lg:flex"
	>
		<a
			href="/dashboard"
			class="flex min-w-0 items-center gap-2 rounded-xl px-3 py-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
		>
			<span class="text-2xl" aria-hidden="true">🐢</span>
			<span class="truncate font-semibold">{familyName}</span>
		</a>
		<Nav variant="sidebar" />
		<div class="mt-auto space-y-3 border-t px-3 pt-4">
			<p class="truncate text-sm font-medium">{displayName}</p>
			<form method="POST" action="/logout">
				<Button type="submit" variant="outline" size="sm" class="w-full">Sign out</Button>
			</form>
		</div>
	</aside>

	<div class="min-w-0 flex-1">
		<header class="sticky top-0 z-40 border-b bg-card/95 backdrop-blur lg:hidden">
			<div class="flex flex-col gap-2 px-4 pt-3 pb-2">
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
				<Nav variant="bar" />
			</div>
		</header>
		<main class="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
			{@render children()}
		</main>
	</div>
</div>

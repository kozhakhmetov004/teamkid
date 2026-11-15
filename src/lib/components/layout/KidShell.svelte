<script lang="ts">
	/**
	 * The kids' space frame: big, friendly, minimal. No adult navigation.
	 *  - top bar: TeamKid mark (home), "I need a grown-up" always one tap away, "Bye"
	 *  - warm "pond world" background with soft waves at the bottom (decorative)
	 *  - loads the kids' design kit (kid.css) and the Nunito font, for kid pages only
	 */
	import '@fontsource-variable/nunito';
	import '#lib/components/kids/ui/kid.css';
	import { page } from '$app/state';
	import TurtleMark from '#lib/components/landing/TurtleMark.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const onHelp = $derived(page.url.pathname.startsWith('/help'));
</script>

<div class="kid-app relative isolate flex min-h-dvh flex-col overflow-x-clip text-lg">
	<header
		class="sticky top-0 z-30 border-b border-white/60 bg-[oklch(0.985_0.015_200/0.75)] backdrop-blur-md"
	>
		<div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
			<a
				href="/pebble"
				class="group flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-xl font-black tracking-tight"
			>
				<span
					class="grid size-11 place-items-center rounded-full bg-white shadow-[0_3px_0_oklch(0.87_0.025_200)] transition-transform group-hover:-rotate-6"
				>
					<TurtleMark class="size-8" />
				</span>
				<span>TeamKid<span class="sr-only">, home</span></span>
			</a>

			<div class="flex items-center gap-2">
				{#if !onHelp}
					<a href="/help" class="k-btn k-btn--sm k-rose">
						<span aria-hidden="true">🆘</span>
						<span class="hidden sm:inline">I need a grown-up</span>
						<span class="sm:hidden">Help</span>
					</a>
				{/if}
				<form method="POST" action="/logout">
					<button type="submit" class="k-btn k-btn--sm k-btn--quiet">
						<span aria-hidden="true">👋</span> Bye
					</button>
				</form>
			</div>
		</div>
	</header>

	<main class="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 pb-28">
		{@render children()}
	</main>

	<!-- soft pond waves along the bottom (decorative) -->
	<svg
		class="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 w-full"
		viewBox="0 0 1440 160"
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		<path
			d="M0 70 C 240 30 420 110 720 70 C 1020 30 1200 100 1440 60 V160 H0 Z"
			fill="oklch(0.9 0.06 175 / 0.55)"
		/>
		<path
			d="M0 105 C 300 70 520 140 820 102 C 1080 70 1260 125 1440 98 V160 H0 Z"
			fill="oklch(0.84 0.08 172 / 0.55)"
		/>
		<g fill="oklch(0.74 0.11 150 / 0.7)">
			<ellipse cx="180" cy="118" rx="38" ry="9" />
			<ellipse cx="1210" cy="112" rx="30" ry="7" />
			<ellipse cx="760" cy="135" rx="24" ry="6" />
		</g>
	</svg>
</div>

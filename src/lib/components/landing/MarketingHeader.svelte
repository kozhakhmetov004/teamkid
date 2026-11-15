<script lang="ts">
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import { hero, nav, site } from './content.js';
	import TurtleMark from './TurtleMark.svelte';

	let { signedIn, homePath }: { signedIn: boolean; homePath: string } = $props();

	let compact = $state(false);
	let open = $state(false);

	$effect(() => {
		const onScroll = () => (compact = window.scrollY > 12);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
			document.getElementById('menu-button')?.focus();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<header
	class="sticky top-0 z-40 border-b transition-[padding,box-shadow,background-color] duration-300 {compact
		? 'border-(--mk-line) bg-(--mk-white)/95 py-2 shadow-sm backdrop-blur'
		: 'border-transparent bg-(--mk-cream) py-4'}"
>
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
		<a
			href="/"
			class="flex items-center gap-2 rounded-lg focus-visible:ring-3 focus-visible:ring-(--mk-green)/40 focus-visible:outline-none"
		>
			<TurtleMark class="size-9" />
			<span class="mk-display text-xl font-black tracking-tight text-(--mk-ink)">{site.name}</span>
		</a>

		<nav aria-label="Page sections" class="hidden md:block">
			<ul class="flex items-center gap-1">
				{#each nav as item (item.href)}
					<li>
						<a
							href={item.href}
							class="rounded-full px-3 py-2 text-[15px] font-medium text-(--mk-text) hover:bg-(--mk-mint) focus-visible:ring-3 focus-visible:ring-(--mk-green)/40 focus-visible:outline-none"
							>{item.label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="flex items-center gap-2">
			{#if signedIn}
				<a href={homePath} class="mk-btn mk-btn-primary"
					>{hero.signedInCta} <span aria-hidden="true">→</span></a
				>
			{:else}
				<a href="/login" class="mk-btn mk-btn-ghost hidden sm:inline-flex">Log in</a>
				<a href="/login" class="mk-btn mk-btn-primary">{hero.primaryCta}</a>
			{/if}
			<button
				id="menu-button"
				type="button"
				class="inline-flex size-11 items-center justify-center rounded-full text-(--mk-ink) hover:bg-(--mk-mint) focus-visible:ring-3 focus-visible:ring-(--mk-green)/40 focus-visible:outline-none md:hidden"
				aria-expanded={open}
				aria-controls="mobile-menu"
				aria-label={open ? 'Close menu' : 'Open menu'}
				onclick={() => (open = !open)}
			>
				{#if open}<X class="size-6" aria-hidden="true" />{:else}<Menu
						class="size-6"
						aria-hidden="true"
					/>{/if}
			</button>
		</div>
	</div>

	{#if open}
		<nav
			id="mobile-menu"
			aria-label="Page sections"
			class="border-t border-(--mk-line) bg-(--mk-white) md:hidden"
		>
			<ul class="mx-auto flex max-w-6xl flex-col px-4 py-2">
				{#each nav as item (item.href)}
					<li>
						<a
							href={item.href}
							class="block rounded-xl px-3 py-3 text-lg font-medium text-(--mk-ink) hover:bg-(--mk-mint)"
							onclick={() => (open = false)}>{item.label}</a
						>
					</li>
				{/each}
				{#if !signedIn}
					<li>
						<a
							href="/login"
							class="block rounded-xl px-3 py-3 text-lg font-medium text-(--mk-ink) hover:bg-(--mk-mint)"
							>Log in</a
						>
					</li>
				{/if}
			</ul>
		</nav>
	{/if}
</header>

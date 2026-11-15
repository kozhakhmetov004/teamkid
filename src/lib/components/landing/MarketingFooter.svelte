<script lang="ts">
	import { CONTACT_EMAIL, CONTACT_PLACEHOLDER, footer, site } from './content.js';
	import TurtleMark from './TurtleMark.svelte';
</script>

<footer class="bg-(--mk-ink) text-(--mk-on-ink)">
	<div class="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
		<div class="space-y-3">
			<p class="mk-display flex items-center gap-2 text-xl font-black text-white">
				<TurtleMark class="size-8" />
				{site.name}
			</p>
			<p class="max-w-xs text-[15px]">{site.tagline}</p>
			<p class="text-[15px]">
				Contact:
				{#if CONTACT_EMAIL}
					<a href="mailto:{CONTACT_EMAIL}" class="underline underline-offset-4 hover:text-white"
						>{CONTACT_EMAIL}</a
					>
				{:else}
					<span>{CONTACT_PLACEHOLDER}</span>
				{/if}
			</p>
		</div>
		<nav aria-label="Product">
			<h2 class="mb-3 text-sm font-semibold tracking-wide text-white uppercase">Product</h2>
			<ul class="space-y-2 text-[15px]">
				{#each footer.product as link (link.href)}
					<li><a href={link.href} class="hover:text-white hover:underline">{link.label}</a></li>
				{/each}
			</ul>
		</nav>
		<nav aria-label="App">
			<h2 class="mb-3 text-sm font-semibold tracking-wide text-white uppercase">App</h2>
			<ul class="space-y-2 text-[15px]">
				{#each footer.app as link (link.href)}
					<li><a href={link.href} class="hover:text-white hover:underline">{link.label}</a></li>
				{/each}
			</ul>
		</nav>
		<nav aria-label="Legal">
			<h2 class="mb-3 text-sm font-semibold tracking-wide text-white uppercase">Legal</h2>
			<ul class="space-y-2 text-[15px]">
				{#each footer.legal as link (link.href)}
					<li><a href={link.href} class="hover:text-white hover:underline">{link.label}</a></li>
				{/each}
			</ul>
		</nav>
	</div>
	<div class="border-t border-white/15">
		<div
			class="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:justify-between sm:px-6"
		>
			<p>{footer.disclaimer}</p>
			<p>{footer.copyright}</p>
		</div>
	</div>
</footer>

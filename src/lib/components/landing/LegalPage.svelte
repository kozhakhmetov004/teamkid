<script lang="ts">
	import { CONTACT_EMAIL, CONTACT_PLACEHOLDER, draftNotice } from './content.js';

	/** Shared layout for the short Privacy and Terms pages. */
	let {
		page
	}: { page: { title: string; updated: string; sections: { heading: string; body: string[] }[] } } =
		$props();
</script>

<svelte:head>
	<title>{page.title} · TeamKid</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<article class="mx-auto max-w-3xl px-4 py-14 sm:px-6 md:py-20">
	<p
		class="inline-flex rounded-full bg-(--mk-peach) px-3 py-1 text-sm font-semibold text-(--mk-amber-text)"
	>
		{draftNotice}
	</p>
	<h1 class="mt-4 text-4xl font-extrabold tracking-tight text-(--mk-ink) sm:text-5xl">
		{page.title}
	</h1>
	<p class="mt-2 text-base text-(--mk-muted)">Last updated: {page.updated}</p>

	{#each page.sections as section (section.heading)}
		<section class="mt-10">
			<h2 class="text-2xl font-bold text-(--mk-ink)">{section.heading}</h2>
			{#each section.body as para (para)}
				<p class="mt-3 text-lg text-(--mk-text)">{para}</p>
			{/each}
		</section>
	{/each}

	<section class="mt-10">
		<h2 class="text-2xl font-bold text-(--mk-ink)">Contact</h2>
		<p class="mt-3 text-lg text-(--mk-text)">
			Questions, or a request to export or delete your data:
			{#if CONTACT_EMAIL}
				<a href="mailto:{CONTACT_EMAIL}" class="font-semibold text-(--mk-green) underline"
					>{CONTACT_EMAIL}</a
				>
			{:else}
				<span class="font-semibold">{CONTACT_PLACEHOLDER}</span>
			{/if}
		</p>
	</section>
</article>

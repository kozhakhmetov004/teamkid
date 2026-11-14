<script lang="ts">
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import { CONTACT_EMAIL, CONTACT_PLACEHOLDER, professionals } from './content.js';
	import { reveal } from './reveal.js';
</script>

<section class="bg-(--mk-cream)" aria-labelledby="pro-title">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
		<div
			class="flex flex-col gap-6 rounded-[32px] border border-(--mk-line) bg-(--mk-white) p-8 md:flex-row md:items-center md:justify-between md:p-10"
			use:reveal
		>
			<div class="flex gap-5">
				<span
					class="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-(--mk-mint) text-(--mk-green) sm:flex"
				>
					<Briefcase class="size-7" aria-hidden="true" />
				</span>
				<div class="max-w-2xl">
					<h2 id="pro-title" class="text-2xl font-bold text-(--mk-ink) sm:text-3xl">
						{professionals.title}
					</h2>
					<p class="mt-3 text-lg text-(--mk-text)">{professionals.text}</p>
				</div>
			</div>
			{#if CONTACT_EMAIL}
				<a href="mailto:{CONTACT_EMAIL}" class="mk-btn mk-btn-outline mk-btn-lg shrink-0"
					>{professionals.cta}</a
				>
			{:else}
				<p class="shrink-0 text-base text-(--mk-muted)">
					{professionals.cta}:
					<span class="font-semibold text-(--mk-ink)">{CONTACT_PLACEHOLDER}</span>
				</p>
			{/if}
		</div>
	</div>
</section>

<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { faq } from './content.js';
	import { reveal } from './reveal.js';
</script>

<section id="faq" class="bg-(--mk-white)" aria-labelledby="faq-title">
	<div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
		<h2
			id="faq-title"
			class="text-3xl font-bold tracking-tight text-(--mk-ink) sm:text-4xl"
			use:reveal
		>
			{faq.title}
		</h2>
		<div class="mt-8 space-y-3">
			{#each faq.items as item (item.q)}
				<details
					class="group rounded-[20px] border border-(--mk-line) bg-(--mk-cream) open:bg-(--mk-white) open:shadow-sm"
				>
					<summary
						class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[20px] px-6 py-5 text-lg font-semibold text-(--mk-ink) focus-visible:ring-3 focus-visible:ring-(--mk-green)/40 focus-visible:outline-none [&::-webkit-details-marker]:hidden"
					>
						{item.q}
						<ChevronDown
							class="size-5 shrink-0 transition-transform group-open:rotate-180"
							aria-hidden="true"
						/>
					</summary>
					<p class="px-6 pb-6 text-base leading-relaxed text-(--mk-text)">{item.a}</p>
				</details>
			{/each}
		</div>
	</div>
</section>

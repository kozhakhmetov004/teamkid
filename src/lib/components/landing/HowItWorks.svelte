<script lang="ts">
	import ComingSoonBadge from './ComingSoonBadge.svelte';
	import { howItWorks, screenshots } from './content.js';
	import Icon from './Icon.svelte';
	import ProductPreview from './ProductPreview.svelte';
	import { reveal } from './reveal.js';
</script>

<section id="how-it-works" class="bg-(--mk-mint)" aria-labelledby="how-title">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
		<div class="max-w-2xl" use:reveal>
			<h2 id="how-title" class="text-3xl font-bold tracking-tight text-(--mk-ink) sm:text-4xl">
				{howItWorks.title}
			</h2>
			<p class="mt-4 text-lg text-(--mk-muted)">{howItWorks.intro}</p>
		</div>

		<div class="mt-10 grid gap-5 md:grid-cols-3">
			{#each howItWorks.columns as col, i (col.title)}
				<article
					class="flex flex-col rounded-[28px] bg-(--mk-white) p-7 shadow-sm"
					use:reveal={i * 90}
				>
					<div class="flex items-start justify-between gap-3">
						<span
							class="flex size-12 items-center justify-center rounded-2xl bg-(--mk-mint) text-(--mk-green)"
						>
							<Icon name={col.icon} class="size-6" />
						</span>
						<ComingSoonBadge status={col.status} />
					</div>
					<h3 class="mt-5 text-xl font-bold text-(--mk-ink)">{col.title}</h3>
					<ul class="mt-4 space-y-3">
						{#each col.items as item (item.text)}
							<li class="flex flex-col gap-1">
								<span class="flex gap-2 text-base text-(--mk-text)">
									<span
										aria-hidden="true"
										class="mt-2 size-1.5 shrink-0 rounded-full bg-(--mk-green)"
									></span>
									{item.text}
								</span>
								{#if item.status !== 'live' && col.status === 'live'}
									<ComingSoonBadge status={item.status} class="ml-3.5 self-start" />
								{/if}
							</li>
						{/each}
					</ul>
				</article>
			{/each}
		</div>

		{#if screenshots.dashboard.available}
			<div class="mx-auto mt-14 max-w-4xl" use:reveal>
				<ProductPreview {...screenshots.dashboard} />
				<p class="mt-3 text-center text-sm text-(--mk-muted)">
					A parent's Today page: who has your child tonight, swaps and messages.
				</p>
			</div>
		{/if}
	</div>
</section>

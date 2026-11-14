<script lang="ts">
	import ComingSoonBadge from './ComingSoonBadge.svelte';
	import { pebble, screenshots } from './content.js';
	import PebbleArt from './PebbleArt.svelte';
	import ProductPreview from './ProductPreview.svelte';
	import { reveal } from './reveal.js';
</script>

<section id="pebble" class="bg-(--mk-cream)" aria-labelledby="pebble-title">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
		<div class="grid items-center gap-10 md:grid-cols-[1fr_auto]">
			<div class="max-w-2xl" use:reveal>
				<div class="flex flex-wrap items-center gap-3">
					<h2
						id="pebble-title"
						class="text-3xl font-bold tracking-tight text-(--mk-ink) sm:text-4xl"
					>
						{pebble.title}
					</h2>
					<ComingSoonBadge status={pebble.status} />
				</div>
				<p class="mt-4 text-lg text-(--mk-muted)">{pebble.intro}</p>
			</div>
			<div class="relative mx-auto hidden size-44 md:block" aria-hidden="true">
				<div class="absolute inset-0 rounded-full bg-(--mk-peach)"></div>
				<PebbleArt class="relative size-44" label="" />
			</div>
		</div>

		<ol class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
			{#each pebble.steps as step, i (step.title)}
				<li class="rounded-[28px] bg-(--mk-white) p-6 shadow-sm" use:reveal={i * 80}>
					<span
						class="flex size-10 items-center justify-center rounded-full bg-(--mk-peach) text-lg font-bold text-(--mk-amber-text)"
						aria-hidden="true">{i + 1}</span
					>
					<h3 class="mt-4 text-lg font-bold text-(--mk-ink)">
						<span class="sr-only">Step {i + 1}: </span>{step.title}
					</h3>
					<p class="mt-2 text-base text-(--mk-text)">{step.text}</p>
				</li>
			{/each}
		</ol>

		<div class="mt-14 grid items-center gap-10 md:grid-cols-2">
			<div class="rounded-[32px] bg-(--mk-mint) p-8" use:reveal>
				<h3 class="text-2xl font-bold text-(--mk-ink)">{pebble.whyTitle}</h3>
				<ul class="mt-4 space-y-3">
					{#each pebble.why as line (line)}
						<li class="flex gap-3 text-lg text-(--mk-text)">
							<span aria-hidden="true">🐢</span>
							<span>{line}</span>
						</li>
					{/each}
				</ul>
			</div>
			<div use:reveal={120}>
				<ProductPreview {...screenshots.pebble} />
			</div>
		</div>
	</div>
</section>

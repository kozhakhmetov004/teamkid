<script lang="ts">
	import ComingSoonBadge from './ComingSoonBadge.svelte';
	import { features, screenshots } from './content.js';
	import Icon from './Icon.svelte';
	import ProductPreview from './ProductPreview.svelte';
	import { reveal } from './reveal.js';
</script>

<section id="features" class="bg-(--mk-white)" aria-labelledby="features-title">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
		<h2
			id="features-title"
			class="text-3xl font-bold tracking-tight text-(--mk-ink) sm:text-4xl"
			use:reveal
		>
			{features.title}
		</h2>
		<ul class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each features.items as f, i (f.title)}
				<li
					class="flex flex-col rounded-[24px] border border-(--mk-line) bg-(--mk-cream) p-6"
					use:reveal={(i % 3) * 70}
				>
					<div class="flex items-start justify-between gap-3">
						<span
							class="flex size-11 items-center justify-center rounded-2xl bg-(--mk-mint) text-(--mk-green)"
						>
							<Icon name={f.icon} class="size-5" />
						</span>
						<ComingSoonBadge status={f.status} />
					</div>
					<h3 class="mt-4 text-lg font-bold text-(--mk-ink)">{f.title}</h3>
					<p class="mt-1 text-base text-(--mk-text)">{f.text}</p>
				</li>
			{/each}
		</ul>
		{#if screenshots.messages.available || screenshots.plan.available}
			<div class="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
				{#if screenshots.messages.available}
					<div use:reveal><ProductPreview {...screenshots.messages} /></div>
				{/if}
				{#if screenshots.plan.available}
					<div use:reveal={120}><ProductPreview {...screenshots.plan} /></div>
				{/if}
			</div>
		{/if}
	</div>
</section>

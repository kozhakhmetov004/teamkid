<script lang="ts">
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import { safety } from './content.js';
	import { reveal } from './reveal.js';
</script>

<section id="safety" class="bg-(--mk-ink) text-(--mk-on-ink)" aria-labelledby="safety-title">
	<div class="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.4fr] md:py-24">
		<div use:reveal>
			<span class="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
				<ShieldCheck class="size-7" aria-hidden="true" />
			</span>
			<h2 id="safety-title" class="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
				{safety.title}
			</h2>
			<p class="mt-4 text-lg">{safety.intro}</p>
		</div>
		<div use:reveal={100}>
			<ul class="space-y-4">
				{#each safety.points as point (point)}
					<li class="flex gap-3 text-lg">
						<span aria-hidden="true" class="mt-1 text-white">✓</span>
						<span>{point}</span>
					</li>
				{/each}
			</ul>
			<p class="mt-8 rounded-2xl bg-white/10 px-5 py-4 text-base font-semibold text-white">
				{safety.crisis}
			</p>
		</div>
	</div>
</section>

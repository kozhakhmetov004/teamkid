<script lang="ts">
	import { finalCta, hero } from './content.js';
	import PebbleArt from './PebbleArt.svelte';
	import { reveal } from './reveal.js';

	let { signedIn, homePath }: { signedIn: boolean; homePath: string } = $props();
</script>

<section class="bg-(--mk-cream)" aria-labelledby="final-title">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
		<div
			class="relative flex flex-col items-center gap-6 overflow-hidden rounded-[32px] bg-(--mk-green) px-6 py-12 text-center text-white md:flex-row md:justify-between md:px-12 md:text-left"
			use:reveal
		>
			<div class="relative z-10 max-w-xl">
				<h2 id="final-title" class="text-3xl font-bold tracking-tight sm:text-4xl">
					{finalCta.title}
				</h2>
				<p class="mt-3 text-lg text-white/90">{finalCta.text}</p>
			</div>
			<div class="relative z-10 flex items-center gap-4">
				<PebbleArt class="hidden size-24 sm:block" bob={false} label="" />
				<a
					href={signedIn ? homePath : '/login'}
					class="mk-btn mk-btn-lg bg-white text-(--mk-ink) shadow-md hover:bg-(--mk-peach) focus-visible:outline-white"
				>
					{signedIn ? hero.signedInCta : finalCta.cta}
					<span aria-hidden="true">→</span>
				</a>
			</div>
		</div>
	</div>
</section>

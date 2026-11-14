<script lang="ts">
	import { hero } from './content.js';
	import PebbleArt from './PebbleArt.svelte';

	let { signedIn, homePath }: { signedIn: boolean; homePath: string } = $props();
</script>

<section class="overflow-hidden bg-(--mk-cream)" aria-labelledby="hero-title">
	<div
		class="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-16 md:pb-24"
	>
		<div class="space-y-6 text-center md:text-left">
			<h1
				id="hero-title"
				class="text-[2.6rem] leading-[1.05] font-extrabold tracking-tight text-(--mk-ink) sm:text-6xl lg:text-[4.25rem]"
			>
				{#each hero.headline
					.split('. ')
					.map((s, i, all) => (i < all.length - 1 ? `${s}.` : s)) as line (line)}
					<span class="block">{line}</span>
				{/each}
			</h1>
			<p class="text-xl font-semibold text-(--mk-green) sm:text-2xl">{hero.subhead}</p>
			<p class="mx-auto max-w-xl text-lg text-(--mk-muted) md:mx-0">{hero.body}</p>
			<div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center md:justify-start">
				{#if signedIn}
					<a href={homePath} class="mk-btn mk-btn-primary mk-btn-lg"
						>{hero.signedInCta} <span aria-hidden="true">→</span></a
					>
				{:else}
					<a href="/login" class="mk-btn mk-btn-primary mk-btn-lg">{hero.primaryCta}</a>
				{/if}
				<a href="#how-it-works" class="mk-btn mk-btn-outline mk-btn-lg">{hero.secondaryCta}</a>
			</div>
			{#if !signedIn}
				<p class="text-base text-(--mk-muted)">
					Are you a kid? <a
						href="/kid-login"
						class="font-semibold text-(--mk-green) underline underline-offset-4">{hero.kidLink}</a
					>
				</p>
			{/if}
		</div>

		<div class="relative mx-auto w-full max-w-sm md:max-w-md">
			<div class="absolute inset-[6%] rounded-full bg-(--mk-peach)" aria-hidden="true"></div>
			<div
				class="absolute top-[8%] right-[2%] size-16 rounded-full bg-(--mk-mint-strong)"
				aria-hidden="true"
			></div>
			<PebbleArt class="relative w-full drop-shadow-sm" />
		</div>
	</div>
</section>

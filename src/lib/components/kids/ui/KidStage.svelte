<script lang="ts">
	/**
	 * Pebble's scene: speech bubble on top, Pebble standing on a lily pad under a
	 * soft sky, and an optional area below (buttons, collections…). Sticky beside
	 * the content on wide screens.
	 */
	import PebbleSay from '#lib/components/kids/PebbleSay.svelte';
	import type { Snippet } from 'svelte';

	let {
		speech,
		label,
		petWidth = '24rem',
		sticky = true,
		children,
		below
	}: {
		speech: string;
		/** Accessible name of the scene, e.g. "Pebble the turtle". */
		label: string;
		/** Max width of Pebble's art. */
		petWidth?: string;
		sticky?: boolean;
		/** Pebble's art. */
		children: Snippet;
		below?: Snippet;
	} = $props();
</script>

<section aria-label={label} class="k-stage k-rise {sticky ? 'lg:sticky lg:top-24' : ''}">
	<PebbleSay text={speech} />
	<div class="k-stage__pet" style:max-width={petWidth}>
		<div>{@render children()}</div>
	</div>
	{#if below}
		<div class="relative z-10">{@render below()}</div>
	{/if}
</section>

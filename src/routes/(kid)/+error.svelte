<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>Oops · TeamKid</title></svelte:head>

<section class="k-mint flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
	<div
		class="k-float grid size-32 place-items-center rounded-[2.5rem] bg-[var(--k-sun-solid)] text-7xl shadow-[inset_0_-7px_0_var(--k-sun-edge),0_6px_0_oklch(0.86_0.035_205)]"
		aria-hidden="true"
	>
		🐢
	</div>
	<h1 class="k-display">Oops! Pebble got a little lost.</h1>
	<p class="k-lead">Let's go back home. (error {page.status})</p>
	<a href="/pebble" class="k-btn k-btn--lg">
		<span class="k-btn__icon" aria-hidden="true">🏡</span> Back to Pebble
	</a>
</section>

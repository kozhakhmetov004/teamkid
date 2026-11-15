<script lang="ts">
	import Pebble, { type PebbleState } from '#lib/components/kids/Pebble.svelte';
	import DailyCards from '#lib/components/kids/DailyCards.svelte';
	import { DECK_LINES } from '#lib/kids/pebbleLines.js';
	import { shellColorByKey } from '#lib/kids/pet.js';
	import KidBack from '#lib/components/kids/ui/KidBack.svelte';
	import KidStage from '#lib/components/kids/ui/KidStage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let speech = $state<string>(DECK_LINES.loading);
	let mood = $state<PebbleState>('idle');
	const color = $derived(shellColorByKey(data.pet.colorKey));

	function say(text: string, next: PebbleState = 'idle') {
		speech = text;
		mood = next;
	}
</script>

<svelte:head><title>Wish cards · TeamKid</title></svelte:head>

<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)] lg:gap-10">
	<KidStage {speech} label="{data.pet.name} the turtle" petWidth="22rem">
		<Pebble state={mood} name={data.pet.name} {color} pattern={data.pet.pattern} />
	</KidStage>

	<section class="k-sun relative flex flex-col gap-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<KidBack label="Back to {data.pet.name}" />
			<a href="/pebble?done=wishes" class="k-btn k-mint">
				<span class="k-btn__icon" aria-hidden="true">✅</span> Done for today
			</a>
		</div>

		{#await data.deck}
			<div
				class="k-card k-card--accent flex min-h-72 animate-pulse flex-col items-center justify-center gap-3 p-8 text-2xl font-extrabold motion-reduce:animate-none"
				role="status"
			>
				<span class="text-6xl" aria-hidden="true">🃏</span>
				{DECK_LINES.loading}
			</div>
		{:then deck}
			<DailyCards
				{deck}
				answers={data.answers}
				weekendLine={data.weekendLine}
				petName={data.pet.name}
				{color}
				pattern={data.pet.pattern}
				onsay={say}
			/>
		{:catch}
			<p role="alert" class="k-note k-peach justify-center text-center">
				Oops, my cards got mixed up. Can you come back in a little bit?
			</p>
		{/await}
	</section>
</div>

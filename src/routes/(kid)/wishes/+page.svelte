<script lang="ts">
	import Pebble, { type PebbleState } from '#lib/components/kids/Pebble.svelte';
	import PebbleSay from '#lib/components/kids/PebbleSay.svelte';
	import WeeklyCards from '#lib/components/kids/WeeklyCards.svelte';
	import { DECK_LINES } from '#lib/kids/pebbleLines.js';
	import { shellColorByKey } from '#lib/kids/pet.js';
	import { KID_FOCUS, KID_FONT } from '#lib/kids/ui.js';
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

<div
	class="grid items-start gap-8 lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)] lg:gap-10"
	style="font-family: {KID_FONT}"
>
	<section
		aria-label="{data.pet.name} the turtle"
		class="flex flex-col gap-6 rounded-[2.5rem] bg-gradient-to-b from-kid-surface to-secondary p-6 shadow-sm lg:sticky lg:top-6 lg:p-8"
	>
		<PebbleSay text={speech} />
		<div class="mx-auto w-full max-w-[22rem] px-2">
			<Pebble state={mood} name={data.pet.name} {color} pattern={data.pet.pattern} />
		</div>
	</section>

	<section class="flex flex-col gap-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<a
				href="/pebble"
				class="inline-flex min-h-12 items-center gap-2 rounded-2xl px-3 text-xl font-semibold text-muted-foreground hover:text-foreground {KID_FOCUS}"
			>
				<span aria-hidden="true">←</span> Back to {data.pet.name}
			</a>
			<a
				href="/pebble?done=wishes"
				class="inline-flex min-h-16 items-center gap-2 rounded-2xl bg-kid-surface px-6 text-xl font-bold shadow-sm {KID_FOCUS}"
			>
				<span aria-hidden="true">✅</span> Done for today
			</a>
		</div>

		{#await data.deck}
			<div
				class="flex min-h-64 animate-pulse flex-col items-center justify-center gap-3 rounded-[2.5rem] bg-kid-surface p-8 text-2xl motion-reduce:animate-none"
				role="status"
			>
				<span class="text-5xl" aria-hidden="true">🃏</span>
				{DECK_LINES.loading}
			</div>
		{:then deck}
			<WeeklyCards
				{deck}
				answers={data.answers}
				weekendLine={data.weekendLine}
				petName={data.pet.name}
				{color}
				pattern={data.pet.pattern}
				onsay={say}
			/>
		{:catch}
			<p
				role="alert"
				class="rounded-2xl bg-pebble/40 p-4 text-center text-xl text-pebble-foreground"
			>
				Oops, my cards got mixed up. Can you come back in a little bit?
			</p>
		{/await}
	</section>
</div>

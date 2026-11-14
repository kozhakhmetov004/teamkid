<script lang="ts">
	import Pebble from '#lib/components/kids/Pebble.svelte';
	import PebbleSay from '#lib/components/kids/PebbleSay.svelte';
	import { rememberTimeZone } from '#lib/kids/tz.js';
	import { KID_FOCUS, KID_FONT } from '#lib/kids/ui.js';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	onMount(() => rememberTimeZone(data.tz));

	const HOME_STYLE = {
		A: { emoji: '🏠', bg: 'bg-sky-100 dark:bg-sky-950', ring: 'ring-sky-400' },
		B: { emoji: '🏡', bg: 'bg-amber-100 dark:bg-amber-950', ring: 'ring-amber-400' }
	} as const;

	const tonight = $derived(data.nights[0]);
	const speech = $derived.by(() => {
		if (!tonight?.place) return 'I’m not sure about tonight. Ask a grown-up, they’ll know!';
		const line = `Tonight you sleep at ${tonight.place}.`;
		if (!data.next) return `${line} Both homes love you.`;
		const when = data.next.inDays === 1 ? 'Tomorrow' : `On ${data.next.weekday}`;
		return `${line} ${when}${data.next.time ? ` after ${data.next.time}` : ''} you go to ${data.next.place}.`;
	});
</script>

<svelte:head><title>Where am I tonight? · TeamKid</title></svelte:head>

<div class="flex flex-col gap-8" style="font-family: {KID_FONT}">
	<a
		href="/pebble"
		class="inline-flex min-h-14 items-center gap-2 self-start rounded-2xl px-4 text-xl font-semibold text-primary {KID_FOCUS}"
	>
		<span aria-hidden="true">←</span> Back to Pebble
	</a>

	<section
		class="grid items-center gap-6 rounded-[2.5rem] bg-gradient-to-b from-kid-surface to-secondary p-6 shadow-sm md:grid-cols-[14rem_1fr] lg:p-8"
	>
		<div class="mx-auto w-48 md:w-full">
			<Pebble state="idle" />
		</div>
		<div class="flex flex-col gap-4">
			<h1 class="text-4xl font-bold lg:text-5xl">Where am I tonight?</h1>
			<PebbleSay text={speech} />
		</div>
	</section>

	<section aria-labelledby="week-title" class="flex flex-col gap-4">
		<h2 id="week-title" class="text-3xl font-bold">My nights this week</h2>
		<ol class="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
			{#each data.nights as n (n.date)}
				{@const style = n.home ? HOME_STYLE[n.home] : null}
				<li
					class="flex flex-col items-center gap-2 rounded-3xl p-4 text-center shadow-sm {style
						? style.bg
						: 'bg-kid-surface'} {n.tonight ? `ring-4 ${style?.ring ?? 'ring-primary'}` : ''}"
					aria-current={n.tonight ? 'date' : undefined}
				>
					<span class="text-lg font-semibold">{n.tonight ? 'Tonight' : n.weekday}</span>
					<span class="text-sm text-muted-foreground">{n.short}</span>
					<span class="text-5xl" aria-hidden="true">{style ? style.emoji : '❔'}</span>
					<span class="text-xl font-bold">{n.place ?? 'Ask a grown-up'}</span>
				</li>
			{/each}
		</ol>
		<p class="text-lg text-muted-foreground">
			<span aria-hidden="true">🐢</span> Like Pebble, you carry your shell to both homes.
		</p>
	</section>
</div>

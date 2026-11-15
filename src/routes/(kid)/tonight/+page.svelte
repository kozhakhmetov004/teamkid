<script lang="ts">
	import Pebble from '#lib/components/kids/Pebble.svelte';
	import PackingHelper from '#lib/components/kids/PackingHelper.svelte';
	import PebbleSay from '#lib/components/kids/PebbleSay.svelte';
	import { rememberTimeZone } from '#lib/kids/tz.js';
	import KidBack from '#lib/components/kids/ui/KidBack.svelte';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	onMount(() => rememberTimeZone(data.tz));

	// each home has its own colour family (kid.css accents) and picture
	const HOME_STYLE = {
		A: { emoji: '🏠', accent: 'k-sky' },
		B: { emoji: '🏡', accent: 'k-peach' }
	} as const;

	const tonight = $derived(data.nights[0]);
	const todayPlans = $derived(tonight?.plans ?? []);
	const speech = $derived.by(() => {
		if (!tonight?.place) return 'I’m not sure about tonight. Ask a grown-up, they’ll know!';
		const line = `Tonight you sleep at ${tonight.place}.`;
		if (!data.next) return `${line} Both homes love you.`;
		const when = data.next.inDays === 1 ? 'Tomorrow' : `On ${data.next.weekday}`;
		return `${line} ${when}${data.next.time ? ` after ${data.next.time}` : ''} you go to ${data.next.place}.`;
	});
</script>

<svelte:head><title>Where am I tonight? · TeamKid</title></svelte:head>

<div class="k-lilac flex flex-col gap-8">
	<KidBack label="Back to Pebble" />

	<section class="k-stage k-rise md:!grid md:grid-cols-[15rem_1fr] md:items-center lg:gap-10">
		<div class="k-stage__pet w-52 md:w-full">
			<div><Pebble state="idle" /></div>
		</div>
		<div class="relative z-10 flex flex-col gap-5">
			<span class="k-eyebrow self-start"><span aria-hidden="true">🌙</span> Sleep plan</span>
			<h1 class="k-display">Where am I tonight?</h1>
			<PebbleSay text={speech} />
			{#if data.sleeps}
				<p
					class="inline-flex items-center gap-2 self-start rounded-full bg-[var(--kid-surface)] px-5 py-2.5 text-xl font-extrabold shadow-[0_3px_0_var(--a-edge)]"
				>
					<span aria-hidden="true">🌙</span>
					{data.sleeps.sleeps === 1
						? `1 more sleep until ${data.sleeps.person}’s house`
						: `${data.sleeps.sleeps} more sleeps until ${data.sleeps.person}’s house`}
				</p>
			{/if}
		</div>
	</section>

	<section
		aria-labelledby="today-title"
		class="k-card k-rise flex flex-col gap-4 p-6"
		style:animation-delay="60ms"
	>
		<h2 id="today-title" class="k-title flex items-center gap-2">
			<span aria-hidden="true">☀️</span> Today
		</h2>
		{#if data.pickup}
			<p class="k-note k-mint items-center text-2xl">
				<span class="text-4xl" aria-hidden="true">🚗</span>
				<span>
					{data.pickup.who} picks you up at {data.pickup.time}{#if data.pickup.place}
						at {data.pickup.place}{/if}.
				</span>
			</p>
		{/if}
		{#if todayPlans.length}
			<ul class="flex flex-col gap-3">
				{#each todayPlans as p (p.id)}
					<li
						class="flex items-center gap-4 rounded-[1.5rem] bg-[var(--k-sky-soft)] p-3 text-2xl font-bold"
					>
						<span
							class="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--kid-surface)] text-3xl shadow-[0_3px_0_var(--k-sky-edge)]"
							aria-hidden="true">{p.icon}</span
						>
						<span>
							{#if p.time}<span class="font-bold">{p.time}</span>{/if}
							{p.title}{#if p.with}<span class="text-muted-foreground"> with {p.with}</span>{/if}
							{#if p.place}<span class="block text-lg text-muted-foreground">📍 {p.place}</span
								>{/if}
						</span>
					</li>
				{/each}
			</ul>
		{:else if !data.pickup}
			<p class="k-note k-sun text-xl">
				<span class="k-note__icon" aria-hidden="true">🌤️</span> Nothing special planned today. A cozy
				day!
			</p>
		{/if}
	</section>

	{#if data.packing}
		<PackingHelper {...data.packing} />
	{/if}

	<section
		aria-labelledby="week-title"
		class="k-rise flex flex-col gap-4"
		style:animation-delay="120ms"
	>
		<h2 id="week-title" class="k-title flex items-center gap-2">
			<span aria-hidden="true">🗓️</span> My week
		</h2>
		<ol class="flex flex-col gap-3">
			{#each data.nights as n (n.date)}
				{@const style = n.home ? HOME_STYLE[n.home] : null}
				<li
					class="week-row {style ? style.accent : ''} {n.tonight
						? 'is-tonight'
						: ''} grid items-center gap-4 p-4 sm:grid-cols-[14rem_1fr]"
					aria-current={n.tonight ? 'date' : undefined}
				>
					<div class="flex items-center gap-3">
						<span
							class="grid size-16 shrink-0 place-items-center rounded-[1.25rem] bg-[var(--kid-surface)] text-4xl shadow-[0_3px_0_var(--a-edge,oklch(0.87_0.025_200))]"
							aria-hidden="true">{style ? style.emoji : '❔'}</span
						>
						<div class="flex flex-col">
							<span class="text-lg font-extrabold"
								>{n.tonight ? 'Tonight' : n.weekday}
								<span class="font-semibold text-muted-foreground">{n.short}</span></span
							>
							{#if n.switch}
								<span class="text-lg">
									<span aria-hidden="true">☀️</span>
									{n.switch.dayPlace}
									<span aria-hidden="true">→</span>
								</span>
								<span class="text-xl font-black"
									><span aria-hidden="true">🌙</span>
									{n.place ?? 'Ask a grown-up'}
									<span class="text-base font-semibold text-muted-foreground"
										>from {n.switch.nightFrom}</span
									></span
								>
							{:else}
								<span class="text-xl font-black">{n.place ?? 'Ask a grown-up'}</span>
							{/if}
						</div>
					</div>
					{#if n.plans.length}
						<ul class="flex flex-wrap gap-2">
							{#each n.plans as p (p.id)}
								<li
									class="inline-flex items-center gap-2 rounded-full bg-[var(--kid-surface)] px-3.5 py-2 text-lg font-bold shadow-[0_2px_0_oklch(0.88_0.02_200)]"
								>
									<span aria-hidden="true">{p.icon}</span>
									{#if p.time}<span class="font-semibold">{p.time}</span>{/if}
									{p.title}{#if p.with}<span class="text-muted-foreground">with {p.with}</span>{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-lg font-semibold text-muted-foreground">No plans yet</p>
					{/if}
				</li>
			{/each}
		</ol>
		<p class="k-note bg-[var(--kid-surface)] text-lg">
			<span class="k-note__icon" aria-hidden="true">🐢</span> Like Pebble, you carry your shell to both
			homes.
		</p>
	</section>
</div>

<style>
	.week-row {
		border-radius: 1.75rem;
		border: 2px solid color-mix(in oklch, var(--a-edge, oklch(0.85 0.02 200)) 35%, transparent);
		background: var(--a-soft, var(--kid-surface));
		box-shadow: 0 4px 0 color-mix(in oklch, var(--a-edge, oklch(0.85 0.02 200)) 40%, transparent);
	}
	.week-row.is-tonight {
		border-width: 3px;
		border-color: var(--a-edge, var(--ring));
		box-shadow:
			0 5px 0 var(--a-edge, var(--ring)),
			var(--k-shadow);
	}
</style>

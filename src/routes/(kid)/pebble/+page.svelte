<script lang="ts">
	import CustomizePebble from '#lib/components/kids/CustomizePebble.svelte';
	import DailyProgress from '#lib/components/kids/DailyProgress.svelte';
	import Pebble, { type PebbleState } from '#lib/components/kids/Pebble.svelte';
	import PebbleSay from '#lib/components/kids/PebbleSay.svelte';
	import ShellRewards from '#lib/components/kids/ShellRewards.svelte';
	import {
		customizeThanks,
		greeting,
		progressOf,
		rewardLine,
		WISH_LINES
	} from '#lib/kids/pebbleLines.js';
	import { SHELL_PATTERNS, shellColorByKey } from '#lib/kids/pet.js';
	import { rememberTimeZone } from '#lib/kids/tz.js';
	import { KID_FOCUS, KID_FONT } from '#lib/kids/ui.js';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** A short reaction after the child does something; null = normal greeting. */
	let reaction = $state<{ text: string; mood: PebbleState } | null>(null);
	let reactionTimer: ReturnType<typeof setTimeout> | undefined;

	function react(text: string, mood: PebbleState = 'happy') {
		reaction = { text, mood };
		clearTimeout(reactionTimer);
		reactionTimer = setTimeout(() => {
			if (reaction) reaction = { ...reaction, mood: 'idle' };
		}, 4000);
	}

	onMount(() => {
		rememberTimeZone(data.tz);
		if (data.justDid === 'checkin')
			react('Thanks for checking in! You make my shell feel happy.', 'happy');
		if (data.justDid === 'wishes') react(WISH_LINES.done, 'happy');
		return () => clearTimeout(reactionTimer);
	});

	const progress = $derived(progressOf(data.checkedInToday, data.wishedToday));
	const baseMood = $derived<PebbleState>(
		progress === 'both' ? 'proud' : data.part === 'night' && progress === 'none' ? 'sleepy' : 'idle'
	);
	const speech = $derived(
		reaction?.text ??
			greeting({
				firstName: data.firstName,
				part: data.part,
				progress,
				awayDays: data.awayDays
			})
	);
	const mood = $derived(reaction?.mood ?? baseMood);
	const color = $derived(shellColorByKey(data.pet.colorKey));

	function onClaimed() {
		const newest = data.pet.patterns.at(-1)?.key;
		const label = SHELL_PATTERNS.find((p) => p.key === newest)?.label ?? 'a surprise';
		react(rewardLine(label), 'happy');
	}
</script>

<svelte:head><title>{data.pet.name} · TeamKid</title></svelte:head>

<div
	class="grid items-start gap-8 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-10"
	style="font-family: {KID_FONT}"
>
	<!-- Pebble's scene -->
	<section
		aria-label="{data.pet.name} the turtle"
		class="flex flex-col gap-6 rounded-[2.5rem] bg-gradient-to-b from-kid-surface to-secondary p-6 shadow-sm lg:sticky lg:top-6 lg:p-8"
	>
		<PebbleSay text={speech} />
		<div class="mx-auto w-full max-w-[26rem] px-2">
			<Pebble state={mood} name={data.pet.name} {color} pattern={data.pet.pattern} />
		</div>
		<div class="flex flex-wrap items-center justify-center gap-3">
			<CustomizePebble
				name={data.pet.name}
				colorKey={data.pet.colorKey}
				pattern={data.pet.pattern}
				onsaved={(name) => react(customizeThanks(name), 'happy')}
			/>
			<a
				href="/tonight"
				class="flex min-h-16 items-center gap-2 rounded-2xl bg-kid-surface px-5 text-xl shadow-sm {KID_FOCUS}"
			>
				<span aria-hidden="true">🌙</span>
				{#if data.tonight}Tonight: <strong>{data.tonight}</strong>{:else}Where am I tonight?{/if}
			</a>
		</div>
	</section>

	<!-- Today's activities -->
	<section aria-labelledby="today-title" class="flex flex-col gap-6">
		<header>
			<p class="text-xl text-muted-foreground">Happy {data.today}!</p>
			<h1 id="today-title" class="text-4xl font-bold lg:text-5xl">
				Hi {data.firstName}! What should we do?
			</h1>
		</header>

		<DailyProgress checkedInToday={data.checkedInToday} wishedToday={data.wishedToday} />

		<ShellRewards
			owned={data.pet.patterns}
			canClaim={data.canClaim}
			claimedToday={data.claimedToday}
			allUnlocked={data.allUnlocked}
			onclaimed={onClaimed}
		/>

		<a
			href="/tuck-in"
			class="flex min-h-20 items-center gap-4 rounded-3xl bg-kid-surface px-6 text-2xl font-semibold shadow-sm {KID_FOCUS}"
		>
			<span class="text-4xl" aria-hidden="true">🐢</span>
			<span
				>Tuck in with {data.pet.name}
				<span class="block text-lg font-normal text-muted-foreground"
					>Big feelings? Take three turtle breaths.</span
				></span
			>
		</a>

		<a
			href="/my-sharing"
			class="inline-flex min-h-16 items-center gap-3 self-start rounded-2xl px-5 text-xl font-semibold text-primary underline-offset-4 hover:underline {KID_FOCUS}"
		>
			<span aria-hidden="true">👀</span> What do Mom and Dad see?
		</a>
	</section>
</div>

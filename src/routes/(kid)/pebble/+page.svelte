<script lang="ts">
	import CustomizePebble from '#lib/components/kids/CustomizePebble.svelte';
	import DailyProgress from '#lib/components/kids/DailyProgress.svelte';
	import Pebble, { type PebbleState } from '#lib/components/kids/Pebble.svelte';
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
	import KidStage from '#lib/components/kids/ui/KidStage.svelte';
	import KidTile from '#lib/components/kids/ui/KidTile.svelte';
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

<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] lg:gap-10">
	<!-- Pebble's scene -->
	<KidStage {speech} label="{data.pet.name} the turtle" petWidth="26rem">
		<Pebble state={mood} name={data.pet.name} {color} pattern={data.pet.pattern} />
		{#snippet below()}
			<div class="flex flex-wrap items-center justify-center gap-3">
				<CustomizePebble
					name={data.pet.name}
					colorKey={data.pet.colorKey}
					pattern={data.pet.pattern}
					onsaved={(name) => react(customizeThanks(name), 'happy')}
				/>
				<a href="/tonight" class="k-btn k-lilac">
					<span class="k-btn__icon" aria-hidden="true">🌙</span>
					{#if data.tonight}<span>Tonight: <strong class="font-black">{data.tonight}</strong></span
						>{:else}Where am I tonight?{/if}
				</a>
			</div>
		{/snippet}
	</KidStage>

	<!-- Today's activities -->
	<section aria-labelledby="today-title" class="flex flex-col gap-7">
		<header class="k-rise flex flex-col items-start gap-3">
			<span class="k-eyebrow k-sun"><span aria-hidden="true">☀️</span> Happy {data.today}!</span>
			<h1 id="today-title" class="k-display">
				Hi {data.firstName}!
				<span class="block text-[0.62em] font-extrabold text-muted-foreground"
					>What should we do?</span
				>
			</h1>
		</header>

		<div class="k-rise flex flex-col gap-4" style:animation-delay="60ms">
			<h2 class="flex items-center gap-2 text-xl font-black tracking-tight text-muted-foreground">
				<span aria-hidden="true">📍</span> Today
				<span class="font-extrabold"
					>· {(data.checkedInToday ? 1 : 0) + (data.wishedToday ? 1 : 0)} of 2 done</span
				>
			</h2>
			<DailyProgress checkedInToday={data.checkedInToday} wishedToday={data.wishedToday} />
		</div>

		<div class="k-rise" style:animation-delay="120ms">
			<ShellRewards
				owned={data.pet.patterns}
				canClaim={data.canClaim}
				claimedToday={data.claimedToday}
				allUnlocked={data.allUnlocked}
				onclaimed={onClaimed}
			/>
		</div>

		<div class="k-rise flex flex-col gap-4" style:animation-delay="180ms">
			<h2 class="flex items-center gap-2 text-xl font-black tracking-tight text-muted-foreground">
				<span aria-hidden="true">🎈</span> Play and relax
			</h2>
			<KidTile
				href="/pond"
				accent="sky"
				icon="🪷"
				title="Play Pond Pairs"
				hint={data.pondFriends === 0
					? 'Match cards and meet your first pond friend!'
					: `You've met ${data.pondFriends} of 12 pond friends. Who's next?`}
				badge="{data.pondFriends}/12"
				feature
			/>
			<KidTile
				href="/tuck-in"
				accent="lilac"
				icon="🐢"
				title="Tuck in with {data.pet.name}"
				hint="Big feelings? Take three turtle breaths."
			/>
		</div>

		<div class="k-rise flex flex-wrap gap-3" style:animation-delay="240ms">
			<a href="/my-sharing" class="k-btn k-btn--quiet">
				<span class="k-btn__icon" aria-hidden="true">👀</span> What do Mom and Dad see?
			</a>
		</div>
	</section>
</div>

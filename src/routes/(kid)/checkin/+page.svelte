<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import ChoiceGrid from '#lib/components/kids/ChoiceGrid.svelte';
	import type { PebbleState } from '#lib/components/kids/Pebble.svelte';
	import KidPebble from '#lib/components/kids/ui/KidPebble.svelte';
	import ShareAsk from '#lib/components/kids/ShareAsk.svelte';
	import {
		BIG_FEELINGS,
		CHECKIN_MOODS,
		ENERGY_LEVELS,
		type CheckinMood,
		type EnergyValue
	} from '#lib/kids/moods.js';
	import { CHECKIN_PROMPTS, HARD_DAYS_LINES, moodReply } from '#lib/kids/pebbleLines.js';
	import Celebrate from '#lib/components/kids/ui/Celebrate.svelte';
	import KidBack from '#lib/components/kids/ui/KidBack.svelte';
	import KidStage from '#lib/components/kids/ui/KidStage.svelte';
	import StepDots from '#lib/components/kids/ui/StepDots.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Step = 'mood' | 'energy' | 'done';
	let step = $state<Step>('mood');
	let mood = $state<CheckinMood | null>(null);
	let energy = $state<EnergyValue | null>(null);
	// "Tell Mom and Dad?" after the energy step; closing the question = private.
	let askOpen = $state(false);
	let share = $state<'yes' | 'no' | ''>('');
	let shared = $state(false);
	// Several hard days and this one kept private: Pebble offers to tell a grown-up.
	let nudge = $state(false);
	let toldLater = $state(false);
	let sharing = $state(false);
	let pending = $state(false);
	let error = $state('');
	let formEl: HTMLFormElement | undefined = $state();
	let heading: HTMLHeadingElement | undefined = $state();

	const speech = $derived(
		step === 'done' && toldLater
			? HARD_DAYS_LINES.told
			: step === 'done' && nudge
				? HARD_DAYS_LINES.nudge
				: step === 'done' && mood
					? moodReply(mood)
					: step === 'energy'
						? CHECKIN_PROMPTS.energy
						: CHECKIN_PROMPTS.mood
	);
	const pebbleState = $derived<PebbleState>(
		step === 'done' ? (mood && BIG_FEELINGS.includes(mood) ? 'idle' : 'happy') : 'idle'
	);
	const picked = $derived(CHECKIN_MOODS.find((m) => m.value === mood) ?? null);
	const pickedEnergy = $derived(ENERGY_LEVELS.find((l) => l.value === energy) ?? null);
	// Exactly what the parents will see: the feeling and the energy, nothing else.
	const tellText = $derived(
		picked
			? `you feel ${picked.label.toLowerCase()}${pickedEnergy ? ` and have ${pickedEnergy.label.toLowerCase()} energy` : ''} today`
			: ''
	);

	async function focusHeading() {
		await tick();
		heading?.focus();
	}

	function pickMood(value: CheckinMood) {
		mood = value;
		step = 'energy';
		void focusHeading();
	}

	function pickEnergy(value: EnergyValue) {
		energy = value;
		askOpen = true;
	}

	async function answerShare(yes: boolean) {
		share = yes ? 'yes' : 'no';
		askOpen = false;
		await tick();
		formEl?.requestSubmit();
	}

	function startOver() {
		mood = null;
		energy = null;
		share = '';
		nudge = false;
		toldLater = false;
		error = '';
		step = 'mood';
		void focusHeading();
	}
</script>

<svelte:head><title>How do you feel? · TeamKid</title></svelte:head>

<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] lg:gap-10">
	<KidStage {speech} label="{data.pet.name} the turtle">
		<KidPebble state={pebbleState} name={data.pet.name} color={data.pet.colorKey} />
	</KidStage>

	<section class="k-mint relative flex flex-col gap-6">
		<KidBack label="Back to {data.pet.name}" />

		<!-- step dots: text label too, never colour alone -->
		<StepDots total={2} current={step === 'mood' ? 0 : step === 'energy' ? 1 : 2} />

		<form
			bind:this={formEl}
			method="POST"
			action="?/checkin"
			class="flex flex-col gap-6"
			use:enhance={() => {
				pending = true;
				error = '';
				return async ({ result }) => {
					pending = false;
					if (result.type === 'success') {
						shared = result.data?.shared === true;
						nudge = result.data?.nudge === true;
						step = 'done';
						void focusHeading();
					} else {
						energy = null;
						share = '';
						error = 'Oops, that did not save. Try again?';
					}
				};
			}}
		>
			<input type="hidden" name="mood" value={mood ?? ''} />
			<input type="hidden" name="energy" value={energy ?? ''} />
			<input type="hidden" name="share" value={share} />

			{#if step === 'mood'}
				<h1 bind:this={heading} tabindex="-1" class="k-display k-rise outline-none">
					How do you feel?
				</h1>
				<ChoiceGrid
					choices={CHECKIN_MOODS}
					label="How do you feel?"
					picked={mood}
					onpick={pickMood}
				/>
			{:else if step === 'energy'}
				<h1 bind:this={heading} tabindex="-1" class="k-display k-rise outline-none">
					How much energy?
				</h1>
				<ChoiceGrid
					choices={ENERGY_LEVELS}
					label="How much energy?"
					accent="sun"
					picked={energy}
					disabled={pending || askOpen}
					onpick={pickEnergy}
				/>
				<button
					type="button"
					onclick={startOver}
					disabled={pending}
					class="k-btn k-btn--quiet self-start"
				>
					<span class="k-btn__icon" aria-hidden="true">↩</span> Change my feeling
				</button>
			{:else}
				<Celebrate />
				<h1 bind:this={heading} tabindex="-1" class="k-display k-rise outline-none">
					Thanks for telling me!
				</h1>
				<p class="k-note {shared ? 'k-peach' : 'k-sky'} k-rise text-xl">
					{#if shared && picked}
						<span aria-hidden="true">💌</span> I told Mom and Dad {tellText}. You can change it any
						time with a new check-in.
					{:else}
						<span aria-hidden="true">🤫</span> This one is just for you. Mom and Dad only see a short,
						kind summary of your week.
					{/if}
				</p>
				<div class="grid gap-4 sm:grid-cols-2">
					<a href="/pebble?done=checkin" class="k-btn k-btn--lg k-mint">
						<span class="k-btn__icon" aria-hidden="true">🐢</span> Back to {data.pet.name}
					</a>
					<a href="/wishes" class="k-btn k-btn--lg k-sun">
						<span class="k-btn__icon" aria-hidden="true">⭐</span> Wish cards
					</a>
				</div>
			{/if}

			{#if pending}
				<p role="status" class="text-xl font-bold text-muted-foreground">Saving…</p>
			{/if}
			{#if error}
				<p role="alert" class="k-note k-peach justify-center text-center">
					{error}
				</p>
			{/if}
		</form>

		{#if step === 'done' && nudge && !shared}
			<form
				method="POST"
				action="?/share"
				class="k-card k-card--accent k-peach k-rise flex flex-col gap-4 p-6"
				use:enhance={() => {
					sharing = true;
					error = '';
					return async ({ result }) => {
						sharing = false;
						if (result.type === 'success') {
							shared = true;
							toldLater = true;
						} else {
							error = 'Oops, Pebble could not tell them. Try again?';
						}
					};
				}}
			>
				<p class="k-title">
					<span aria-hidden="true">🧡</span> Want a grown-up to know? You choose.
				</p>
				<div class="grid gap-4 sm:grid-cols-2">
					<button type="submit" disabled={sharing} class="k-btn k-btn--lg k-peach">
						<span class="k-btn__icon" aria-hidden="true">💌</span> Tell Mom and Dad
					</button>
					<a href="/help" class="k-btn k-btn--lg k-btn--quiet">
						<span class="k-btn__icon" aria-hidden="true">🤝</span> Other grown-ups who help
					</a>
				</div>
				<p class="text-lg font-semibold text-muted-foreground">
					If you tell them, they see only how you feel today. Not now is okay too.
				</p>
			</form>
		{/if}
	</section>
</div>

{#if picked}
	<ShareAsk
		bind:open={askOpen}
		question="Want me to tell Mom and Dad {tellText}?"
		icon={picked.icon}
		petName={data.pet.name}
		color={data.pet.colorKey}
		{pending}
		onanswer={answerShare}
	/>
{/if}

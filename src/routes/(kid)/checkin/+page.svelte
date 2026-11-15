<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import ChoiceGrid from '#lib/components/kids/ChoiceGrid.svelte';
	import Pebble, { type PebbleState } from '#lib/components/kids/Pebble.svelte';
	import PebbleSay from '#lib/components/kids/PebbleSay.svelte';
	import ShareAsk from '#lib/components/kids/ShareAsk.svelte';
	import {
		BIG_FEELINGS,
		CHECKIN_MOODS,
		ENERGY_LEVELS,
		type CheckinMood,
		type EnergyValue
	} from '#lib/kids/moods.js';
	import { CHECKIN_PROMPTS, HARD_DAYS_LINES, moodReply } from '#lib/kids/pebbleLines.js';
	import { shellColorByKey } from '#lib/kids/pet.js';
	import { KID_FOCUS, KID_FONT } from '#lib/kids/ui.js';
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
	const color = $derived(shellColorByKey(data.pet.colorKey));
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

<div
	class="grid items-start gap-8 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-10"
	style="font-family: {KID_FONT}"
>
	<section
		aria-label="{data.pet.name} the turtle"
		class="flex flex-col gap-6 rounded-[2.5rem] bg-gradient-to-b from-kid-surface to-secondary p-6 shadow-sm lg:sticky lg:top-6 lg:p-8"
	>
		<PebbleSay text={speech} />
		<div class="mx-auto w-full max-w-[24rem] px-2">
			<Pebble state={pebbleState} name={data.pet.name} {color} pattern={data.pet.pattern} />
		</div>
	</section>

	<section class="flex flex-col gap-6">
		<a
			href="/pebble"
			class="inline-flex min-h-12 items-center gap-2 self-start rounded-2xl px-3 text-xl font-semibold text-muted-foreground hover:text-foreground {KID_FOCUS}"
		>
			<span aria-hidden="true">←</span> Back to {data.pet.name}
		</a>

		<!-- step dots: text label too, never colour alone -->
		<p class="text-xl text-muted-foreground">
			{#if step === 'mood'}Step 1 of 2{:else if step === 'energy'}Step 2 of 2{:else}All done!{/if}
		</p>

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
				<h1 bind:this={heading} tabindex="-1" class="text-4xl font-bold outline-none lg:text-5xl">
					How do you feel?
				</h1>
				<ChoiceGrid
					choices={CHECKIN_MOODS}
					label="How do you feel?"
					picked={mood}
					onpick={pickMood}
				/>
			{:else if step === 'energy'}
				<h1 bind:this={heading} tabindex="-1" class="text-4xl font-bold outline-none lg:text-5xl">
					How much energy?
				</h1>
				<ChoiceGrid
					choices={ENERGY_LEVELS}
					label="How much energy?"
					picked={energy}
					disabled={pending || askOpen}
					onpick={pickEnergy}
				/>
				<button
					type="button"
					onclick={startOver}
					disabled={pending}
					class="inline-flex min-h-16 items-center gap-2 self-start rounded-2xl bg-kid-surface px-6 text-xl font-semibold shadow-sm disabled:opacity-60 {KID_FOCUS}"
				>
					<span aria-hidden="true">↩</span> Change my feeling
				</button>
			{:else}
				<h1 bind:this={heading} tabindex="-1" class="text-4xl font-bold outline-none lg:text-5xl">
					Thanks for telling me!
				</h1>
				<p class="text-2xl">
					{#if shared && picked}
						<span aria-hidden="true">💌</span> I told Mom and Dad {tellText}. You can change it any
						time with a new check-in.
					{:else}
						<span aria-hidden="true">🤫</span> This one is just for you. Mom and Dad only see a short,
						kind summary of your week.
					{/if}
				</p>
				<div class="grid gap-4 sm:grid-cols-2">
					<a
						href="/pebble?done=checkin"
						class="flex min-h-20 items-center justify-center gap-3 rounded-[2rem] bg-primary px-6 text-2xl font-bold text-primary-foreground shadow-sm {KID_FOCUS}"
					>
						<span aria-hidden="true">🐢</span> Back to {data.pet.name}
					</a>
					<a
						href="/wishes"
						class="flex min-h-20 items-center justify-center gap-3 rounded-[2rem] bg-kid-surface px-6 text-2xl font-bold shadow-sm {KID_FOCUS}"
					>
						<span aria-hidden="true">⭐</span> Wish cards
					</a>
				</div>
			{/if}

			{#if pending}
				<p role="status" class="text-xl text-muted-foreground">Saving…</p>
			{/if}
			{#if error}
				<p
					role="alert"
					class="rounded-2xl bg-pebble/40 p-4 text-center text-xl text-pebble-foreground"
				>
					{error}
				</p>
			{/if}
		</form>

		{#if step === 'done' && nudge && !shared}
			<form
				method="POST"
				action="?/share"
				class="flex flex-col gap-4 rounded-[2rem] bg-kid-surface p-6 shadow-sm"
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
				<p class="text-2xl font-semibold">
					<span aria-hidden="true">🧡</span> Want a grown-up to know? You choose.
				</p>
				<div class="grid gap-4 sm:grid-cols-2">
					<button
						type="submit"
						disabled={sharing}
						class="flex min-h-20 items-center justify-center gap-3 rounded-[2rem] bg-primary px-6 text-2xl font-bold text-primary-foreground shadow-sm disabled:opacity-60 {KID_FOCUS}"
					>
						<span aria-hidden="true">💌</span> Tell Mom and Dad
					</button>
					<a
						href="/help"
						class="flex min-h-20 items-center justify-center gap-3 rounded-[2rem] bg-secondary px-6 text-2xl font-bold shadow-sm {KID_FOCUS}"
					>
						<span aria-hidden="true">🤝</span> Other grown-ups who help
					</a>
				</div>
				<p class="text-lg text-muted-foreground">
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
		{color}
		pattern={data.pet.pattern}
		{pending}
		onanswer={answerShare}
	/>
{/if}

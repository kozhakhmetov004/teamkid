<script lang="ts">
	/**
	 * "Tuck in" with Pebble (Turtle Technique): notice → stop → tuck in and take
	 * 3 slow breaths → come out. Runs entirely in the browser; nothing is saved
	 * or sent (no tracking of how a child feels here).
	 */
	import KidPebble from '#lib/components/kids/ui/KidPebble.svelte';
	import {
		BREATHS,
		breathAt,
		feelingLine,
		TUCK_FEELINGS,
		TUCK_STEPS,
		type BreathState,
		type TuckFeeling
	} from '#lib/kids/tuckIn.js';
	import Celebrate from '#lib/components/kids/ui/Celebrate.svelte';
	import KidBack from '#lib/components/kids/ui/KidBack.svelte';
	import KidStage from '#lib/components/kids/ui/KidStage.svelte';
	import StepDots from '#lib/components/kids/ui/StepDots.svelte';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let stepIndex = $state(0);
	let feeling = $state<TuckFeeling | null>(null);
	let breath = $state<BreathState>(breathAt(0));
	let running = $state(false);
	let reduceMotion = $state(false);
	let frame = 0;
	let startedAt = 0;

	const step = $derived(TUCK_STEPS[stepIndex]);
	const speech = $derived.by(() => {
		if (step.key === 'notice') return feelingLine(feeling);
		if (step.key === 'tuck') {
			if (breath.done) return 'Three turtle breaths! How does your shell feel now?';
			if (!running) return step.line;
			return breath.phase === 'in' ? 'Breathe in… slowly…' : 'And breathe out… slowly…';
		}
		return step.line;
	});

	function tick(t: number) {
		breath = breathAt(t - startedAt);
		if (breath.done) {
			running = false;
			return;
		}
		frame = requestAnimationFrame(tick);
	}

	function startBreathing() {
		reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		cancelAnimationFrame(frame);
		running = true;
		startedAt = performance.now();
		frame = requestAnimationFrame(tick);
	}

	function next() {
		if (step.key === 'out') {
			void goto('/pebble');
			return;
		}
		cancelAnimationFrame(frame);
		running = false;
		stepIndex += 1;
		if (TUCK_STEPS[stepIndex].key === 'tuck') {
			breath = breathAt(0);
			startBreathing();
		}
	}

	onDestroy(() => {
		if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame);
	});

	const bubbleScale = $derived(reduceMotion ? 1 : 0.55 + breath.size * 0.45);
	const pebbleState = $derived(
		step.key === 'tuck' && !breath.done ? 'sleepy' : step.key === 'out' ? 'proud' : 'idle'
	);
</script>

<svelte:head><title>Tuck in with Pebble · TeamKid</title></svelte:head>

<div class="k-lilac flex flex-col gap-6">
	<KidBack label="Back to Pebble" />

	<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] lg:gap-10">
		<KidStage {speech} label="Pebble" sticky={false}>
			<div class="relative grid place-items-center">
				{#if step.key === 'tuck'}
					<!-- the breathing circle grows on "in" and shrinks on "out" -->
					<div
						class="absolute inset-0 m-auto aspect-square w-full rounded-full border-4 border-white/70 bg-[radial-gradient(circle,var(--k-lilac-soft),color-mix(in_oklch,var(--k-lilac-solid)_55%,transparent))]"
						style="transform: scale({bubbleScale}); transition: transform 120ms linear"
						aria-hidden="true"
					></div>
				{/if}
				<div class="relative w-full px-6">
					<KidPebble state={pebbleState} name={data.pet.name} color={data.pet.colorKey} />
				</div>
			</div>
		</KidStage>

		<section aria-labelledby="tuck-title" class="relative flex flex-col gap-6">
			<StepDots
				total={TUCK_STEPS.length}
				current={stepIndex}
				label="Step {stepIndex + 1} of {TUCK_STEPS.length}: {step.title}"
			/>

			{#key stepIndex}
				<h1 id="tuck-title" class="k-display k-rise">{step.title}</h1>
			{/key}

			{#if step.key === 'notice'}
				<div class="grid grid-cols-2 gap-4" role="group" aria-label="How I feel">
					{#each TUCK_FEELINGS as f, i (f.key)}
						<button
							type="button"
							class="k-choice k-rise min-h-32 text-xl"
							style:animation-delay="{i * 40}ms"
							aria-pressed={feeling === f.key}
							onclick={() => (feeling = f.key)}
						>
							<span class="k-choice__icon" aria-hidden="true">{f.emoji}</span>
							{f.label}
							{#if feeling === f.key}<span class="k-choice__check" aria-hidden="true">✓</span>{/if}
						</button>
					{/each}
				</div>
			{:else if step.key === 'stop'}
				<p class="k-note k-rise text-2xl">
					<span class="k-note__icon" aria-hidden="true">✋</span> Hands still. Feet on the floor. You're
					doing great.
				</p>
			{:else if step.key === 'tuck'}
				<p class="k-note text-2xl" aria-live="polite">
					{#if breath.done}
						All three breaths done!
					{:else if running}
						Breath {breath.breath} of {BREATHS}:
						<strong
							>{breath.phase === 'in' ? 'in through your nose' : 'out through your mouth'}</strong
						>
					{:else}
						Get ready…
					{/if}
				</p>
				{#if breath.done}
					<button type="button" class="k-btn k-btn--quiet self-start" onclick={startBreathing}>
						<span class="k-btn__icon" aria-hidden="true">🔁</span> Three more breaths
					</button>
				{/if}
			{:else}
				<Celebrate />
				<p class="k-note k-sun k-rise text-2xl">
					<span class="k-note__icon" aria-hidden="true">🌟</span> When you're ready, you can tell a grown-up
					you trust how you feel.
				</p>
			{/if}

			<button
				type="button"
				class="k-btn k-btn--lg self-start"
				disabled={step.key === 'tuck' && running}
				onclick={next}
			>
				{step.button}
			</button>
		</section>
	</div>
</div>

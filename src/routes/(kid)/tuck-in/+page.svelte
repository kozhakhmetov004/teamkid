<script lang="ts">
	/**
	 * "Tuck in" with Pebble (Turtle Technique): notice → stop → tuck in and take
	 * 3 slow breaths → come out. Runs entirely in the browser; nothing is saved
	 * or sent (no tracking of how a child feels here).
	 */
	import Pebble from '#lib/components/kids/Pebble.svelte';
	import PebbleSay from '#lib/components/kids/PebbleSay.svelte';
	import {
		BREATHS,
		breathAt,
		feelingLine,
		TUCK_FEELINGS,
		TUCK_STEPS,
		type BreathState,
		type TuckFeeling
	} from '#lib/kids/tuckIn.js';
	import { KID_FOCUS, KID_FONT } from '#lib/kids/ui.js';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';

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

<div class="flex flex-col gap-6" style="font-family: {KID_FONT}">
	<a
		href="/pebble"
		class="inline-flex min-h-14 items-center gap-2 self-start rounded-2xl px-4 text-xl font-semibold text-primary {KID_FOCUS}"
	>
		<span aria-hidden="true">←</span> Back to Pebble
	</a>

	<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-10">
		<section
			aria-label="Pebble"
			class="flex flex-col gap-6 rounded-[2.5rem] bg-gradient-to-b from-kid-surface to-secondary p-6 shadow-sm lg:p-8"
		>
			<PebbleSay text={speech} />
			<div class="relative mx-auto grid w-full max-w-[24rem] place-items-center">
				{#if step.key === 'tuck'}
					<div
						class="absolute inset-0 m-auto aspect-square w-full rounded-full bg-primary/15"
						style="transform: scale({bubbleScale}); transition: transform 120ms linear"
						aria-hidden="true"
					></div>
				{/if}
				<div class="relative w-full px-6">
					<Pebble state={pebbleState} />
				</div>
			</div>
		</section>

		<section aria-labelledby="tuck-title" class="flex flex-col gap-6">
			<ol class="flex gap-2" aria-label="Steps">
				{#each TUCK_STEPS as s, i (s.key)}
					<li
						class="h-3 flex-1 rounded-full {i <= stepIndex ? 'bg-primary' : 'bg-muted'}"
						aria-current={i === stepIndex ? 'step' : undefined}
					>
						<span class="sr-only">Step {i + 1}: {s.title}</span>
					</li>
				{/each}
			</ol>

			<h1 id="tuck-title" class="text-4xl font-bold lg:text-5xl">{step.title}</h1>

			{#if step.key === 'notice'}
				<div class="grid grid-cols-2 gap-4" role="group" aria-label="How I feel">
					{#each TUCK_FEELINGS as f (f.key)}
						<button
							type="button"
							class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl bg-kid-surface text-xl font-semibold shadow-sm {feeling ===
							f.key
								? 'ring-4 ring-primary'
								: ''} {KID_FOCUS}"
							aria-pressed={feeling === f.key}
							onclick={() => (feeling = f.key)}
						>
							<span class="text-4xl" aria-hidden="true">{f.emoji}</span>
							{f.label}
						</button>
					{/each}
				</div>
			{:else if step.key === 'stop'}
				<p class="text-2xl">
					<span aria-hidden="true">✋</span> Hands still. Feet on the floor. You're doing great.
				</p>
			{:else if step.key === 'tuck'}
				<p class="text-2xl" aria-live="polite">
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
					<button
						type="button"
						class="min-h-14 self-start rounded-2xl bg-kid-surface px-5 text-xl shadow-sm {KID_FOCUS}"
						onclick={startBreathing}
					>
						<span aria-hidden="true">🔁</span> Three more breaths
					</button>
				{/if}
			{:else}
				<p class="text-2xl">
					<span aria-hidden="true">🌟</span> When you're ready, you can tell a grown-up you trust how
					you feel.
				</p>
			{/if}

			<button
				type="button"
				class="min-h-16 self-start rounded-2xl bg-primary px-8 text-2xl font-bold text-primary-foreground shadow-sm disabled:opacity-50 {KID_FOCUS}"
				disabled={step.key === 'tuck' && running}
				onclick={next}
			>
				{step.button}
			</button>
		</section>
	</div>
</div>

<script lang="ts">
	/**
	 * Kid login, in the kids' "pond world" look (same design kit as the kid pages:
	 * kid.css + Nunito, loaded here because this page is outside the (kid) frame).
	 * Desktop layout: Pebble's scene on the left, the sign-in card on the right.
	 * The PIN can be typed or clicked on the big number pad; the server logic is unchanged.
	 */
	import '@fontsource-variable/nunito';
	import '#lib/components/kids/ui/kid.css';
	import { enhance } from '$app/forms';
	import type { PebbleState } from '#lib/components/kids/Pebble.svelte';
	import KidPebble from '#lib/components/kids/ui/KidPebble.svelte';
	import KidStage from '#lib/components/kids/ui/KidStage.svelte';
	import TurtleMark from '#lib/components/landing/TurtleMark.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const PIN_MAX = 6;
	let pending = $state(false);
	let pin = $state('');
	let showPin = $state(false);

	const speech = $derived(
		pending
			? 'Yay! Hold on, I’m swimming over to you…'
			: form?.message
				? 'That’s okay! Let’s try again together. Check your code and your PIN.'
				: data.reason === 'inactive'
					? 'We’re almost ready! Your grown-ups just need to say yes first.'
					: 'Hi, I’m Pebble! Type your family code and your secret PIN, and I’ll take you home.'
	);
	const mood = $derived<PebbleState>(pending ? 'happy' : 'idle');

	function press(digit: string) {
		if (pin.length < PIN_MAX) pin += digit;
	}
	function onPinInput() {
		pin = pin.replace(/\D/g, '').slice(0, PIN_MAX);
	}
</script>

<svelte:head><title>Kid login · TeamKid</title></svelte:head>

<div class="kid-app relative isolate flex min-h-dvh flex-col overflow-x-clip text-lg">
	<header class="relative z-10">
		<div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-4">
			<a
				href="/"
				class="group flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-xl font-black"
			>
				<span
					class="grid size-11 place-items-center rounded-full bg-white shadow-[0_3px_0_oklch(0.87_0.025_200)] transition-transform group-hover:-rotate-6"
				>
					<TurtleMark class="size-8" />
				</span>
				TeamKid
			</a>
			<a href="/login" class="k-btn k-btn--sm k-btn--quiet">
				<span aria-hidden="true">🧑</span> Grown-up? Log in here
			</a>
		</div>
	</header>

	<main
		class="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 pt-4 pb-32 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
	>
		<KidStage {speech} label="Pebble the turtle" petWidth="24rem" sticky={false}>
			<KidPebble state={mood} hint="Spin me around!" />
		</KidStage>

		<section aria-labelledby="login-title" class="k-mint flex flex-col gap-6">
			<header class="k-rise flex flex-col items-start gap-3">
				<span class="k-eyebrow"><span aria-hidden="true">🔑</span> Kid login</span>
				<h1 id="login-title" class="k-display">Hi! Let's find Pebble</h1>
			</header>

			{#if data.reason === 'inactive'}
				<p role="status" class="k-note k-sun">
					<span class="k-note__icon" aria-hidden="true">⏳</span> Almost there! Ask both grown-ups to
					say yes first.
				</p>
			{/if}

			<form
				method="POST"
				class="k-card k-rise flex flex-col gap-6 p-7"
				style:animation-delay="60ms"
				use:enhance={() => {
					pending = true;
					return async ({ update }) => {
						await update();
						pending = false;
						pin = '';
					};
				}}
			>
				<label class="flex flex-col gap-2">
					<span class="flex items-center gap-2 text-xl font-extrabold">
						<span aria-hidden="true">🏡</span> Family code
					</span>
					<input
						name="familyCode"
						required
						autocomplete="off"
						autocapitalize="characters"
						spellcheck="false"
						placeholder="TURTLE-1234"
						value={form?.values?.familyCode ?? ''}
						class="h-16 rounded-[1.25rem] border-[3px] border-[var(--k-line)] bg-[var(--kid-surface)] px-5 text-center text-2xl font-extrabold tracking-[0.2em] uppercase shadow-[inset_0_3px_0_oklch(0.93_0.015_200)] placeholder:text-muted-foreground/50 focus:border-[var(--a-edge)]"
					/>
					<span class="text-base font-semibold text-muted-foreground"
						>Your grown-up can find it on their Family page.</span
					>
				</label>

				<div class="flex flex-col gap-3">
					<label for="kid-pin" class="flex items-center gap-2 text-xl font-extrabold">
						<span aria-hidden="true">🤫</span> My secret PIN
					</label>
					<div class="flex items-center gap-3">
						<input
							id="kid-pin"
							name="pin"
							type={showPin ? 'text' : 'password'}
							required
							inputmode="numeric"
							pattern={'[0-9]{4,6}'}
							minlength="4"
							maxlength={PIN_MAX}
							autocomplete="off"
							placeholder="••••"
							bind:value={pin}
							oninput={onPinInput}
							class="h-16 min-w-0 flex-1 rounded-[1.25rem] border-[3px] border-[var(--k-line)] bg-[var(--kid-surface)] px-5 text-center text-3xl font-black tracking-[0.5em] shadow-[inset_0_3px_0_oklch(0.93_0.015_200)] placeholder:text-muted-foreground/40 focus:border-[var(--a-edge)]"
						/>
						<button
							type="button"
							class="k-btn k-btn--quiet !min-h-16 !px-4"
							aria-pressed={showPin}
							onclick={() => (showPin = !showPin)}
						>
							<span class="k-btn__icon" aria-hidden="true">{showPin ? '🙈' : '👀'}</span>
							{showPin ? 'Hide' : 'Show'}
						</button>
					</div>

					<!-- big number pad: tap the numbers, or type them -->
					<div class="grid grid-cols-3 gap-3" role="group" aria-label="Number pad for my PIN">
						{#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as d (d)}
							<button
								type="button"
								class="k-btn k-btn--quiet !min-h-14 text-2xl"
								onclick={() => press(d)}
								disabled={pending}>{d}</button
							>
						{/each}
						<button
							type="button"
							class="k-btn k-btn--quiet k-peach !min-h-14"
							onclick={() => (pin = '')}
							disabled={pending || !pin}
						>
							Clear
						</button>
						<button
							type="button"
							class="k-btn k-btn--quiet !min-h-14 text-2xl"
							onclick={() => press('0')}
							disabled={pending}>0</button
						>
						<button
							type="button"
							class="k-btn k-btn--quiet !min-h-14"
							onclick={() => (pin = pin.slice(0, -1))}
							disabled={pending || !pin}
							aria-label="Delete the last number"
						>
							<span class="k-btn__icon" aria-hidden="true">⌫</span>
						</button>
					</div>
				</div>

				{#if form?.message}
					<p role="alert" class="k-note k-peach justify-center text-center">
						{form.message}
					</p>
				{/if}

				<button type="submit" disabled={pending} class="k-btn k-btn--lg k-btn--block">
					<span class="k-btn__icon" aria-hidden="true">🐢</span>
					{pending ? 'Finding Pebble…' : "Let's go!"}
				</button>
			</form>

			<p class="text-base font-semibold text-muted-foreground">
				<span aria-hidden="true">💡</span> Forgot your code or PIN? Ask a grown-up to help you.
			</p>
		</section>
	</main>

	<!-- soft pond waves along the bottom (decorative; same as the kids' frame) -->
	<svg
		class="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 w-full"
		viewBox="0 0 1440 160"
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		<path
			d="M0 70 C 240 30 420 110 720 70 C 1020 30 1200 100 1440 60 V160 H0 Z"
			fill="oklch(0.9 0.06 175 / 0.55)"
		/>
		<path
			d="M0 105 C 300 70 520 140 820 102 C 1080 70 1260 125 1440 98 V160 H0 Z"
			fill="oklch(0.84 0.08 172 / 0.55)"
		/>
		<g fill="oklch(0.74 0.11 150 / 0.7)">
			<ellipse cx="180" cy="118" rx="38" ry="9" />
			<ellipse cx="1210" cy="112" rx="30" ry="7" />
			<ellipse cx="760" cy="135" rx="24" ry="6" />
		</g>
	</svg>
</div>

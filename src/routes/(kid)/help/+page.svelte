<script lang="ts">
	/**
	 * "I need a grown-up": preset choices only (no typing). Pebble answers at
	 * once with a calm, pre-written reply (shown even if the network fails),
	 * and both parents get an alert with the category only.
	 */
	import { enhance } from '$app/forms';
	import Pebble from '#lib/components/kids/Pebble.svelte';
	import PebbleSay from '#lib/components/kids/PebbleSay.svelte';
	import { HELP_OPTIONS, helpOption } from '#lib/safety/help.js';
	import { KID_FOCUS, KID_FONT } from '#lib/kids/ui.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let chosen = $state<string | null>(null);
	let sent = $state(false);

	// `form.need` covers the no-JavaScript case (plain POST + page reload).
	const option = $derived(
		helpOption(chosen ?? (form && 'need' in form ? String(form.need) : '')) ?? null
	);
	const failed = $derived(form && 'message' in form && form.form === 'help');
</script>

<svelte:head><title>I need a grown-up · TeamKid</title></svelte:head>

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
			<PebbleSay
				text={option?.reply ??
					'I’m here with you. Tap what’s happening, and I’ll help you get a grown-up.'}
			/>
			<div class="mx-auto w-full max-w-[22rem] px-4">
				<Pebble state="idle" />
			</div>
		</section>

		<section aria-labelledby="help-title" class="flex flex-col gap-5">
			<h1 id="help-title" class="text-4xl font-bold lg:text-5xl">I need a grown-up</h1>

			{#if !option}
				<form
					method="POST"
					class="grid gap-4"
					use:enhance={({ formData }) => {
						// Swap to Pebble's reply only once the request is on its way. Changing
						// the view in the button's onclick removed the form before the browser
						// submitted it, so the alert never reached the server.
						chosen = String(formData.get('need') ?? '');
						return async ({ update }) => {
							sent = true;
							await update({ reset: false });
						};
					}}
				>
					{#each HELP_OPTIONS as o (o.key)}
						<button
							type="submit"
							name="need"
							value={o.key}
							class="flex min-h-20 items-center gap-4 rounded-3xl bg-kid-surface px-6 text-left text-2xl font-semibold shadow-sm {KID_FOCUS}"
						>
							<span class="text-4xl" aria-hidden="true">{o.emoji}</span>
							{o.label}
						</button>
					{/each}
				</form>
			{:else}
				<div class="flex flex-col gap-4 text-2xl" aria-live="assertive">
					{#if option.level === 'crisis'}
						<p class="rounded-3xl bg-kid-surface p-5 shadow-sm">
							<span aria-hidden="true">📞</span> Call or text <strong>988</strong> any time.
							<br /><span aria-hidden="true">🚑</span> In danger right now? Call
							<strong>911</strong>.
						</p>
					{/if}
					{#if failed}
						<p class="rounded-3xl bg-destructive/10 p-5 text-destructive" role="alert">
							{form?.message}
						</p>
					{:else if sent || (form && 'ok' in form)}
						<p class="rounded-3xl bg-kid-surface p-5 shadow-sm">
							<span aria-hidden="true">💌</span> I let your grown-ups know you asked for help.
						</p>
					{/if}
					<a
						href="/tuck-in"
						class="inline-flex min-h-16 items-center gap-3 self-start rounded-2xl bg-primary px-6 text-xl font-bold text-primary-foreground {KID_FOCUS}"
					>
						<span aria-hidden="true">🐢</span> Breathe with Pebble
					</a>
				</div>
			{/if}
		</section>
	</div>
</div>

<script lang="ts">
	/**
	 * "I need a grown-up": preset choices only (no typing). Pebble answers at
	 * once with a calm, pre-written reply (shown even if the network fails),
	 * and both parents get an alert with the category only.
	 */
	import { enhance } from '$app/forms';
	import Pebble from '#lib/components/kids/Pebble.svelte';
	import { HELP_OPTIONS, helpOption } from '#lib/safety/help.js';
	import KidBack from '#lib/components/kids/ui/KidBack.svelte';
	import KidStage from '#lib/components/kids/ui/KidStage.svelte';
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

<div class="k-rose flex flex-col gap-6">
	<KidBack label="Back to Pebble" />

	<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] lg:gap-10">
		<KidStage
			speech={option?.reply ??
				'I’m here with you. Tap what’s happening, and I’ll help you get a grown-up.'}
			label="Pebble"
			petWidth="22rem"
			sticky={false}
		>
			<Pebble state="idle" />
		</KidStage>

		<section aria-labelledby="help-title" class="flex flex-col gap-5">
			<span class="k-eyebrow self-start"><span aria-hidden="true">🧡</span> You are not alone</span>
			<h1 id="help-title" class="k-display">I need a grown-up</h1>

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
							class="k-choice min-h-24 !flex-row !justify-start gap-4 px-5 text-left text-2xl"
						>
							<span
								class="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--a-soft)] text-4xl"
								aria-hidden="true">{o.emoji}</span
							>
							{o.label}
						</button>
					{/each}
				</form>
			{:else}
				<div class="flex flex-col gap-4 text-2xl" aria-live="assertive">
					{#if option.level === 'crisis'}
						<p class="k-card border-[var(--a-edge)] p-5 font-bold">
							<span aria-hidden="true">📞</span> Call or text <strong>988</strong> any time.
							<br /><span aria-hidden="true">🚑</span> In danger right now? Call
							<strong>911</strong>.
						</p>
					{/if}
					{#if failed}
						<p class="k-note bg-destructive/10 text-destructive" role="alert">
							{form?.message}
						</p>
					{:else if sent || (form && 'ok' in form)}
						<p class="k-note k-mint">
							<span class="k-note__icon" aria-hidden="true">💌</span> I let your grown-ups know you asked
							for help.
						</p>
					{/if}
					<a href="/tuck-in" class="k-btn k-btn--lg k-lilac self-start">
						<span class="k-btn__icon" aria-hidden="true">🐢</span> Breathe with Pebble
					</a>
				</div>
			{/if}
		</section>
	</div>
</div>

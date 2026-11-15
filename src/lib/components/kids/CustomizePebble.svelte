<script lang="ts">
	/**
	 * "Customize Pebble": a preset name or the child's own name, plus 4 shell colours.
	 * The 3D Pebble in the preview recolours as soon as a colour is tapped.
	 * Native radio groups give arrow-key navigation and Space/Enter for free.
	 *
	 * Own name: letters only, up to PET_NAME_MAX. The server runs the safety check
	 * first (big feelings → Pebble's calm reply + help link; the name isn't saved),
	 * then the name rules, and answers with a gentle "try again" line if needed.
	 * Saves through the page's ?/customize form action.
	 */
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import KidPebble from './ui/KidPebble.svelte';
	import { PET_NAME_MAX, PET_NAMES, SHELL_COLORS, type ShellColorKey } from '#lib/kids/pet.js';
	import { shell3d } from '#lib/kids/shell3d.js';
	import { KID_FONT } from '#lib/kids/ui.js';

	let {
		name,
		colorKey,
		onsaved
	}: {
		name: string;
		colorKey: ShellColorKey;
		onsaved?: (name: string) => void;
	} = $props();

	const uid = $props.id();
	/** The "My own name" choice in the name radio group. */
	const OWN = '__own__';
	const isPreset = (n: string) => (PET_NAMES as readonly string[]).includes(n);

	let open = $state(false);
	let pending = $state(false);
	let choice = $state<string>('Pebble');
	let ownName = $state('');
	let pickedColor = $state<ShellColorKey>('forest');
	let error = $state('');
	/** Pebble's calm reply when the typed name sounded like a big feeling. */
	let bigFeeling = $state('');
	let ownInput: HTMLInputElement | undefined = $state();

	/** What gets saved: the preset, or the typed name. */
	const finalName = $derived(choice === OWN ? ownName.trim() : choice);
	const shownName = $derived(finalName || 'Pebble');

	function reset() {
		if (isPreset(name)) {
			choice = name;
			ownName = '';
		} else {
			choice = OWN;
			ownName = name;
		}
		pickedColor = colorKey;
		error = '';
		bigFeeling = '';
	}

	async function pickOwn() {
		await tick();
		ownInput?.focus();
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(o) => {
		if (o) reset();
	}}
>
	<Dialog.Trigger class="k-btn k-btn--quiet">
		<span class="k-btn__icon" aria-hidden="true">🎨</span> Customize {name}
	</Dialog.Trigger>

	<Dialog.Content
		class="k-mint max-h-[90dvh] overflow-y-auto rounded-[2.25rem] border-[3px] border-white bg-[linear-gradient(180deg,var(--k-sky-soft),var(--kid-surface)_45%)] p-7 text-lg shadow-[0_8px_0_oklch(0.86_0.035_205),var(--k-shadow)] sm:max-w-3xl sm:p-9"
		style="font-family: {KID_FONT}"
	>
		<form
			method="POST"
			action="?/customize"
			class="grid gap-6"
			use:enhance={({ cancel }) => {
				error = '';
				bigFeeling = '';
				if (!finalName) {
					error = 'Type a name in the box, or pick one of mine!';
					cancel();
					void pickOwn();
					return;
				}
				pending = true;
				return async ({ result, update }) => {
					pending = false;
					if (result.type === 'success' && result.data?.status === 'big_feeling') {
						// not saved: Pebble answers calmly and points to a grown-up
						bigFeeling = String(result.data.reply ?? '');
						ownName = '';
						return;
					}
					if (result.type === 'success') {
						open = false;
						onsaved?.(String(result.data?.name ?? finalName));
						await update({ reset: false });
						return;
					}
					error =
						result.type === 'failure' && typeof result.data?.message === 'string'
							? result.data.message
							: 'Oops, that did not save. Try again?';
					if (choice === OWN) void pickOwn();
				};
			}}
		>
			<input type="hidden" name="name" value={finalName} />

			<Dialog.Header>
				<Dialog.Title class="text-3xl font-black tracking-tight">Make me yours!</Dialog.Title>
				<Dialog.Description class="text-xl font-semibold text-muted-foreground">
					Pick a name (or make one up!) and a shell color.
				</Dialog.Description>
			</Dialog.Header>

			<div class="grid items-start gap-6 md:grid-cols-[14rem_1fr]">
				<div class="mx-auto w-56 md:sticky md:top-0">
					<KidPebble state="happy" name={shownName} color={pickedColor} follow={false} />
					<p class="mt-2 text-center text-2xl font-black break-words">{shownName}</p>
				</div>

				<div class="grid gap-6">
					<fieldset>
						<legend class="mb-3 text-2xl font-extrabold">My name</legend>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{#each PET_NAMES as n (n)}
								<label
									class="k-choice min-h-16 !flex-row px-3 text-2xl has-checked:border-[var(--a-edge)] has-checked:bg-[var(--a-soft)] has-focus-visible:outline-4 has-focus-visible:outline-[var(--ring)]"
								>
									<input
										type="radio"
										name="nameChoice"
										value={n}
										bind:group={choice}
										class="sr-only"
									/>
									{#if choice === n}<span aria-hidden="true">✓</span>{/if}
									{n}
								</label>
							{/each}
							<label
								class="k-choice k-choice--dashed col-span-2 min-h-16 !flex-row px-3 text-2xl has-checked:border-solid has-checked:border-[var(--a-edge)] has-checked:bg-[var(--a-soft)] has-focus-visible:outline-4 has-focus-visible:outline-[var(--ring)] sm:col-span-3"
							>
								<input
									type="radio"
									name="nameChoice"
									value={OWN}
									bind:group={choice}
									onchange={pickOwn}
									class="sr-only"
								/>
								{#if choice === OWN}<span aria-hidden="true">✓</span>{:else}<span aria-hidden="true"
										>✏️</span
									>{/if}
								My own name
							</label>
						</div>

						{#if choice === OWN}
							<div class="k-rise mt-4 grid gap-2">
								<label for="{uid}-own" class="text-xl font-extrabold">Type my new name</label>
								<input
									bind:this={ownInput}
									id="{uid}-own"
									type="text"
									bind:value={ownName}
									maxlength={PET_NAME_MAX}
									autocomplete="off"
									autocapitalize="words"
									spellcheck="false"
									aria-describedby="{uid}-own-hint"
									class="min-h-16 rounded-[1.25rem] border-[3px] border-[var(--k-line)] bg-[var(--kid-surface)] px-5 text-2xl font-extrabold shadow-[inset_0_3px_0_oklch(0.93_0.015_200)] focus:border-[var(--a-edge)]"
								/>
								<p id="{uid}-own-hint" class="text-base font-semibold text-muted-foreground">
									{[...ownName].length}/{PET_NAME_MAX} · Letters only. A pet name, not a real person’s
									name.
								</p>
							</div>
						{/if}
					</fieldset>

					<fieldset>
						<legend class="mb-3 text-2xl font-extrabold">My shell color</legend>
						<div class="grid grid-cols-2 gap-3">
							{#each SHELL_COLORS as c (c.key)}
								<label
									class="k-choice min-h-16 !flex-row !justify-start gap-3 px-4 text-xl has-checked:border-[var(--a-edge)] has-checked:bg-[var(--a-soft)] has-focus-visible:outline-4 has-focus-visible:outline-[var(--ring)]"
								>
									<input
										type="radio"
										name="color"
										value={c.key}
										bind:group={pickedColor}
										class="sr-only"
									/>
									<span
										class="size-10 shrink-0 rounded-full border-4"
										style:background-color={shell3d(c.key).plate}
										style:border-color={shell3d(c.key).rim}
										aria-hidden="true"
									></span>
									{c.label}
									{#if pickedColor === c.key}<span aria-hidden="true" class="ml-auto">✓</span>{/if}
								</label>
							{/each}
						</div>
					</fieldset>
				</div>
			</div>

			{#if bigFeeling}
				<div role="alert" class="k-note k-sky flex-col !items-start gap-3">
					<p><span aria-hidden="true">🧡</span> {bigFeeling}</p>
					<a href="/help" class="k-btn k-rose">
						<span class="k-btn__icon" aria-hidden="true">🆘</span> I need a grown-up
					</a>
				</div>
			{/if}
			{#if error}
				<p role="alert" class="k-note k-peach justify-center text-center">
					{error}
				</p>
			{/if}

			<div class="grid gap-3 sm:grid-cols-2">
				<Dialog.Close type="button" class="k-btn k-btn--lg k-btn--quiet">Not now</Dialog.Close>
				<button type="submit" disabled={pending} class="k-btn k-btn--lg k-mint">
					{pending ? 'Saving…' : 'Save'}
				</button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

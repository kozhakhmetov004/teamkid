<script lang="ts">
	/**
	 * "Customize Pebble": click-only picker (preset names + 4 shell colours).
	 * Native radio groups give arrow-key navigation and Space/Enter for free.
	 * Saves through the page's ?/customize form action.
	 */
	import { enhance } from '$app/forms';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import Pebble from './Pebble.svelte';
	import {
		PET_NAMES,
		SHELL_COLORS,
		shellColorByKey,
		type ShellColorKey,
		type ShellPatternKey
	} from '#lib/kids/pet.js';
	import { KID_FONT } from '#lib/kids/ui.js';

	let {
		name,
		colorKey,
		pattern,
		onsaved
	}: {
		name: string;
		colorKey: ShellColorKey;
		pattern: ShellPatternKey | null;
		onsaved?: (name: string) => void;
	} = $props();

	let open = $state(false);
	let pending = $state(false);
	let pickedName = $state('Pebble');
	let pickedColor = $state<ShellColorKey>('forest');
	let error = $state('');

	function reset() {
		pickedName = (PET_NAMES as readonly string[]).includes(name) ? name : 'Pebble';
		pickedColor = colorKey;
		error = '';
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
			use:enhance={() => {
				pending = true;
				error = '';
				return async ({ result, update }) => {
					pending = false;
					if (result.type === 'success') {
						open = false;
						onsaved?.(pickedName);
						await update({ reset: false });
					} else {
						error = 'Oops, that did not save. Try again?';
					}
				};
			}}
		>
			<Dialog.Header>
				<Dialog.Title class="text-3xl font-bold">Make me yours!</Dialog.Title>
				<Dialog.Description class="text-xl text-muted-foreground">
					Pick a name and a shell color.
				</Dialog.Description>
			</Dialog.Header>

			<div class="grid items-start gap-6 md:grid-cols-[14rem_1fr]">
				<div class="mx-auto w-56 md:sticky md:top-0">
					<Pebble state="happy" name={pickedName} color={shellColorByKey(pickedColor)} {pattern} />
					<p class="mt-2 text-center text-2xl font-bold">{pickedName}</p>
				</div>

				<div class="grid gap-6">
					<fieldset>
						<legend class="mb-3 text-2xl font-bold">My name</legend>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{#each PET_NAMES as n (n)}
								<label
									class="flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border-4 bg-kid-surface px-3 text-2xl font-bold transition has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-4 has-focus-visible:ring-ring {pickedName ===
									n
										? 'border-primary'
										: 'border-transparent'}"
								>
									<input
										type="radio"
										name="name"
										value={n}
										bind:group={pickedName}
										class="sr-only"
									/>
									{#if pickedName === n}<span aria-hidden="true" class="mr-2">✓</span>{/if}
									{n}
								</label>
							{/each}
						</div>
					</fieldset>

					<fieldset>
						<legend class="mb-3 text-2xl font-bold">My shell color</legend>
						<div class="grid grid-cols-2 gap-3">
							{#each SHELL_COLORS as c (c.key)}
								<label
									class="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-4 bg-kid-surface px-4 text-xl font-bold transition has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-4 has-focus-visible:ring-ring {pickedColor ===
									c.key
										? 'border-primary'
										: 'border-transparent'}"
								>
									<input
										type="radio"
										name="color"
										value={c.key}
										bind:group={pickedColor}
										class="sr-only"
									/>
									<span
										class="size-10 shrink-0 rounded-full border-2 border-black/10"
										style:background-color={c.hex}
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

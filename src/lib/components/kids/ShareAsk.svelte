<script lang="ts">
	/**
	 * "Tell Mom and Dad?" Centred modal with two equal buttons. Default is private:
	 * closing (Esc / outside click) counts as "Keep it just for me", and that
	 * button gets focus first. No pressure either way.
	 */
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import Pebble from './Pebble.svelte';
	import { wishAsk } from '#lib/kids/pebbleLines.js';
	import type { ShellColor, ShellPatternKey } from '#lib/kids/pet.js';
	import { KID_FOCUS, KID_FONT } from '#lib/kids/ui.js';

	let {
		open = $bindable(false),
		ask = '',
		question,
		icon,
		petName,
		color,
		pattern,
		pending = false,
		onanswer
	}: {
		open?: boolean;
		/** Wish wording ("go to the zoo"), turned into Pebble's question. */
		ask?: string;
		/** A full question instead of the wish wording (e.g. the mood check-in). */
		question?: string;
		icon: string;
		petName: string;
		color: ShellColor;
		pattern: ShellPatternKey | null;
		pending?: boolean;
		onanswer: (share: boolean) => void;
	} = $props();

	let keepButton: HTMLButtonElement | undefined = $state();
	let answered = false;

	$effect(() => {
		if (open) answered = false;
	});

	function answer(share: boolean) {
		if (answered) return;
		answered = true;
		onanswer(share);
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(o) => {
		if (!o) answer(false);
	}}
>
	<Dialog.Content
		showCloseButton={false}
		class="rounded-[2rem] bg-kid-background p-8 text-lg sm:max-w-2xl"
		style="font-family: {KID_FONT}"
		onOpenAutoFocus={(e) => {
			e.preventDefault();
			keepButton?.focus();
		}}
	>
		<div class="grid items-center gap-6 sm:grid-cols-[10rem_1fr]">
			<div class="mx-auto w-40">
				<Pebble state="happy" name={petName} {color} {pattern} />
			</div>
			<div class="grid gap-3">
				<Dialog.Title class="text-3xl leading-snug font-bold">
					<span aria-hidden="true">{icon}</span>
					{question ?? wishAsk(ask)}
				</Dialog.Title>
				<Dialog.Description class="text-xl text-muted-foreground">
					You choose. Both answers are okay!
				</Dialog.Description>
			</div>
		</div>

		<div class="mt-4 grid grid-cols-2 gap-4">
			<button
				bind:this={keepButton}
				type="button"
				disabled={pending}
				onclick={() => answer(false)}
				class="flex min-h-20 items-center justify-center gap-2 rounded-[1.5rem] bg-kid-surface px-4 text-2xl font-bold shadow-sm disabled:opacity-60 {KID_FOCUS}"
			>
				<span aria-hidden="true">🤫</span> Keep it just for me
			</button>
			<button
				type="button"
				disabled={pending}
				onclick={() => answer(true)}
				class="flex min-h-20 items-center justify-center gap-2 rounded-[1.5rem] bg-primary px-4 text-2xl font-bold text-primary-foreground shadow-sm disabled:opacity-60 {KID_FOCUS}"
			>
				<span aria-hidden="true">💌</span> Yes, tell them
			</button>
		</div>
	</Dialog.Content>
</Dialog.Root>

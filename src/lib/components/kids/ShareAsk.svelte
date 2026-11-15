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
	import { KID_FONT } from '#lib/kids/ui.js';

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
		class="k-mint overflow-hidden rounded-[2.25rem] border-[3px] border-white bg-[linear-gradient(180deg,var(--k-sky-soft),var(--kid-surface)_55%)] p-7 text-lg shadow-[0_8px_0_oklch(0.86_0.035_205),var(--k-shadow)] sm:max-w-2xl sm:p-9"
		style="font-family: {KID_FONT}"
		onOpenAutoFocus={(e) => {
			e.preventDefault();
			keepButton?.focus();
		}}
	>
		<div class="grid items-center gap-6 sm:grid-cols-[10rem_1fr]">
			<div class="k-float mx-auto w-40">
				<Pebble state="happy" name={petName} {color} {pattern} />
			</div>
			<div class="grid gap-3">
				<Dialog.Title class="text-3xl leading-snug font-black tracking-tight">
					<span aria-hidden="true">{icon}</span>
					{question ?? wishAsk(ask)}
				</Dialog.Title>
				<Dialog.Description class="text-xl font-semibold text-muted-foreground">
					You choose. Both answers are okay!
				</Dialog.Description>
			</div>
		</div>

		<div class="mt-6 grid gap-4 sm:grid-cols-2">
			<button
				bind:this={keepButton}
				type="button"
				disabled={pending}
				onclick={() => answer(false)}
				class="k-btn k-btn--lg k-btn--quiet"
			>
				<span class="k-btn__icon" aria-hidden="true">🤫</span> Keep it just for me
			</button>
			<button
				type="button"
				disabled={pending}
				onclick={() => answer(true)}
				class="k-btn k-btn--lg k-peach"
			>
				<span class="k-btn__icon" aria-hidden="true">💌</span> Yes, tell them
			</button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<script lang="ts" generics="V extends string | number">
	/**
	 * Big picture-choice grid for kids (moods, energy, wish options).
	 * Keyboard: arrow keys move focus (Home/End too), Enter/Space or click picks.
	 * Every choice has an icon AND a word; the picked one also shows "✓".
	 */
	import { KID_FOCUS } from '#lib/kids/ui.js';

	interface Choice {
		value: V;
		label: string;
		icon: string;
	}

	let {
		choices,
		label,
		picked = null,
		cols = 3,
		disabled = false,
		onpick
	}: {
		choices: readonly Choice[];
		/** Accessible name of the group (the question). */
		label: string;
		picked?: V | null;
		cols?: 2 | 3;
		disabled?: boolean;
		onpick: (value: V) => void;
	} = $props();

	let buttons: HTMLButtonElement[] = $state([]);
	let focusIndex = $state(0);

	$effect(() => {
		const i = choices.findIndex((c) => c.value === picked);
		focusIndex = i >= 0 ? i : 0;
	});

	function move(to: number) {
		const n = choices.length;
		focusIndex = (to + n) % n;
		buttons[focusIndex]?.focus();
	}

	function onkeydown(e: KeyboardEvent, i: number) {
		const keys: Record<string, number> = {
			ArrowRight: i + 1,
			ArrowLeft: i - 1,
			ArrowDown: i + cols,
			ArrowUp: i - cols,
			Home: 0,
			End: choices.length - 1
		};
		if (e.key in keys) {
			e.preventDefault();
			move(keys[e.key]);
		}
	}
</script>

<div
	role="radiogroup"
	aria-label={label}
	class="grid gap-4 {cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}"
>
	{#each choices as choice, i (choice.value)}
		{@const isPicked = picked === choice.value}
		<button
			bind:this={buttons[i]}
			type="button"
			role="radio"
			aria-checked={isPicked}
			tabindex={i === focusIndex ? 0 : -1}
			{disabled}
			onclick={() => onpick(choice.value)}
			onkeydown={(e) => onkeydown(e, i)}
			onfocus={() => (focusIndex = i)}
			class="relative flex min-h-40 flex-col items-center justify-center gap-3 rounded-[2rem] border-4 bg-kid-surface p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 {isPicked
				? 'border-primary bg-secondary'
				: 'border-transparent'} {KID_FOCUS}"
		>
			<span class="text-6xl leading-none" aria-hidden="true">{choice.icon}</span>
			<span class="text-2xl font-bold">{choice.label}</span>
			{#if isPicked}
				<span
					class="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground"
					aria-hidden="true">✓</span
				>
			{/if}
		</button>
	{/each}
</div>

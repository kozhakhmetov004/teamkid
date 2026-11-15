<script lang="ts" generics="V extends string | number">
	/**
	 * Big picture-choice grid for kids (moods, energy, wish options).
	 * Keyboard: arrow keys move focus (Home/End too), Enter/Space or click picks.
	 * Every choice has an icon AND a word; the picked one also shows "✓".
	 */
	import type { KidAccent } from './ui/KidTile.svelte';

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
		accent = 'mint',
		onpick
	}: {
		choices: readonly Choice[];
		/** Accessible name of the group (the question). */
		label: string;
		picked?: V | null;
		cols?: 2 | 3;
		disabled?: boolean;
		/** Colour family of the picked card. */
		accent?: KidAccent;
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
	class="k-{accent} grid gap-4 {cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}"
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
			class="k-choice k-rise min-h-40"
			style:animation-delay="{i * 40}ms"
		>
			<span class="k-choice__icon" aria-hidden="true">{choice.icon}</span>
			<span class="text-2xl font-extrabold">{choice.label}</span>
			{#if isPicked}
				<span class="k-choice__check" aria-hidden="true">✓</span>
			{/if}
		</button>
	{/each}
</div>

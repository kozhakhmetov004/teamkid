<script lang="ts">
	/**
	 * "What should we carry in our shell to Dad's?" Shown the day before (or the
	 * day of) a switch. Items come from packingList(): the base list plus things
	 * for the plans at that home (e.g. a swimsuit for "Swim class"). Ticks live
	 * only in this browser (localStorage, per switch date); nothing is sent
	 * anywhere. No pressure: nothing happens if skipped.
	 */
	import type { PackItem } from '#lib/kids/packing.js';
	import Celebrate from './ui/Celebrate.svelte';

	let { person, date, items }: { person: string; date: string; items: PackItem[] } = $props();

	const storageKey = $derived(`teamkid:packing:${date}`);
	let packed = $state<string[]>([]);

	$effect(() => {
		try {
			packed = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
		} catch {
			packed = [];
		}
	});

	function toggle(key: string) {
		packed = packed.includes(key) ? packed.filter((k) => k !== key) : [...packed, key];
		try {
			localStorage.setItem(storageKey, JSON.stringify(packed));
		} catch {
			// Private window: ticks just aren't remembered.
		}
	}

	const done = $derived(items.every((i) => packed.includes(i.key)));
</script>

<section
	aria-labelledby="pack-title"
	class="k-card k-card--accent k-sun relative flex flex-col gap-5 p-6"
>
	<div class="flex items-start gap-4">
		<span
			class="grid size-16 shrink-0 place-items-center rounded-[1.4rem] bg-[var(--a-solid)] text-4xl shadow-[inset_0_-5px_0_var(--a-edge)]"
			aria-hidden="true">🎒</span
		>
		<div>
			<h2 id="pack-title" class="k-title">What should we carry in our shell to {person}’s?</h2>
			<p class="mt-1 text-lg font-bold text-muted-foreground">
				{packed.filter((k) => items.some((i) => i.key === k)).length} of {items.length} packed
			</p>
		</div>
	</div>
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
		{#each items as item (item.key)}
			{@const on = packed.includes(item.key)}
			<li>
				<button
					type="button"
					aria-pressed={on}
					onclick={() => toggle(item.key)}
					class="k-choice min-h-32 w-full text-xl"
				>
					<span class="text-4xl" aria-hidden="true">{item.icon}</span>
					{item.label}
					{#if item.reason}<span class="text-sm font-semibold text-muted-foreground"
							>{item.reason}</span
						>{/if}
					{#if on}
						<span class="k-choice__check" aria-hidden="true">✓</span>
						<span class="text-base font-extrabold text-[var(--a-deep)]">Packed!</span>
					{:else}
						<span class="text-base font-bold text-muted-foreground">Tap to pack</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
	{#if done}
		<Celebrate />
		<p role="status" class="k-note k-mint">
			<span class="k-note__icon" aria-hidden="true">🎉</span> Your shell is ready!
		</p>
	{/if}
</section>

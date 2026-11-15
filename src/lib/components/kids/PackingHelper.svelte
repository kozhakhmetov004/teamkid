<script lang="ts">
	/**
	 * "What should we carry in our shell to Dad's?" Shown the day before (or the
	 * day of) a switch. Items come from packingList(): the base list plus things
	 * for the plans at that home (e.g. a swimsuit for "Swim class"). Ticks live
	 * only in this browser (localStorage, per switch date); nothing is sent
	 * anywhere. No pressure: nothing happens if skipped.
	 */
	import type { PackItem } from '#lib/kids/packing.js';
	import { KID_FOCUS } from '#lib/kids/ui.js';

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
	class="flex flex-col gap-4 rounded-[2rem] bg-kid-surface p-6 shadow-sm"
>
	<h2 id="pack-title" class="text-3xl font-bold">
		<span aria-hidden="true">🐢</span> What should we carry in our shell to {person}’s?
	</h2>
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
		{#each items as item (item.key)}
			{@const on = packed.includes(item.key)}
			<li>
				<button
					type="button"
					aria-pressed={on}
					onclick={() => toggle(item.key)}
					class="flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-3xl border-4 p-3 text-xl font-semibold transition {on
						? 'border-primary bg-secondary'
						: 'border-transparent bg-kid-background'} {KID_FOCUS}"
				>
					<span class="text-4xl" aria-hidden="true">{item.icon}</span>
					{item.label}
					{#if item.reason}<span class="text-sm font-normal text-muted-foreground"
							>{item.reason}</span
						>{/if}
					<span class="text-base font-normal text-muted-foreground">{on ? '✓ Packed' : 'Tap'}</span>
				</button>
			</li>
		{/each}
	</ul>
	{#if done}
		<p role="status" class="text-2xl font-semibold">
			<span aria-hidden="true">🎉</span> Your shell is ready!
		</p>
	{/if}
</section>

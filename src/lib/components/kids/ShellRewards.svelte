<script lang="ts">
	/**
	 * Shell patterns Pebble has collected. A present unlocks after today's
	 * check-in + at least one wish card. No streaks: nothing is ever lost.
	 */
	import { enhance } from '$app/forms';
	import { SHELL_PATTERNS, type OwnedPattern } from '#lib/kids/pet.js';
	import { KID_FOCUS } from '#lib/kids/ui.js';

	let {
		owned,
		canClaim,
		claimedToday,
		allUnlocked,
		onclaimed
	}: {
		owned: OwnedPattern[];
		canClaim: boolean;
		claimedToday: boolean;
		allUnlocked: boolean;
		onclaimed?: () => void;
	} = $props();

	let pending = $state(false);
	const ownedKeys = $derived(new Set(owned.map((p) => p.key)));
</script>

<section aria-labelledby="shells-title" class="rounded-[2rem] bg-kid-surface p-6 shadow-sm">
	<h2 id="shells-title" class="text-2xl font-bold">My shell patterns</h2>

	<ul class="mt-4 flex flex-wrap gap-3">
		{#each SHELL_PATTERNS as p (p.key)}
			{@const has = ownedKeys.has(p.key)}
			<li
				class="flex min-h-14 items-center gap-2 rounded-2xl px-4 text-xl font-semibold {has
					? 'bg-secondary text-secondary-foreground'
					: 'border-2 border-dashed border-border text-muted-foreground'}"
			>
				<span aria-hidden="true">{has ? p.icon : '🎁'}</span>
				{has ? p.label : 'Surprise'}
				<span class="sr-only">{has ? '(collected)' : '(not yet)'}</span>
			</li>
		{/each}
	</ul>

	{#if canClaim}
		<form
			method="POST"
			action="?/claimShell"
			class="mt-5"
			use:enhance={() => {
				pending = true;
				return async ({ result, update }) => {
					await update({ reset: false });
					pending = false;
					if (result.type === 'success') onclaimed?.();
				};
			}}
		>
			<button
				type="submit"
				disabled={pending}
				class="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-pebble px-6 text-2xl font-bold text-pebble-foreground shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60 motion-reduce:transition-none {KID_FOCUS}"
			>
				<span aria-hidden="true">🎁</span>
				{pending ? 'Opening…' : 'Open your present!'}
			</button>
		</form>
	{:else if allUnlocked}
		<p class="mt-4 text-xl text-muted-foreground">You found every shell pattern! 🌈</p>
	{:else if claimedToday}
		<p class="mt-4 text-xl text-muted-foreground">You opened today's present! 🎉</p>
	{:else}
		<p class="mt-4 text-xl text-muted-foreground">Do both things today to open a new present.</p>
	{/if}
</section>

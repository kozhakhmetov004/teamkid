<script lang="ts">
	/**
	 * Shell patterns Pebble has collected. A present unlocks after today's
	 * check-in + at least one wish card. No streaks: nothing is ever lost.
	 */
	import { enhance } from '$app/forms';
	import { SHELL_PATTERNS, type OwnedPattern } from '#lib/kids/pet.js';

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

<section aria-labelledby="shells-title" class="k-card k-card--accent k-peach relative p-6">
	<div class="flex items-start gap-4">
		<span
			class="grid size-16 shrink-0 place-items-center rounded-[1.4rem] bg-[var(--a-solid)] text-4xl shadow-[inset_0_-5px_0_var(--a-edge)] {canClaim
				? 'gift-wiggle'
				: ''}"
			aria-hidden="true">🎁</span
		>
		<div class="min-w-0">
			<h2 id="shells-title" class="k-title">My shell patterns</h2>
			<p class="mt-1 text-lg font-bold text-muted-foreground">
				{ownedKeys.size} of {SHELL_PATTERNS.length} collected
			</p>
		</div>
	</div>

	<ul class="mt-5 flex flex-wrap gap-2.5">
		{#each SHELL_PATTERNS as p (p.key)}
			{@const has = ownedKeys.has(p.key)}
			<li
				class="flex min-h-12 items-center gap-2 rounded-full px-4 text-lg font-extrabold {has
					? 'bg-[var(--kid-surface)] text-foreground shadow-[0_3px_0_var(--a-edge)]'
					: 'border-2 border-dashed border-[var(--a-edge)]/50 text-muted-foreground'}"
			>
				<span aria-hidden="true">{has ? p.icon : '❔'}</span>
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
			<button type="submit" disabled={pending} class="k-btn k-btn--lg k-btn--block k-sun">
				<span class="k-btn__icon" aria-hidden="true">🎁</span>
				{pending ? 'Opening…' : 'Open your present!'}
			</button>
		</form>
	{:else if allUnlocked}
		<p class="k-note k-mint mt-5">
			<span class="k-note__icon" aria-hidden="true">🌈</span> You found every shell pattern!
		</p>
	{:else if claimedToday}
		<p class="k-note k-mint mt-5">
			<span class="k-note__icon" aria-hidden="true">🎉</span> You opened today's present!
		</p>
	{:else}
		<p class="k-note mt-5 bg-[var(--kid-surface)]">
			<span class="k-note__icon" aria-hidden="true">✨</span> Do both things today to open a new present.
		</p>
	{/if}
</section>

<style>
	.gift-wiggle {
		animation: k-wiggle 1.6s ease-in-out infinite;
	}
	@media (prefers-reduced-motion: reduce) {
		.gift-wiggle {
			animation: none;
		}
	}
</style>

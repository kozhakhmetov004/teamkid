<script lang="ts">
	import { enhance } from '$app/forms';
	import InsightView from '#lib/components/insights/InsightView.svelte';
	import Pebble from '#lib/components/kids/Pebble.svelte';
	import { shellColorByKey } from '#lib/kids/pet.js';
	import KidBack from '#lib/components/kids/ui/KidBack.svelte';
	import KidStage from '#lib/components/kids/ui/KidStage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let pendingId = $state<string | null>(null);
	let said = $state<string | null>(null);

	const color = $derived(shellColorByKey(data.pet.colorKey));
	const speech = $derived(
		said ?? 'This is what Mom and Dad see. You can stop sharing a wish any time.'
	);
</script>

<svelte:head><title>What do Mom and Dad see? · TeamKid</title></svelte:head>

<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)] lg:gap-10">
	<KidStage {speech} label="{data.pet.name} the turtle" petWidth="20rem">
		<Pebble state="idle" name={data.pet.name} {color} pattern={data.pet.pattern} />
	</KidStage>

	<section class="k-sky flex flex-col gap-6">
		<KidBack label="Back to {data.pet.name}" />
		<header class="k-rise flex flex-col items-start gap-3">
			<span class="k-eyebrow"><span aria-hidden="true">👀</span> Sharing</span>
			<h1 class="k-display">What do Mom and Dad see?</h1>
			<p class="k-lead">
				Mom and Dad see the same thing. They never see your exact clicks or words.
			</p>
		</header>

		<article class="k-card k-rise p-6 text-xl" style:animation-delay="60ms">
			<h2 class="k-title mb-4 flex items-center gap-2">
				<span aria-hidden="true">📖</span>
				{data.firstName}'s week
			</h2>
			<InsightView data={data.view} childName={data.firstName} showGentle={false} />
			{#if data.view.insight?.gentle_flag}
				<p class="k-note k-sun mt-4 text-lg">
					<span class="k-note__icon" aria-hidden="true">💡</span> Mom and Dad also get a gentle tip on
					how to help.
				</p>
			{/if}
		</article>

		<article class="k-card k-rise p-6" style:animation-delay="120ms">
			<h2 class="k-title flex items-center gap-2">
				<span aria-hidden="true">💌</span> Wishes I shared
			</h2>
			{#if data.view.sharedWishes.length === 0}
				<p class="k-note mt-4 text-xl">
					<span class="k-note__icon" aria-hidden="true">🤫</span> Nothing shared right now. Your wishes
					are just for you.
				</p>
			{:else}
				<ul class="mt-4 grid gap-3">
					{#each data.view.sharedWishes as wish (wish.id)}
						<li
							class="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-[var(--a-soft)] p-4"
						>
							<span class="grid gap-1">
								<span class="text-2xl font-extrabold">
									<span aria-hidden="true">{wish.emoji ?? '⭐'}</span>
									{wish.interest}
								</span>
								<span class="text-lg font-semibold text-muted-foreground">
									{wish.kind === 'activity'
										? 'This weekend'
										: wish.kind === 'interest'
											? 'Into right now'
											: wish.kind === 'gift'
												? 'Present idea'
												: wish.kind === 'everyday'
													? 'About me'
													: 'Wish'}{wish.custom ? ' · My own idea ✏️ (they see these words)' : ''}
								</span>
							</span>
							<form
								method="POST"
								action="?/unshare"
								use:enhance={() => {
									pendingId = wish.id;
									return async ({ result, update }) => {
										await update();
										pendingId = null;
										said =
											result.type === 'success'
												? 'Okay! That wish is just for you now.'
												: 'Oops, try again?';
									};
								}}
							>
								<input type="hidden" name="wishId" value={wish.id} />
								<button type="submit" disabled={pendingId === wish.id} class="k-btn k-btn--quiet">
									{pendingId === wish.id ? 'Stopping…' : 'Stop sharing'}
									<span class="sr-only">{wish.interest}</span>
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</article>
	</section>
</div>

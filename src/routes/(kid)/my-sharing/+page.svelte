<script lang="ts">
	import { enhance } from '$app/forms';
	import InsightView from '#lib/components/insights/InsightView.svelte';
	import Pebble from '#lib/components/kids/Pebble.svelte';
	import PebbleSay from '#lib/components/kids/PebbleSay.svelte';
	import { shellColorByKey } from '#lib/kids/pet.js';
	import { KID_FOCUS, KID_FONT } from '#lib/kids/ui.js';
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

<div
	class="grid items-start gap-8 lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)] lg:gap-10"
	style="font-family: {KID_FONT}"
>
	<section
		aria-label="{data.pet.name} the turtle"
		class="flex flex-col gap-6 rounded-[2.5rem] bg-gradient-to-b from-kid-surface to-secondary p-6 shadow-sm lg:sticky lg:top-6 lg:p-8"
	>
		<PebbleSay text={speech} />
		<div class="mx-auto w-full max-w-[20rem] px-2">
			<Pebble state="idle" name={data.pet.name} {color} pattern={data.pet.pattern} />
		</div>
	</section>

	<section class="flex flex-col gap-6">
		<a
			href="/pebble"
			class="inline-flex min-h-12 items-center gap-2 self-start rounded-2xl px-3 text-xl font-semibold text-muted-foreground hover:text-foreground {KID_FOCUS}"
		>
			<span aria-hidden="true">←</span> Back to {data.pet.name}
		</a>
		<h1 class="text-4xl font-bold lg:text-5xl">What do Mom and Dad see?</h1>
		<p class="text-2xl">
			Mom and Dad see the same thing. They never see your exact clicks or words.
		</p>

		<article class="rounded-[2rem] bg-kid-surface p-6 text-xl shadow-sm">
			<h2 class="mb-4 text-2xl font-bold">{data.firstName}'s week</h2>
			<InsightView data={data.view} childName={data.firstName} showGentle={false} />
			{#if data.view.insight?.gentle_flag}
				<p class="mt-4 text-lg text-muted-foreground">
					Mom and Dad also get a gentle tip on how to help.
				</p>
			{/if}
		</article>

		<article class="rounded-[2rem] bg-kid-surface p-6 shadow-sm">
			<h2 class="text-2xl font-bold">Wishes I shared</h2>
			{#if data.view.sharedWishes.length === 0}
				<p class="mt-3 text-xl text-muted-foreground">
					Nothing shared right now. Your wishes are just for you.
				</p>
			{:else}
				<ul class="mt-4 grid gap-3">
					{#each data.view.sharedWishes as wish (wish.id)}
						<li
							class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-4"
						>
							<span class="grid gap-1">
								<span class="text-2xl font-semibold">
									<span aria-hidden="true">{wish.emoji ?? '⭐'}</span>
									{wish.interest}
								</span>
								<span class="text-lg text-muted-foreground">
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
								<button
									type="submit"
									disabled={pendingId === wish.id}
									class="min-h-16 rounded-2xl bg-kid-surface px-5 text-xl font-bold shadow-sm disabled:opacity-60 {KID_FOCUS}"
								>
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

<script lang="ts">
	import { tick } from 'svelte';
	import { deserialize } from '$app/forms';
	import ChoiceGrid from '#lib/components/kids/ChoiceGrid.svelte';
	import Pebble, { type PebbleState } from '#lib/components/kids/Pebble.svelte';
	import PebbleSay from '#lib/components/kids/PebbleSay.svelte';
	import ShareAsk from '#lib/components/kids/ShareAsk.svelte';
	import { WISH_LINES } from '#lib/kids/pebbleLines.js';
	import { shellColorByKey } from '#lib/kids/pet.js';
	import { KID_FOCUS, KID_FONT } from '#lib/kids/ui.js';
	import { WISH_DECK, type WishOption } from '#lib/kids/wishDeck.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let index = $state(0);
	let picked = $state<string | null>(null);
	let pending = $state(false);
	let speech = $state<string>(WISH_LINES.start);
	let mood = $state<PebbleState>('idle');
	let error = $state('');
	let askOpen = $state(false);
	let current = $state<{ wishId: string; option: WishOption } | null>(null);
	let heading: HTMLHeadingElement | undefined = $state();

	const card = $derived(WISH_DECK[index] ?? null);
	const color = $derived(shellColorByKey(data.pet.colorKey));
	const choices = $derived(
		card ? card.options.map((o) => ({ value: o.key, label: o.label, icon: o.icon })) : []
	);

	/** POST to a form action and read the ActionResult (same as use:enhance). */
	async function post(action: string, fields: Record<string, string>) {
		const body = new FormData();
		for (const [k, v] of Object.entries(fields)) body.set(k, v);
		const res = await fetch(`?/${action}`, {
			method: 'POST',
			body,
			headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
		});
		return deserialize(await res.text());
	}

	async function next(line: string) {
		picked = null;
		speech = line;
		index += 1;
		await tick();
		heading?.focus();
	}

	async function pick(optionKey: string) {
		if (!card || pending) return;
		const option = card.options.find((o) => o.key === optionKey);
		if (!option) return;
		picked = optionKey;
		pending = true;
		error = '';
		const result = await post('pick', { card: card.key, option: optionKey });
		pending = false;
		if (result.type === 'success' && typeof result.data?.wishId === 'string') {
			mood = 'happy';
			current = { wishId: result.data.wishId, option };
			askOpen = true;
		} else {
			picked = null;
			error = 'Oops, Pebble could not save that. Try again?';
		}
	}

	async function onanswer(share: boolean) {
		if (!current) return;
		if (share) {
			pending = true;
			const result = await post('share', { wishId: current.wishId });
			pending = false;
			if (result.type !== 'success') {
				askOpen = false;
				error = 'Oops, that did not reach Mom and Dad. It stays just for you for now.';
				current = null;
				await next(WISH_LINES.sharedNo);
				return;
			}
		}
		askOpen = false;
		current = null;
		mood = 'happy';
		await next(share ? WISH_LINES.sharedYes : WISH_LINES.sharedNo);
	}

	function skip() {
		mood = 'idle';
		void next(WISH_LINES.skip);
	}

	$effect(() => {
		if (!card) {
			speech = WISH_LINES.end;
			mood = 'proud';
		}
	});
</script>

<svelte:head><title>Wish cards · TeamKid</title></svelte:head>

<div
	class="grid items-start gap-8 lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)] lg:gap-10"
	style="font-family: {KID_FONT}"
>
	<section
		aria-label="{data.pet.name} the turtle"
		class="flex flex-col gap-6 rounded-[2.5rem] bg-gradient-to-b from-kid-surface to-secondary p-6 shadow-sm lg:sticky lg:top-6 lg:p-8"
	>
		<PebbleSay text={speech} />
		<div class="mx-auto w-full max-w-[22rem] px-2">
			<Pebble state={mood} name={data.pet.name} {color} pattern={data.pet.pattern} />
		</div>
	</section>

	<section class="flex flex-col gap-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<a
				href="/pebble"
				class="inline-flex min-h-12 items-center gap-2 rounded-2xl px-3 text-xl font-semibold text-muted-foreground hover:text-foreground {KID_FOCUS}"
			>
				<span aria-hidden="true">←</span> Back to {data.pet.name}
			</a>
			<a
				href="/pebble?done=wishes"
				class="inline-flex min-h-16 items-center gap-2 rounded-2xl bg-kid-surface px-6 text-xl font-bold shadow-sm {KID_FOCUS}"
			>
				<span aria-hidden="true">✅</span> Done for today
			</a>
		</div>

		{#if card}
			<!-- progress dots, with a text label too -->
			<div class="flex items-center gap-3">
				<ol class="flex gap-2" aria-hidden="true">
					{#each WISH_DECK as c, i (c.key)}
						<li
							class="size-3.5 rounded-full {i < index
								? 'bg-primary'
								: i === index
									? 'bg-primary/60 ring-2 ring-primary'
									: 'bg-border'}"
						></li>
					{/each}
				</ol>
				<span class="text-lg text-muted-foreground">Card {index + 1} of {WISH_DECK.length}</span>
			</div>

			<article class="flex flex-col gap-6 rounded-[2.5rem] bg-kid-surface p-6 shadow-md lg:p-8">
				<h1 bind:this={heading} tabindex="-1" class="text-4xl font-bold outline-none lg:text-5xl">
					{card.prompt}
				</h1>
				<ChoiceGrid
					{choices}
					label={card.prompt}
					{picked}
					disabled={pending || askOpen}
					onpick={pick}
				/>
				<button
					type="button"
					onclick={skip}
					disabled={pending || askOpen}
					class="inline-flex min-h-16 items-center gap-2 self-center rounded-2xl bg-secondary px-6 text-xl font-semibold text-secondary-foreground disabled:opacity-60 {KID_FOCUS}"
				>
					<span aria-hidden="true">🔀</span> Something else
				</button>
			</article>
		{:else}
			<article
				class="flex flex-col gap-6 rounded-[2.5rem] bg-kid-surface p-8 text-center shadow-md"
			>
				<h1 bind:this={heading} tabindex="-1" class="text-4xl font-bold outline-none">
					That was every card! 🎉
				</h1>
				<div class="grid gap-4 sm:grid-cols-2">
					<a
						href="/pebble?done=wishes"
						class="flex min-h-20 items-center justify-center gap-3 rounded-[2rem] bg-primary px-6 text-2xl font-bold text-primary-foreground shadow-sm {KID_FOCUS}"
					>
						<span aria-hidden="true">🐢</span> Back to {data.pet.name}
					</a>
					<a
						href="/my-sharing"
						class="flex min-h-20 items-center justify-center gap-3 rounded-[2rem] bg-kid-surface px-6 text-2xl font-bold shadow-sm ring-2 ring-border {KID_FOCUS}"
					>
						<span aria-hidden="true">👀</span> What do Mom and Dad see?
					</a>
				</div>
			</article>
		{/if}

		{#if error}
			<p
				role="alert"
				class="rounded-2xl bg-pebble/40 p-4 text-center text-xl text-pebble-foreground"
			>
				{error}
			</p>
		{/if}
	</section>
</div>

{#if current}
	<ShareAsk
		bind:open={askOpen}
		ask={current.option.ask}
		icon={current.option.icon}
		petName={data.pet.name}
		{color}
		pattern={data.pet.pattern}
		{pending}
		{onanswer}
	/>
{/if}

<script lang="ts">
	/**
	 * Today's wish cards: one card at a time, multi-select picture chips,
	 * "Other ✏️" for a typed idea (checked on the server), then Pebble asks if
	 * Mom and Dad can see it (private by default). Answers can change until the day ends.
	 */
	import { onMount, tick } from 'svelte';
	import { deserialize } from '$app/forms';
	import { cardShareAsk, DECK_LINES, WISH_LINES } from '#lib/kids/pebbleLines.js';
	import type { ShellColor, ShellPatternKey } from '#lib/kids/pet.js';
	import Celebrate from './ui/Celebrate.svelte';
	import StepDots from './ui/StepDots.svelte';
	import { IDEA_MAX, type DeckCard } from '#lib/kids/weeklyDeck.js';
	import type { PebbleState } from './Pebble.svelte';
	import ShareAsk from './ShareAsk.svelte';

	interface Answer {
		/** wish_questions.id */
		card: string;
		key: string;
		label: string;
		emoji: string;
		custom: boolean;
		shared: boolean;
	}

	let {
		deck,
		answers,
		weekendLine,
		petName,
		color,
		pattern,
		onsay
	}: {
		deck: { cards: DeckCard[] };
		answers: Answer[];
		weekendLine: string | null;
		petName: string;
		color: ShellColor;
		pattern: ShellPatternKey | null;
		onsay: (text: string, mood?: PebbleState) => void;
	} = $props();

	const uid = $props.id();

	// Saved answers per card (kept in sync after each save / share).
	let saved = $state<Answer[]>([]);
	let index = $state(0);
	let picked = $state<string[]>([]);
	let keepOwn = $state<string[]>([]);
	let otherOpen = $state(false);
	let other = $state('');
	let pending = $state(false);
	let error = $state('');
	let needsGrownUp = $state(false);
	let askOpen = $state(false);
	let heading: HTMLHeadingElement | undefined = $state();

	const card = $derived(deck.cards[index] ?? null);
	const mine = $derived(card ? saved.filter((a) => a.card === card.id) : []);
	const ownIdeas = $derived(mine.filter((a) => a.custom));
	const count = $derived(picked.length + keepOwn.length + (other.trim() ? 1 : 0));
	const answeredKinds = $derived(new Set(saved.map((a) => a.card)));

	function loadCard() {
		const current = deck.cards[index];
		const rows = current ? saved.filter((a) => a.card === current.id) : [];
		picked = rows.filter((a) => !a.custom).map((a) => a.key);
		keepOwn = rows.filter((a) => a.custom).map((a) => a.key);
		other = '';
		otherOpen = false;
		error = '';
		needsGrownUp = false;
	}

	onMount(() => {
		saved = answers.map((a) => ({ ...a }));
		loadCard();
		onsay(DECK_LINES.start, 'happy');
	});

	function toggle(list: string[], key: string): string[] {
		return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
	}

	function togglePick(key: string) {
		if (!card) return;
		if (!picked.includes(key) && count >= card.max) {
			error = `You can pick up to ${card.max}. Tap one again to take it away.`;
			return;
		}
		error = '';
		picked = toggle(picked, key);
	}

	async function post(action: string, body: FormData) {
		const res = await fetch(`?/${action}`, {
			method: 'POST',
			body,
			headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
		});
		return deserialize(await res.text());
	}

	async function save() {
		if (!card || pending) return;
		if (count === 0) {
			error = 'Pick one, or type your own idea!';
			return;
		}
		const body = new FormData();
		body.set('card', card.id ?? '');
		for (const k of picked) body.append('options', k);
		for (const k of keepOwn) body.append('keepOwn', k);
		body.set('other', other.trim());
		pending = true;
		error = '';
		needsGrownUp = false;
		const result = await post('answer', body);
		pending = false;

		if (result.type === 'success' && result.data) {
			const d = result.data as {
				status: 'saved' | 'retry' | 'big_feeling';
				reply?: string;
				saved?: { key: string; label: string; emoji: string; custom: boolean }[];
			};
			if (d.status === 'big_feeling') {
				other = '';
				otherOpen = false;
				needsGrownUp = true;
				onsay(d.reply ?? '', 'idle');
				return;
			}
			if (d.status === 'retry') {
				onsay(d.reply ?? '', 'idle');
				return;
			}
			const id = card.id ?? '';
			saved = [
				...saved.filter((a) => a.card !== id),
				...(d.saved ?? []).map((s) => ({ ...s, card: id, shared: false }))
			];
			loadCard();
			onsay(DECK_LINES.saved, 'happy');
			askOpen = true;
			return;
		}
		error =
			result.type === 'failure' && typeof result.data?.message === 'string'
				? result.data.message
				: 'Oops, Pebble could not save that. Try again?';
	}

	async function goTo(i: number, line: string) {
		index = i;
		loadCard();
		onsay(line, i >= deck.cards.length ? 'proud' : 'idle');
		await tick();
		heading?.focus();
	}

	async function onanswer(share: boolean) {
		if (!card) return;
		const id = card.id ?? '';
		if (share) {
			pending = true;
			const body = new FormData();
			body.set('card', id);
			const result = await post('share', body);
			pending = false;
			if (result.type === 'success') {
				saved = saved.map((a) => (a.card === id ? { ...a, shared: true } : a));
			} else {
				error = 'Oops, that did not reach Mom and Dad. It stays just for you for now.';
			}
		}
		askOpen = false;
		const line = share ? WISH_LINES.sharedYes : WISH_LINES.sharedNo;
		await goTo(index + 1, index + 1 >= deck.cards.length ? `${line} ${DECK_LINES.end}` : line);
	}

	const shareQuestion = $derived(
		card
			? cardShareAsk(
					card.kind,
					mine.map((a) => a.label)
				)
			: ''
	);
	const hint = $derived(
		card?.kind === 'interest' ? 'Pick as many as you like' : `Pick 1 to ${card?.max ?? 3}`
	);
</script>

<!-- progress dots, with a text label too -->
<div class="k-sun">
	<StepDots
		total={deck.cards.length}
		current={index}
		done={deck.cards.flatMap((c, i) => (answeredKinds.has(c.id ?? '') ? [i] : []))}
		label={card ? `Card ${index + 1} of ${deck.cards.length}` : 'All done!'}
	/>
</div>

{#if card}
	{#key index}
		<article class="k-card k-card--accent k-sun k-rise relative flex flex-col gap-5 p-6 lg:p-8">
			<!-- playing-card corner marks -->
			<span class="card-corner top-4 right-5" aria-hidden="true">★</span>
			<span class="card-corner bottom-4 left-5 rotate-180" aria-hidden="true">★</span>

			<div class="space-y-3 pt-2">
				<span class="k-eyebrow"><span aria-hidden="true">🃏</span> {hint}</span>
				<h1 bind:this={heading} tabindex="-1" class="k-display outline-none">
					{card.prompt}
				</h1>
				{#if card.kind === 'activity' && weekendLine}
					<p class="k-lead">{weekendLine}</p>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label={card.prompt}>
				{#each card.options as o (o.key)}
					{@const on = picked.includes(o.key)}
					<button
						type="button"
						aria-pressed={on}
						disabled={pending}
						onclick={() => togglePick(o.key)}
						class="k-choice min-h-32 text-xl"
					>
						<span class="text-[2.6rem] leading-none" aria-hidden="true">{o.emoji}</span>
						{o.label}
						{#if on}<span class="k-choice__check" aria-hidden="true">✓</span><span class="sr-only"
								>(picked)</span
							>{/if}
					</button>
				{/each}
				{#each ownIdeas as o (o.key)}
					{@const on = keepOwn.includes(o.key)}
					<button
						type="button"
						aria-pressed={on}
						disabled={pending}
						onclick={() => (keepOwn = toggle(keepOwn, o.key))}
						class="k-choice min-h-32 text-xl"
					>
						<span class="text-[2.6rem] leading-none" aria-hidden="true">{o.emoji}</span>
						{o.label}
						<span class="text-base font-bold text-muted-foreground">My idea ✏️</span>
						{#if on}<span class="k-choice__check" aria-hidden="true">✓</span>{/if}
					</button>
				{/each}
				<button
					type="button"
					aria-expanded={otherOpen}
					aria-controls="{uid}-other"
					disabled={pending}
					onclick={() => (otherOpen = !otherOpen)}
					class="k-choice k-choice--dashed min-h-32 text-xl"
				>
					<span class="text-[2.6rem] leading-none" aria-hidden="true">✏️</span> Other
				</button>
			</div>

			{#if otherOpen}
				<div id="{uid}-other" class="k-rise grid gap-2">
					<label for="{uid}-text" class="text-xl font-extrabold">Type your own idea</label>
					<input
						id="{uid}-text"
						type="text"
						bind:value={other}
						maxlength={IDEA_MAX}
						autocomplete="off"
						class="min-h-16 rounded-[1.25rem] border-[3px] border-[var(--k-line)] bg-[var(--kid-surface)] px-5 text-xl font-bold shadow-[inset_0_3px_0_oklch(0.93_0.015_200)] focus:border-[var(--a-edge)]"
					/>
					<p class="text-base font-semibold text-muted-foreground">
						{other.length}/{IDEA_MAX} · Please don’t type names, addresses or phone numbers.
					</p>
				</div>
			{/if}

			<button
				type="button"
				onclick={save}
				disabled={pending}
				class="k-btn k-btn--lg k-btn--block k-mint"
			>
				<span class="k-btn__icon" aria-hidden="true">💾</span>
				{pending ? 'Saving…' : mine.length ? 'Save my changes' : 'Save my picks'}
			</button>

			<div class="flex flex-wrap justify-between gap-3">
				<button
					type="button"
					disabled={pending || index === 0}
					onclick={() => goTo(index - 1, DECK_LINES.next)}
					class="k-btn k-btn--quiet"
				>
					<span aria-hidden="true">←</span> Back
				</button>
				<button
					type="button"
					disabled={pending}
					onclick={() =>
						goTo(index + 1, index + 1 >= deck.cards.length ? DECK_LINES.end : DECK_LINES.next)}
					class="k-btn k-sky"
				>
					{mine.length ? 'Next card' : 'Skip this card'} <span aria-hidden="true">→</span>
				</button>
			</div>

			{#if mine.length}
				<p class="text-lg font-bold text-muted-foreground">
					{#if mine.some((a) => a.shared)}💌 Mom and Dad can see this card.{:else}🤫 Just for you
						right now.{/if}
				</p>
			{/if}
		</article>
	{/key}
{:else}
	<article
		class="k-card k-card--accent k-sun k-rise relative flex flex-col items-center gap-6 p-8 text-center"
	>
		<Celebrate />
		<span
			class="grid size-24 place-items-center rounded-[2rem] bg-[var(--a-solid)] text-6xl shadow-[inset_0_-6px_0_var(--a-edge)]"
			aria-hidden="true">🎉</span
		>
		<h1 bind:this={heading} tabindex="-1" class="k-display outline-none">That was every card!</h1>
		<p class="k-lead">You can change your answers until the day ends. New cards tomorrow!</p>
		<div class="grid w-full gap-4 sm:grid-cols-2">
			<button
				type="button"
				onclick={() => goTo(0, DECK_LINES.start)}
				class="k-btn k-btn--lg k-btn--quiet"
			>
				<span class="k-btn__icon" aria-hidden="true">🔁</span> Change my answers
			</button>
			<a href="/my-sharing" class="k-btn k-btn--lg k-sky">
				<span class="k-btn__icon" aria-hidden="true">👀</span> What do Mom and Dad see?
			</a>
		</div>
	</article>
{/if}

{#if needsGrownUp}
	<a href="/help" class="k-btn k-btn--lg k-rose self-start">
		<span class="k-btn__icon" aria-hidden="true">🆘</span> I need a grown-up
	</a>
{/if}

{#if error}
	<p role="alert" class="k-note k-peach justify-center text-center">
		{error}
	</p>
{/if}

<ShareAsk
	bind:open={askOpen}
	question={shareQuestion}
	icon={mine[0]?.emoji ?? '⭐'}
	{petName}
	{color}
	{pattern}
	{pending}
	{onanswer}
/>

<style>
	.card-corner {
		position: absolute;
		color: var(--a-edge);
		font-size: 1.25rem;
		font-weight: 900;
		opacity: 0.7;
	}
</style>
